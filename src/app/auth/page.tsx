'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('確認メールを送信しました。メールを確認してください。')
        return
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📔</div>
          <h1 className="text-2xl font-bold text-gray-800">子育て日記</h1>
          <p className="text-gray-500 mt-2">毎日の成長を記録しよう</p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2 text-center rounded-lg transition"
              style={isLogin ? { backgroundColor: '#D97757', color: 'white' } : { color: '#6b7280' }}
            >
              ログイン
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2 text-center rounded-lg transition"
              style={!isLogin ? { backgroundColor: '#D97757', color: 'white' } : { color: '#6b7280' }}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                placeholder="mail@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                placeholder="6文字以上"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white rounded-xl font-medium transition disabled:opacity-50"
              style={{ backgroundColor: '#D97757' }}
            >
              {loading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
