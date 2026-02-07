'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Child, Record, Diary, RECORD_TYPES } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import DiaryModal from '@/components/DiaryModal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CalendarPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [dayRecords, setDayRecords] = useState<Record[]>([])
  const [dayDiary, setDayDiary] = useState<Diary | null>(null)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 認証チェック & 子どもデータ取得
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

  // 月の記録を取得
  useEffect(() => {
    const fetchMonthData = async () => {
      if (!selectedChildId) return

      const startOfMonth = new Date(year, month, 1)
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

      const [recordsRes, diariesRes] = await Promise.all([
        supabase
          .from('records')
          .select('*')
          .eq('child_id', selectedChildId)
          .gte('recorded_at', startOfMonth.toISOString())
          .lte('recorded_at', endOfMonth.toISOString()),
        supabase
          .from('diaries')
          .select('*')
          .eq('child_id', selectedChildId)
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0])
      ])

      if (recordsRes.data) setRecords(recordsRes.data)
      if (diariesRes.data) setDiaries(diariesRes.data)
    }
    fetchMonthData()
  }, [selectedChildId, year, month, supabase])

  // 日付選択時の記録取得
  useEffect(() => {
    if (!selectedDate) {
      setDayRecords([])
      setDayDiary(null)
      return
    }

    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)

    const filtered = records.filter(r => {
      const d = new Date(r.recorded_at)
      return d >= dayStart && d <= dayEnd
    })
    setDayRecords(filtered.sort((a, b) => 
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    ))

    const diary = diaries.find(d => d.date === selectedDate)
    setDayDiary(diary || null)
  }, [selectedDate, records, diaries])

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= lastDate; i++) {
      days.push(i)
    }
    return days
  }

  // 日付に記録があるか
  const hasRecordOnDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return records.some(r => r.recorded_at.startsWith(dateStr))
  }

  // 日付に日記があるか
  const hasDiaryOnDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return diaries.some(d => d.date === dateStr)
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate)
    return `${d.getMonth() + 1}月${d.getDate()}日（${['日','月','火','水','木','金','土'][d.getDay()]}）`
  }

  const days = generateCalendarDays()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Link href="/settings" className="text-2xl">⚙️</Link>
        </div>
      </header>

      {/* 月選択 */}
      <div className="flex items-center justify-between px-4 py-4 bg-white">
        <button onClick={prevMonth} className="p-2 text-xl">←</button>
        <span className="text-lg font-semibold">{year}年{month + 1}月</span>
        <button onClick={nextMonth} className="p-2 text-xl">→</button>
      </div>

      {/* カレンダー */}
      <div className="px-4 py-2">
        <div className="bg-white rounded-xl shadow-sm p-4">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
              <div key={d} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) {
                return <div key={i} />
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = selectedDate === dateStr
              const isToday = new Date().toISOString().split('T')[0] === dateStr
              const hasRecord = hasRecordOnDay(day)
              const hasDiary = hasDiaryOnDay(day)
              const dayOfWeek = new Date(year, month, day).getDay()

              const baseStyle: React.CSSProperties = {}
              if (isSelected) {
                baseStyle.backgroundColor = '#D97757'
                baseStyle.color = 'white'
              } else if (isToday) {
                baseStyle.backgroundColor = '#FDF4F1'
              }

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative
                    ${!isSelected && dayOfWeek === 0 ? 'text-red-400' : ''}
                    ${!isSelected && dayOfWeek === 6 ? 'text-blue-400' : ''}
                  `}
                  style={baseStyle}
                >
                  {day}
                  {(hasRecord || hasDiary) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasRecord && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? 'white' : '#D97757' }}
                        />
                      )}
                      {hasDiary && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? 'white' : '#E8B86D' }}
                        />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 選択日の記録 */}
      {selectedDate && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              {formatSelectedDate()}の記録
            </span>
            <button
              onClick={() => setShowDiaryModal(true)}
              className="text-sm"
              style={{ color: '#D97757' }}
            >
              📝 日記を書く
            </button>
          </div>

          {/* 日記 */}
          {dayDiary && dayDiary.content && (
            <div className="bg-yellow-50 rounded-xl p-4 mb-3 shadow-sm">
              <div className="text-xs text-yellow-600 mb-1">📝 日記</div>
              <div className="text-sm text-gray-700">{dayDiary.content}</div>
            </div>
          )}

          {/* 記録一覧 */}
          <div className="space-y-2">
            {dayRecords.length === 0 && !dayDiary?.content ? (
              <div className="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400">
                この日の記録はありません
              </div>
            ) : (
              dayRecords.map(record => {
                const recordType = RECORD_TYPES.find(r => r.type === record.type)
                const time = new Date(record.recorded_at).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit'
                })

                let detail = ''
                if (record.type === 'milk' && record.value?.amount) {
                  detail = `${record.value.amount}ml`
                } else if (record.type === 'temperature' && record.value?.temperature) {
                  detail = `${record.value.temperature}℃`
                }

                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
                  >
                    <span className="text-xs text-gray-400 w-12">{time}</span>
                    <span className="text-xl">{recordType?.emoji}</span>
                    <span className="text-sm">
                      {recordType?.label}
                      {detail && <span className="text-gray-500 ml-1">{detail}</span>}
                    </span>
                    {record.memo && (
                      <span className="text-xs text-gray-400 ml-auto">{record.memo}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* 日記モーダル */}
      {showDiaryModal && selectedDate && (
        <DiaryModal
          childId={selectedChildId}
          date={selectedDate}
          onClose={() => {
            setShowDiaryModal(false)
            // 日記を再取得
            const fetchDiary = async () => {
              const { data } = await supabase
                .from('diaries')
                .select('*')
                .eq('child_id', selectedChildId)
                .eq('date', selectedDate)
                .single()
              if (data) {
                setDiaries(prev => {
                  const filtered = prev.filter(d => d.date !== selectedDate)
                  return [...filtered, data]
                })
                setDayDiary(data)
              }
            }
            fetchDiary()
          }}
        />
      )}

      {/* ボトムナビ */}
      <BottomNav current="calendar" />
    </div>
  )
}
