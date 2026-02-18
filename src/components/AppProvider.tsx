'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Child } from '@/lib/types'
import { getSelectedChildId, setSelectedChildId as saveSelectedChildId } from '@/lib/selected-child'
import type { User } from '@supabase/supabase-js'

const CHILDREN_CACHE_KEY = 'kosodate-nikki-children-cache'

type AppContextType = {
  user: User | null
  children: Child[]
  selectedChildId: string
  setSelectedChildId: (id: string) => void
  refreshChildren: () => Promise<void>
  isReady: boolean
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// localStorageからキャッシュを同期的に読み込む
function getCachedChildren(): Child[] {
  try {
    const cached = localStorage.getItem(CHILDREN_CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {}
  return []
}

function setCachedChildren(children: Child[]) {
  try {
    localStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children))
  } catch {}
}

// SupabaseのセッションがlocalStorageにあるか同期的にチェック
function hasStoredSession(): boolean {
  try {
    const stored = localStorage.getItem('kosodate-nikki-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return !!(parsed?.access_token || parsed?.user)
    }
  } catch {}
  return false
}

export default function AppProvider({ children: childrenNode }: { children: React.ReactNode }) {
  const cachedChildren = useRef(getCachedChildren()).current
  const hasSession = useRef(hasStoredSession()).current

  // キャッシュがあれば即座にisReady=trueで開始
  const [user, setUser] = useState<User | null>(null)
  const [childrenList, setChildrenList] = useState<Child[]>(cachedChildren)
  const [selectedChildId, setSelectedChildIdState] = useState<string>(() => {
    const saved = getSelectedChildId()
    if (saved && cachedChildren.some(c => c.id === saved)) return saved
    return cachedChildren[0]?.id || ''
  })
  const [isReady, setIsReady] = useState(hasSession && cachedChildren.length > 0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const setSelectedChildId = useCallback((id: string) => {
    setSelectedChildIdState(id)
    saveSelectedChildId(id)
  }, [])

  const refreshChildren = useCallback(async () => {
    const { data } = await supabase
      .from('children')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) {
      setChildrenList(data)
      setCachedChildren(data)
      const currentId = getSelectedChildId()
      if (currentId && data.some(c => c.id === currentId)) {
        setSelectedChildIdState(currentId)
      } else if (data.length > 0) {
        setSelectedChildId(data[0].id)
      }
    }
  }, [supabase, setSelectedChildId])

  useEffect(() => {
    const init = async () => {
      if (pathname === '/auth' || pathname === '/auth/') {
        setIsReady(true)
        return
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        // セッション切れ：キャッシュをクリアしてリダイレクト
        setCachedChildren([])
        setChildrenList([])
        setIsReady(false)
        router.push('/auth')
        return
      }

      setUser(authUser)

      const { data } = await supabase
        .from('children')
        .select('*')
        .order('created_at', { ascending: true })

      if (!data || data.length === 0) {
        setCachedChildren([])
        setChildrenList([])
        setIsReady(true)
        if (pathname !== '/children/new' && pathname !== '/children/new/') {
          router.push('/children/new')
        }
        return
      }

      setChildrenList(data)
      setCachedChildren(data)

      const saved = getSelectedChildId()
      if (saved && data.some(c => c.id === saved)) {
        setSelectedChildIdState(saved)
      } else {
        setSelectedChildId(data[0].id)
      }

      setIsReady(true)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setChildrenList([])
          setCachedChildren([])
          setSelectedChildIdState('')
          setIsReady(false)
          router.push('/auth')
        }
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          refreshChildren().then(() => setIsReady(true))
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase, router, refreshChildren])

  const isPublicPage = pathname === '/auth' || pathname === '/auth/'
    || pathname === '/children/new' || pathname === '/children/new/'

  if (!isReady && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>読み込み中...</div>
      </div>
    )
  }

  return (
    <AppContext.Provider
      value={{
        user,
        children: childrenList,
        selectedChildId,
        setSelectedChildId,
        refreshChildren,
        isReady,
      }}
    >
      {childrenNode}
    </AppContext.Provider>
  )
}
