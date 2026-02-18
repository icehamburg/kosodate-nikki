'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Record } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useApp } from '@/components/AppProvider'

export default function SummaryPage() {
  const { children, selectedChildId, setSelectedChildId } = useApp()
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [records, setRecords] = useState<Record[]>([])
  const supabase = createClient()

  const selectedChild = children.find(c => c.id === selectedChildId)

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

  // 睡眠時間を計算（「寝た」→「起きた」のペアから算出）
  const calcSleepStats = (sleepRecords: Record[]) => {
    // 時系列順にソート
    const sorted = [...sleepRecords].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    let totalMinutes = 0
    let sessionCount = 0
    let lastAsleep: Date | null = null

    for (const r of sorted) {
      if (r.value?.sleep_type === 'asleep') {
        lastAsleep = new Date(r.recorded_at)
      } else if (r.value?.sleep_type === 'awake' && lastAsleep) {
        const awake = new Date(r.recorded_at)
        const diffMinutes = (awake.getTime() - lastAsleep.getTime()) / (1000 * 60)
        // 24時間以上は異常値として除外
        if (diffMinutes > 0 && diffMinutes <= 24 * 60) {
          totalMinutes += diffMinutes
          sessionCount++
        }
        lastAsleep = null
      }
    }

    return { totalMinutes, sessionCount }
  }

  // 睡眠時間をフォーマット（例: 8時間30分）
  const formatSleepTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h === 0) return `${m}分`
    if (m === 0) return `${h}時間`
    return `${h}時間${m}分`
  }

  // 統計を計算
  const getStats = () => {
    const milkRecords = records.filter(r => r.type === 'milk')
    const breastRecords = records.filter(r => r.type === 'breast')
    const poopRecords = records.filter(r => r.type === 'poop')
    const peeRecords = records.filter(r => r.type === 'pee')
    const sleepRecords = records.filter(r => r.type === 'sleep')

    const days = period === 'week' ? 7 : 30

    const milkTotal = milkRecords.reduce((sum, r) => sum + (r.value?.amount || 0), 0)
    const milkAvgPerDay = Math.round(milkTotal / days)
    const milkCountPerDay = (milkRecords.length / days).toFixed(1)

    const breastLeftTotal = breastRecords.reduce((sum, r) => sum + (r.value?.left_minutes || 0), 0)
    const breastRightTotal = breastRecords.reduce((sum, r) => sum + (r.value?.right_minutes || 0), 0)
    const breastLeftAvg = breastRecords.length > 0 ? Math.round(breastLeftTotal / days) : 0
    const breastRightAvg = breastRecords.length > 0 ? Math.round(breastRightTotal / days) : 0

    const sleepStats = calcSleepStats(sleepRecords)
    const sleepAvgPerDay = sleepStats.sessionCount > 0
      ? sleepStats.totalMinutes / days
      : 0

    return {
      milk: {
        total: milkTotal,
        avgPerDay: milkAvgPerDay,
        countPerDay: milkCountPerDay,
        count: milkRecords.length,
      },
      breast: {
        count: breastRecords.length,
        leftTotal: breastLeftTotal,
        rightTotal: breastRightTotal,
        leftAvg: breastLeftAvg,
        rightAvg: breastRightAvg,
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
        sessionCount: sleepStats.sessionCount,
        totalMinutes: sleepStats.totalMinutes,
        avgPerDay: sleepAvgPerDay,
      },
    }
  }

  const stats = useMemo(() => getStats(), [records, period])

  // 生後日数
  const getDaysOld = () => {
    if (!selectedChild) return 0
    const birthday = new Date(selectedChild.birthday)
    const now = new Date()
    return Math.floor((now.getTime() - birthday.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 safe-top" style={{ background: 'var(--background)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-avatar-bg)' }}
            >
              {selectedChild?.photo_url ? (
                <img src={selectedChild.photo_url} alt={selectedChild.name} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="text-lg font-bold bg-transparent border-none focus:outline-none"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Link href="/settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.2304 13.5456V10.4544L22.6104 8.724C22.8427 8.43451 22.9819 8.08149 23.0098 7.71138C23.0376 7.34126 22.9528 6.97138 22.7664 6.6504L22.0176 5.3496C21.8321 5.02817 21.554 4.77013 21.2197 4.60915C20.8853 4.44817 20.5102 4.39173 20.1432 4.4472L17.9544 4.7784L15.276 3.2328L14.4696 1.1736C14.3342 0.828038 14.0978 0.53127 13.7913 0.321943C13.4848 0.112616 13.1224 0.000432 12.7512 0H11.2488C10.8777 0.000432 10.5152 0.112616 10.2087 0.321943C9.90223 0.53127 9.66586 0.828038 9.53041 1.1736L8.72401 3.2328L6.04561 4.7784L3.85681 4.4472C3.48987 4.39173 3.11473 4.44817 2.78036 4.60915C2.44598 4.77013 2.1679 5.02817 1.98241 5.3496L1.23361 6.6504C1.04725 6.97138 0.962414 7.34126 0.990259 7.71138C1.0181 8.08149 1.15732 8.43451 1.38961 8.724L2.76961 10.4544V13.5456L1.38961 15.276C1.15732 15.5655 1.0181 15.9185 0.990259 16.2886C0.962414 16.6587 1.04725 17.0286 1.23361 17.3496L1.98241 18.6504C2.1679 18.9718 2.44598 19.2299 2.78036 19.3909C3.11473 19.5518 3.48987 19.6083 3.85681 19.5528L6.04561 19.2216L8.72401 20.7672L9.53041 22.8264C9.66586 23.172 9.90223 23.4687 10.2087 23.6781C10.5152 23.8874 10.8777 23.9996 11.2488 24H12.7512C13.1224 23.9996 13.4848 23.8874 13.7913 23.6781C14.0978 23.4687 14.3342 23.172 14.4696 22.8264L15.276 20.7672L17.9544 19.2216L20.1432 19.5528C20.5102 19.6083 20.8853 19.5518 21.2197 19.3909C21.554 19.2299 21.8321 18.9718 22.0176 18.6504L22.7664 17.3496C22.9528 17.0286 23.0376 16.6587 23.0098 16.2886C22.9819 15.9185 22.8427 15.5655 22.6104 15.276L21.2304 13.5456ZM12 15.6C11.5273 15.6 11.0591 15.5069 10.6224 15.326C10.1856 15.145 9.78872 14.8799 9.45443 14.5456C9.12014 14.2113 8.85496 13.8144 8.67405 13.3777C8.49313 12.9409 8.40001 12.4728 8.40001 12C8.40001 11.5272 8.49313 11.0591 8.67405 10.6223C8.85496 10.1856 9.12014 9.78871 9.45443 9.45442C9.78872 9.12012 10.1856 8.85495 10.6224 8.67403C11.0591 8.49312 11.5273 8.4 12 8.4C12.9548 8.4 13.8705 8.77928 14.5456 9.45442C15.2207 10.1295 15.6 11.0452 15.6 12C15.6 12.9548 15.2207 13.8705 14.5456 14.5456C13.8705 15.2207 12.9548 15.6 12 15.6Z" fill="var(--color-icon-active)" />
              </svg>
            </Link>
        </div>
      </header>

      {/* 生後日数 */}
      <div className="px-4 pt-3 pb-1" style={{ borderBottom: 'none' }}>
        <div className="text-sm text-gray-500">
          生後 {getDaysOld()}日目
        </div>
      </div>

      {/* 期間切り替え */}
      <div className="flex p-4 gap-2">
        <button
          onClick={() => setPeriod('week')}
          className="flex-1 py-2 rounded-lg font-medium transition"
          style={period === 'week'
            ? { backgroundColor: 'var(--color-primary)', color: 'white' }
            : { backgroundColor: 'var(--color-card)', color: 'var(--color-text-secondary)' }}
        >
          過去7日
        </button>
        <button
          onClick={() => setPeriod('month')}
          className="flex-1 py-2 rounded-lg font-medium transition"
          style={period === 'month'
            ? { backgroundColor: 'var(--color-primary)', color: 'white' }
            : { backgroundColor: 'var(--color-card)', color: 'var(--color-text-secondary)' }}
        >
          過去30日
        </button>
      </div>

      {/* 統計カード */}
      <div className="px-4 space-y-4">
        {/* ミルク */}
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🍼</span>
            <span className="font-semibold">ミルク</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.milk.count}</div>
              <div className="text-xs text-gray-500">回数</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.milk.total}</div>
              <div className="text-xs text-gray-500">総量 (ml)</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.milk.avgPerDay}</div>
              <div className="text-xs text-gray-500">1日平均 (ml)</div>
            </div>
          </div>
        </div>

        {/* うんち・おしっこ */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💩</span>
              <span className="font-semibold">うんち</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.poop.count}</div>
              <div className="text-xs text-gray-500">回（1日平均 {stats.poop.avgPerDay}回）</div>
            </div>
          </div>
          <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💧</span>
              <span className="font-semibold">おしっこ</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.pee.count}</div>
              <div className="text-xs text-gray-500">回（1日平均 {stats.pee.avgPerDay}回）</div>
            </div>
          </div>
        </div>

        {/* 睡眠 */}
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">😴</span>
            <span className="font-semibold">睡眠</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
                {stats.sleep.avgPerDay > 0 ? formatSleepTime(stats.sleep.avgPerDay) : '-'}
              </div>
              <div className="text-xs text-gray-500">1日平均</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.sleep.sessionCount}</div>
              <div className="text-xs text-gray-500">回（合計 {stats.sleep.totalMinutes > 0 ? formatSleepTime(stats.sleep.totalMinutes) : '-'}）</div>
            </div>
          </div>
        </div>

        {/* 母乳 */}
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🤱</span>
            <span className="font-semibold">母乳</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.breast.count}</div>
              <div className="text-xs text-gray-500">回数</div>
            </div>
            <div>
              <div className="text-2xl font-bold whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>左 {stats.breast.leftAvg}分</div>
              <div className="text-xs text-gray-500">1日平均</div>
            </div>
            <div>
              <div className="text-2xl font-bold whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>右 {stats.breast.rightAvg}分</div>
              <div className="text-xs text-gray-500">1日平均</div>
            </div>
          </div>
        </div>
      </div>

      {/* ボトムナビ */}
      <BottomNav current="summary" />
    </div>
  )
}
