'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/AppProvider'

export default function NewChildPage() {
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { refreshChildren } = useApp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }

    const { error } = await supabase
      .from('children')
      .insert({
        user_id: user.id,
        name,
        birthday,
      })

    setLoading(false)

    if (error) {
      alert('登録に失敗しました')
      return
    }

    await refreshChildren()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--background)' }}>
      {/* 閉じるボタン */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 right-4 safe-top w-10 h-10 flex items-center justify-center rounded-full shadow-sm"
        style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-card)' }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="5" x2="15" y2="15" />
          <line x1="15" y1="5" x2="5" y2="15" />
        </svg>
      </button>

      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👶</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>お子さまを登録</h1>
          <p className="mt-2" style={{ color: 'var(--color-text-faint)' }}>記録を始めましょう</p>
        </div>

        {/* フォーム */}
        <div className="rounded-2xl  p-8" style={{ backgroundColor: 'var(--color-card)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                お名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent text-lg"
                style={{ backgroundColor: 'var(--color-input-bg)' }}
                placeholder="ゆうき"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">
                生年月日
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
                className="w-full px-4 py-3 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent text-lg"
                style={{ backgroundColor: 'var(--color-input-bg)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-white rounded-xl font-semibold transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
