'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Child } from '@/lib/types'
import Link from 'next/link'
import { compressImage } from '@/lib/image-compressor'

export default function SettingsPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [email, setEmail] = useState('')
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setEmail(user.email || '')

      const { data } = await supabase
        .from('children')
        .select('*')
        .order('created_at', { ascending: true })

      if (data) setChildren(data)
    }
    fetchData()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const handleEditName = (child: Child) => {
    setEditingChildId(child.id)
    setEditName(child.name)
    setShowMenu(null)
  }

  const handleSaveName = async (childId: string) => {
    if (!editName.trim()) return

    const { error } = await supabase
      .from('children')
      .update({ name: editName.trim() })
      .eq('id', childId)

    if (!error) {
      setChildren(prev => prev.map(c =>
        c.id === childId ? { ...c, name: editName.trim() } : c
      ))
    }
    setEditingChildId(null)
    setEditName('')
  }

  const handlePhotoClick = (childId: string) => {
    setUploadingPhotoId(childId)
    setShowMenu(null)
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingPhotoId) return

    try {
      // 圧縮
      const compressed = await compressImage(file)
      const fileName = `${uploadingPhotoId}_${Date.now()}.jpg`

      // アップロード
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(`children/${fileName}`, compressed, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(`children/${fileName}`)

      // DBを更新
      const { error: updateError } = await supabase
        .from('children')
        .update({ photo_url: publicUrl })
        .eq('id', uploadingPhotoId)

      if (!updateError) {
        setChildren(prev => prev.map(c =>
          c.id === uploadingPhotoId ? { ...c, photo_url: publicUrl } : c
        ))
      }
    } catch (err) {
      console.error('Photo upload error:', err)
      alert('写真のアップロードに失敗しました')
    }

    setUploadingPhotoId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 非表示のファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* ヘッダー */}
      <header className="bg-white border-b safe-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-2xl">
            ←
          </Link>
          <span className="text-lg font-semibold">設定</span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 子ども管理 */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">
            子どもの管理
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            {children.map((child, i) => (
              <div
                key={child.id}
                className={`p-4 flex items-center gap-3 ${
                  i < children.length - 1 ? 'border-b' : ''
                }`}
              >
                {/* 写真アイコン（タップで写真変更） */}
                <button
                  onClick={() => handlePhotoClick(child.id)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: '#FDF4F1' }}
                >
                  {child.photo_url ? (
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    '👶'
                  )}
                </button>

                <div className="flex-1">
                  {editingChildId === child.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveName(child.id)}
                        className="text-sm px-3 py-1 rounded text-white"
                        style={{ backgroundColor: '#D97757' }}
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingChildId(null)}
                        className="text-sm px-2 py-1 text-gray-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold">{child.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(child.birthday).toLocaleDateString('ja-JP')}生まれ
                      </div>
                    </>
                  )}
                </div>

                {/* サブメニュー */}
                {editingChildId !== child.id && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === child.id ? null : child.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      ⋮
                    </button>

                    {showMenu === child.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-20 py-1 min-w-[140px]">
                          <button
                            onClick={() => handleEditName(child)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            ✏️ 名前を変更
                          </button>
                          <button
                            onClick={() => handlePhotoClick(child.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            📷 写真を変更
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/children/new"
              className="p-4 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition"
              style={{ color: '#D97757' }}
            >
              ＋ 子どもを追加
            </Link>
          </div>
        </div>

        {/* アカウント */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">
            アカウント
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b">
              <div className="text-xs text-gray-500">メールアドレス</div>
              <div className="mt-1">{email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full p-4 text-left text-red-500 hover:bg-red-50 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
