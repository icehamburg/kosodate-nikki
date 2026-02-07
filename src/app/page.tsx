'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeClient from '@/components/HomeClient'
import { Child } from '@/lib/types'

export default function Home() {
  const [children, setChildren] = useState<Child[] | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      setUserId(user.id)

      // 子どもデータを取得
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .order('created_at', { ascending: true })

      // 子どもがいない場合は登録画面へ
      if (!childrenData || childrenData.length === 0) {
        router.push('/children/new')
        return
      }

      setChildren(childrenData)
      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  if (loading || !children || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    )
  }

  return <HomeClient initialChildren={children} userId={userId} />
}
