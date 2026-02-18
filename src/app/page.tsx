'use client'

import HomeClient from '@/components/HomeClient'
import { useApp } from '@/components/AppProvider'

export default function Home() {
  const { children, user } = useApp()

  if (!user || children.length === 0) return null

  return <HomeClient initialChildren={children} userId={user.id} />
}
