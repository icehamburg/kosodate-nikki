'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewChildPage() {
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👶</div>
          <h1 className="text-2xl font-bold text-gray-800">お子さまを登録</h1>
          <p className="text-gray-500 mt-2">記録を始めましょう</p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent text-lg"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-white rounded-xl font-semibold transition disabled:opacity-50"
              style={{ backgroundColor: '#D97757' }}
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
