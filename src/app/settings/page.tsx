'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Child } from '@/lib/types'
import Link from 'next/link'
import { compressImage } from '@/lib/image-compressor'
import { ThemeMode, getThemePreference, setThemePreference } from '@/lib/theme'
import { useApp } from '@/components/AppProvider'

export default function SettingsPage() {
  const { user, children: contextChildren, refreshChildren } = useApp()
  const [children, setChildren] = useState<Child[]>(contextChildren)
  const [email] = useState(user?.email || '')
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setThemeMode(getThemePreference())
  }, [])

  // contextChildrenが更新されたらローカルも同期
  useEffect(() => {
    setChildren(contextChildren)
  }, [contextChildren])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    setThemePreference(mode)
  }

  const [deletingChildId, setDeletingChildId] = useState<string | null>(null)

  const handleEditName = (child: Child) => {
    setEditingChildId(child.id)
    setEditName(child.name)
    setShowMenu(null)
  }

  const handleDeleteChild = async (childId: string) => {
    const child = children.find(c => c.id === childId)
    if (!child) return

    setDeletingChildId(childId)
    setShowMenu(null)
  }

  const confirmDeleteChild = async () => {
    if (!deletingChildId) return

    try {
      // 関連する記録を削除
      await supabase.from('records').delete().eq('child_id', deletingChildId)
      // 関連する日記を削除
      await supabase.from('diaries').delete().eq('child_id', deletingChildId)
      // 子どもを削除
      const { error } = await supabase.from('children').delete().eq('id', deletingChildId)

      if (error) throw error

      setChildren(prev => prev.filter(c => c.id !== deletingChildId))
      refreshChildren()
    } catch (err) {
      console.error('Delete error:', err)
      alert('削除に失敗しました')
    }
    setDeletingChildId(null)
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
      refreshChildren()
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
        refreshChildren()
      }
    } catch (err) {
      console.error('Photo upload error:', err)
      alert('写真のアップロードに失敗しました')
    }

    setUploadingPhotoId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--background)' }}>
      {/* 非表示のファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* ヘッダー */}
      <header className="safe-top" style={{ background: 'var(--background)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-2xl">
            ←
          </Link>
          <span className="text-lg font-bold">設定</span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 子ども管理 */}
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            子どもの管理
          </div>
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
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
                  style={{ backgroundColor: 'var(--color-primary-light)' }}
                >
                  {child.photo_url ? (
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
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
                        style={{ backgroundColor: 'var(--color-primary)' }}
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
                        <div className="absolute right-0 bottom-full mb-1 rounded-lg shadow-lg border z-20 py-1 min-w-[140px]" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
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
                          <button
                            onClick={() => handleDeleteChild(child.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-500"
                          >
                            🗑️ 削除
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
              className="p-4 flex items-center justify-center gap-2 transition"
              style={{ backgroundColor: 'var(--color-tag-bg)', color: 'var(--color-primary)' }}
            >
              ＋ 子どもを追加
            </Link>
          </div>
        </div>

        {/* テーマ設定 */}
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            画面の明るさ
          </div>
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
            {([
              { mode: 'auto' as ThemeMode, label: '自動（端末の設定に合わせる）', icon: '🌗' },
              { mode: 'light' as ThemeMode, label: 'ライトモード', icon: '☀️' },
              { mode: 'dark' as ThemeMode, label: 'ダークモード', icon: '🌙' },
            ]).map((option, i) => (
              <button
                key={option.mode}
                onClick={() => handleThemeChange(option.mode)}
                className={`w-full p-4 flex items-center gap-3 text-left transition ${i < 2 ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>{option.label}</span>
                {themeMode === option.mode && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="var(--color-primary)" />
                    <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {themeMode !== option.mode && (
                  <div
                    className="w-5 h-5 rounded-full border-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* アカウント */}
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            アカウント
          </div>
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
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

      {/* 削除確認ダイアログ */}
      {deletingChildId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl mx-8 p-6 max-w-sm w-full" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="text-center mb-4">
              <div className="text-lg font-bold mb-2">本当に削除しますか？</div>
              <p className="text-sm text-gray-500">
                「{children.find(c => c.id === deletingChildId)?.name}」の記録と日記がすべて削除されます。この操作は取り消せません。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingChildId(null)}
                className="flex-1 py-3 rounded-xl shadow-sm text-sm font-semibold" style={{ backgroundColor: 'var(--color-card)' }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmDeleteChild}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
