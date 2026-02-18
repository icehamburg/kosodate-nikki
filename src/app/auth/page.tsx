'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthMode = 'login' | 'signup' | 'reset'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleResendEmail = async () => {
    if (!signupEmail) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
      })
      if (error) throw error
      alert('確認メールを再送しました。')
    } catch (err) {
      alert(err instanceof Error ? err.message : '再送に失敗しました')
    } finally {
      setResending(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        // 既に登録済みのメールアドレスの場合、identitiesが空配列になる
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('このメールアドレスは既に登録されています。ログインしてください。')
          setMode('login')
          return
        }
        setSignupEmail(email)
        setSignupSuccess(true)
        setMode('login')
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📔</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>子育て日記</h1>
          <p className="text-gray-500 mt-2" style={{ color: 'var(--color-text-secondary)' }}>毎日の成長を記録しよう</p>
        </div>

        {/* フォーム */}
        <div className="rounded-2xl  p-8" style={{ backgroundColor: 'var(--color-card)' }}>
          {mode === 'reset' ? (
            <>
              {/* パスワードリセット画面 */}
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>パスワードをリセット</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  登録メールアドレスにリセット用リンクを送信します
                </p>
              </div>

              {resetSent ? (
                <div className="space-y-4">
                  <div className="text-sm p-4 rounded-xl" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text-primary)' }}>
                    <p>リセット用メールを送信しました。メール内のリンクからパスワードを再設定してください。</p>
                    <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>※ メールが届かない場合は迷惑メールフォルダをご確認ください。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
                    className="w-full py-3 text-white rounded-xl font-medium transition"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    ログインに戻る
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                      style={{ backgroundColor: 'var(--color-input-bg)' }}
                      placeholder="mail@example.com"
                    />
                  </div>

                  {error && (
                    <div className="text-sm p-3 rounded-xl" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-white rounded-xl font-medium transition disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {loading ? '送信中...' : 'リセットメールを送信'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null) }}
                    className="w-full py-2 text-sm text-center"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    ログインに戻る
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              {/* ログイン / 新規登録 */}
              <div className="flex mb-6">
                <button
                  onClick={() => { setMode('login'); setError(null) }}
                  className="flex-1 py-2 text-center rounded-lg transition"
                  style={mode === 'login' ? { backgroundColor: 'var(--color-primary)', color: 'white' } : { color: 'var(--color-text-secondary)' }}
                >
                  ログイン
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  className="flex-1 py-2 text-center rounded-lg transition"
                  style={mode === 'signup' ? { backgroundColor: 'var(--color-primary)', color: 'white' } : { color: 'var(--color-text-secondary)' }}
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
                    className="w-full px-4 py-3 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                    style={{ backgroundColor: 'var(--color-input-bg)' }}
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
                    className="w-full px-4 py-3 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                    style={{ backgroundColor: 'var(--color-input-bg)' }}
                    placeholder="6文字以上"
                  />
                </div>

                {signupSuccess && (
                  <div className="text-sm p-4 rounded-xl" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text-primary)' }}>
                    <p>確認メールを送信しました。メール内のリンクを確認後、こちらの画面でログインしてください。</p>
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resending}
                      className="mt-2 underline text-xs disabled:opacity-50"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {resending ? '送信中...' : 'メールが届かない場合はこちらから再送'}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="text-sm p-3 rounded-xl" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white rounded-xl font-medium transition disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null) }}
                    className="w-full py-2 text-sm text-center"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    パスワードを忘れた方
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
