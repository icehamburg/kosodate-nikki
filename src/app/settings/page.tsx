'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Child } from '@/lib/types'
import Link from 'next/link'

export default function SettingsPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [email, setEmail] = useState('')
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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* ヘッダー */}
      <header className="bg-white border-b">
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
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: '#FDF4F1' }}
                >
                  👶
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{child.name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(child.birthday).toLocaleDateString('ja-JP')}生まれ
                  </div>
                </div>
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
