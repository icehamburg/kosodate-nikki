'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Child, Record, Diary, RECORD_TYPES } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import DiaryModal from '@/components/DiaryModal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ViewMode = 'month' | 'day'

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
  const [showFullImage, setShowFullImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
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

      {/* 表示モード切り替え */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-b">
        <button
          onClick={() => setViewMode('month')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            viewMode === 'month'
              ? 'text-white'
              : 'text-gray-500 bg-gray-100'
          }`}
          style={viewMode === 'month' ? { backgroundColor: '#D97757' } : {}}
        >
          月
        </button>
        <button
          onClick={() => {
            setViewMode('day')
            if (!selectedDate) {
              const today = new Date().toISOString().split('T')[0]
              setSelectedDate(today)
            }
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            viewMode === 'day'
              ? 'text-white'
              : 'text-gray-500 bg-gray-100'
          }`}
          style={viewMode === 'day' ? { backgroundColor: '#D97757' } : {}}
        >
          日
        </button>
      </div>

      {/* 月選択（月表示モード） */}
      {viewMode === 'month' && (
        <div className="flex items-center justify-between px-4 py-4 bg-white">
          <button onClick={prevMonth} className="p-2 text-xl">←</button>
          <span className="text-lg font-semibold">{year}年{month + 1}月</span>
          <button onClick={nextMonth} className="p-2 text-xl">→</button>
        </div>
      )}

      {/* 日選択（日表示モード） */}
      {viewMode === 'day' && selectedDate && (
        <div className="flex items-center justify-between px-4 py-4 bg-white">
          <button
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}
            className="p-2 text-xl"
          >
            ←
          </button>
          <span className="text-lg font-semibold">{formatSelectedDate()}</span>
          <button
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              const today = new Date().toISOString().split('T')[0]
              if (d.toISOString().split('T')[0] <= today) {
                setSelectedDate(d.toISOString().split('T')[0])
              }
            }}
            className="p-2 text-xl"
          >
            →
          </button>
        </div>
      )}

      {/* カレンダー（月表示モード） */}
      {viewMode === 'month' && (
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
      )}

      {/* 24時間タイムライン（日表示モード） */}
      {viewMode === 'day' && selectedDate && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          {/* 日記 */}
          {dayDiary && (dayDiary.content || (dayDiary.photo_urls && dayDiary.photo_urls.length > 0)) && (
            <div className="mx-4 mt-2 bg-yellow-50 rounded-xl p-4 flex-shrink-0">
              <div className="flex gap-3">
                {dayDiary.photo_urls && dayDiary.photo_urls.length > 0 && (
                  <img
                    src={dayDiary.photo_urls[0]}
                    alt="日記の写真"
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                    onClick={() => setShowFullImage(dayDiary.photo_urls![0])}
                  />
                )}
                <div className="flex-1">
                  <div className="text-xs text-yellow-600 mb-1">📝 日記</div>
                  {dayDiary.content && (
                    <div className="text-sm text-gray-700">{dayDiary.content}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 24時間タイムライン（スクロール可能） */}
          <div className="flex-1 overflow-y-auto mx-4 my-2 bg-white rounded-xl shadow-sm">
            <div className="relative">
              {/* 時間軸は上から下（0時→23時） */}
              {Array.from({ length: 24 }, (_, hour) => {
                const hourRecords = dayRecords
                  .filter(r => new Date(r.recorded_at).getHours() === hour)
                  .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

                return (
                  <div key={hour} className="flex border-b last:border-b-0">
                    {/* 時刻ラベル（左側固定） */}
                    <div className="w-12 py-3 text-center text-xs text-gray-400 border-r bg-gray-50 flex-shrink-0 sticky left-0">
                      {hour}
                    </div>
                    {/* 記録エリア */}
                    <div className="flex-1 min-h-[56px] p-2 flex flex-col gap-1">
                      {hourRecords.length > 0 ? (
                        hourRecords.map(record => {
                          const recordType = RECORD_TYPES.find(r => r.type === record.type)
                          const minutes = new Date(record.recorded_at).getMinutes()
                          let detail = ''
                          if (record.type === 'milk' && record.value?.amount) {
                            detail = `${record.value.amount}ml`
                          } else if (record.type === 'temperature' && record.value?.temperature) {
                            detail = `${record.value.temperature}℃`
                          } else if (record.type === 'sleep' && record.value?.sleep_type) {
                            detail = record.value.sleep_type === 'asleep' ? '寝た' : '起きた'
                          } else if (record.type === 'breast') {
                            const left = record.value?.left_minutes
                            const right = record.value?.right_minutes
                            if (left || right) {
                              detail = `左${left || 0}分 右${right || 0}分`
                            }
                          }

                          return (
                            <div
                              key={record.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-gray-400 text-xs w-6">:{String(minutes).padStart(2, '0')}</span>
                              <span className="text-lg">{recordType?.emoji}</span>
                              <span className="font-medium">{recordType?.label}</span>
                              {detail && <span className="text-gray-500 text-xs">{detail}</span>}
                            </div>
                          )
                        })
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 日記を書くボタン */}
          <div className="px-4 pb-2 flex-shrink-0">
            <button
              onClick={() => setShowDiaryModal(true)}
              className="w-full py-3 bg-white rounded-xl shadow-sm text-center"
              style={{ color: '#D97757' }}
            >
              📝 日記を書く
            </button>
          </div>
        </div>
      )}

      {/* 選択日の記録（月表示モード） */}
      {viewMode === 'month' && selectedDate && (
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
          {dayDiary && (dayDiary.content || (dayDiary.photo_urls && dayDiary.photo_urls.length > 0)) && (
            <div className="bg-yellow-50 rounded-xl p-4 mb-3 shadow-sm">
              <div className="flex gap-3">
                {/* 写真があれば表示 */}
                {dayDiary.photo_urls && dayDiary.photo_urls.length > 0 && (
                  <img
                    src={dayDiary.photo_urls[0]}
                    alt="日記の写真"
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                    onClick={() => setShowFullImage(dayDiary.photo_urls![0])}
                  />
                )}
                <div className="flex-1">
                  <div className="text-xs text-yellow-600 mb-1">📝 日記</div>
                  {dayDiary.content && (
                    <div className="text-sm text-gray-700">{dayDiary.content}</div>
                  )}
                </div>
              </div>
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

      {/* 写真拡大表示 */}
      {showFullImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-xl"
            onClick={() => setShowFullImage(null)}
          >
            ✕
          </button>
          <img
            src={showFullImage}
            alt="日記の写真"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* ボトムナビ */}
      <BottomNav current="calendar" />
    </div>
  )
}
