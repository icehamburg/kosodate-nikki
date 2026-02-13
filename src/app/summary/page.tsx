'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Child, Record } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SummaryPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [records, setRecords] = useState<Record[]>([])
  const supabase = createClient()
  const router = useRouter()

  const selectedChild = children.find(c => c.id === selectedChildId)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      const { data } = await supabase
        .from('children')
        .select('*')
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setChildren(data)
        setSelectedChildId(data[0].id)
      }
    }
    fetchData()
  }, [supabase, router])

  // 記録を取得
  useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedChildId) return

      const now = new Date()
      const start = new Date()
      if (period === 'week') {
        start.setDate(now.getDate() - 7)
      } else {
        start.setMonth(now.getMonth() - 1)
      }

      const { data } = await supabase
        .from('records')
        .select('*')
        .eq('child_id', selectedChildId)
        .gte('recorded_at', start.toISOString())
        .lte('recorded_at', now.toISOString())

      if (data) setRecords(data)
    }
    fetchRecords()
  }, [selectedChildId, period, supabase])

  // 統計を計算
  const getStats = () => {
    const milkRecords = records.filter(r => r.type === 'milk')
    const poopRecords = records.filter(r => r.type === 'poop')
    const peeRecords = records.filter(r => r.type === 'pee')
    const sleepRecords = records.filter(r => r.type === 'sleep')
    const bathRecords = records.filter(r => r.type === 'bath')

    const days = period === 'week' ? 7 : 30

    const milkTotal = milkRecords.reduce((sum, r) => sum + (r.value?.amount || 0), 0)
    const milkAvgPerDay = Math.round(milkTotal / days)
    const milkCountPerDay = (milkRecords.length / days).toFixed(1)

    return {
      milk: {
        total: milkTotal,
        avgPerDay: milkAvgPerDay,
        countPerDay: milkCountPerDay,
        count: milkRecords.length,
      },
      poop: {
        count: poopRecords.length,
        avgPerDay: (poopRecords.length / days).toFixed(1),
      },
      pee: {
        count: peeRecords.length,
        avgPerDay: (peeRecords.length / days).toFixed(1),
      },
      sleep: {
        count: sleepRecords.length,
      },
      bath: {
        count: bathRecords.length,
      },
    }
  }

  const stats = getStats()

  // 生後日数
  const getDaysOld = () => {
    if (!selectedChild) return 0
    const birthday = new Date(selectedChild.birthday)
    const now = new Date()
    return Math.floor((now.getTime() - birthday.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: '#FDF4F1' }}
            >
              {selectedChild?.photo_url ? (
                <img src={selectedChild.photo_url} alt={selectedChild.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">👶</span>
              )}
            </div>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Link href="/settings" className="text-2xl">⚙️</Link>
        </div>
      </header>

      {/* 子ども情報 */}
      <div className="bg-white p-4 border-b">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ backgroundColor: '#FDF4F1' }}
          >
            👶
          </div>
          <div>
            <div className="text-xl font-semibold">{selectedChild?.name}</div>
            <div className="text-sm text-gray-500">
              生後 {getDaysOld()}日目
            </div>
          </div>
        </div>
      </div>

      {/* 期間切り替え */}
      <div className="flex p-4 gap-2">
        <button
          onClick={() => setPeriod('week')}
          className="flex-1 py-2 rounded-lg font-medium transition"
          style={period === 'week'
            ? { backgroundColor: '#D97757', color: 'white' }
            : { backgroundColor: 'white', color: '#4b5563' }}
        >
          過去7日
        </button>
        <button
          onClick={() => setPeriod('month')}
          className="flex-1 py-2 rounded-lg font-medium transition"
          style={period === 'month'
            ? { backgroundColor: '#D97757', color: 'white' }
            : { backgroundColor: 'white', color: '#4b5563' }}
        >
          過去30日
        </button>
      </div>

      {/* 統計カード */}
      <div className="px-4 space-y-4">
        {/* ミルク */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🍼</span>
            <span className="font-semibold">ミルク</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#D97757' }}>{stats.milk.count}</div>
              <div className="text-xs text-gray-500">回数</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#D97757' }}>{stats.milk.total}</div>
              <div className="text-xs text-gray-500">総量 (ml)</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#D97757' }}>{stats.milk.avgPerDay}</div>
              <div className="text-xs text-gray-500">1日平均 (ml)</div>
            </div>
          </div>
        </div>

        {/* うんち・おしっこ */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💩</span>
              <span className="font-semibold">うんち</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#D97757' }}>{stats.poop.count}</div>
              <div className="text-xs text-gray-500">回（1日平均 {stats.poop.avgPerDay}回）</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💧</span>
              <span className="font-semibold">おしっこ</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#D97757' }}>{stats.pee.count}</div>
              <div className="text-xs text-gray-500">回（1日平均 {stats.pee.avgPerDay}回）</div>
            </div>
          </div>
        </div>

        {/* その他 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">😴</span>
              <span className="font-semibold">睡眠</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#D97757' }}>{stats.sleep.count}</div>
              <div className="text-xs text-gray-500">回記録</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🛁</span>
              <span className="font-semibold">お風呂</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#D97757' }}>{stats.bath.count}</div>
              <div className="text-xs text-gray-500">回記録</div>
            </div>
          </div>
        </div>
      </div>

      {/* ボトムナビ */}
      <BottomNav current="summary" />
    </div>
  )
}
