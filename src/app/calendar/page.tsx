'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Record, Diary, RECORD_TYPES } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import DiaryModal from '@/components/DiaryModal'
import Link from 'next/link'
import { useApp } from '@/components/AppProvider'

type ViewMode = 'month' | 'day'

export default function CalendarPage() {
  const { children, selectedChildId, setSelectedChildId } = useApp()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [dayRecords, setDayRecords] = useState<Record[]>([])
  const [dayDiary, setDayDiary] = useState<Diary | null>(null)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [showFullImage, setShowFullImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showGallery, setShowGallery] = useState(false)
  const [galleryDiary, setGalleryDiary] = useState<Diary | null>(null)
  const [allDiaries, setAllDiaries] = useState<Diary[]>([])
  const supabase = createClient()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

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

  // フォトギャラリー用: 写真付き日記を取得（表示月の前後3ヶ月）
  useEffect(() => {
    const fetchAllDiaries = async () => {
      if (!selectedChildId) return
      const start = new Date(year, month - 3, 1)
      const end = new Date(year, month + 4, 0)
      const { data } = await supabase
        .from('diaries')
        .select('*')
        .eq('child_id', selectedChildId)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .order('date', { ascending: false })
      if (data) {
        setAllDiaries(data.filter(d => d.photo_urls && d.photo_urls.length > 0))
      }
    }
    fetchAllDiaries()
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

  // 日付の日記画像URLを取得（最初の1枚）
  const getDiaryImageOnDay = (day: number): string | null => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const diary = diaries.find(d => d.date === dateStr && d.photo_urls && d.photo_urls.length > 0)
    return diary?.photo_urls?.[0] || null
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
    <div className="min-h-screen pb-28" style={{ background: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 safe-top" style={{ background: 'var(--background)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(() => {
              const selected = children.find(c => c.id === selectedChildId)
              return (
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-avatar-bg)' }}
                >
                  {selected?.photo_url ? (
                    <img src={selected.photo_url} alt={selected.name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
              )
            })()}
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

      {/* 表示モード切り替え */}
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <button
          onClick={() => {
            setViewMode('month')
            window.scrollTo(0, 0)
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            viewMode === 'month'
              ? 'text-white'
              : ''
          }`}
          style={viewMode === 'month' ? { backgroundColor: 'var(--color-primary)' } : { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-tag-bg)' }}
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
            window.scrollTo(0, 0)
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            viewMode === 'day'
              ? 'text-white'
              : ''
          }`}
          style={viewMode === 'day' ? { backgroundColor: 'var(--color-primary)' } : { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-tag-bg)' }}
        >
          日
        </button>
      </div>

      {/* 月選択（月表示モード） */}
      {viewMode === 'month' && (
        <div className="flex items-center justify-between mx-4 mt-2 mb-2 px-4 py-3 rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
          <button onClick={prevMonth} className="p-2 text-xl">←</button>
          <span className="text-lg font-semibold">{year}年{month + 1}月</span>
          <button onClick={nextMonth} className="p-2 text-xl">→</button>
        </div>
      )}

      {/* 日選択（日表示モード） */}
      {viewMode === 'day' && selectedDate && (
        <div className="flex items-center justify-between mx-4 mt-2 mb-2 px-4 py-3 rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
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
          <div className="rounded-xl shadow-sm p-4" style={{ backgroundColor: 'var(--color-card)' }}>
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
                const diaryImage = getDiaryImageOnDay(day)
                const dayOfWeek = new Date(year, month, day).getDay()

                const baseStyle: React.CSSProperties = {}
                if (isSelected) {
                  baseStyle.backgroundColor = 'var(--color-primary)'
                  baseStyle.color = 'white'
                } else if (isToday) {
                  baseStyle.backgroundColor = 'var(--color-primary-light)'
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleDayClick(day)}
                    className={`
                      aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative overflow-hidden
                      ${!isSelected && dayOfWeek === 0 ? 'text-red-400' : ''}
                      ${!isSelected && dayOfWeek === 6 ? 'text-blue-400' : ''}
                    `}
                    style={baseStyle}
                  >
                    {/* 日記画像サムネイル（薄く背景表示） */}
                    {diaryImage && (
                      <img
                        src={diaryImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
                        style={{ opacity: isSelected ? 0.3 : 0.35 }}
                      />
                    )}
                    <span className="relative z-10" style={diaryImage && !isSelected ? { color: 'var(--color-text-primary)', fontWeight: 700, textShadow: '0 0 3px rgba(255,255,255,0.8)' } : {}}>
                      {day}
                    </span>
                    {(hasRecord || hasDiary) && (
                      <div className="flex gap-0.5 mt-0.5 relative z-10">
                        {hasRecord && (
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? 'var(--color-card)' : 'var(--color-primary)' }}
                          />
                        )}
                        {hasDiary && !diaryImage && (
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? 'var(--color-card)' : '#E8B86D' }}
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
            <div className="mx-4 mt-2 rounded-xl p-4 flex-shrink-0" style={{ backgroundColor: 'var(--color-diary-bg)' }}>
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
          <div className="flex-1 overflow-y-auto mx-4 my-2 rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="relative">
              {/* 時間軸は上から下（0時→23時） */}
              {Array.from({ length: 24 }, (_, hour) => {
                const hourRecords = dayRecords
                  .filter(r => new Date(r.recorded_at).getHours() === hour)
                  .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

                return (
                  <div key={hour} className="flex border-b border-gray-100 last:border-b-0">
                    {/* 時刻ラベル（左側固定） */}
                    <div className="w-12 py-3 text-center text-xs text-gray-600 font-medium border-r border-gray-100 bg-gray-50/50 flex-shrink-0 sticky left-0">
                      {hour}
                    </div>
                    {/* 記録エリア */}
                    <div className="flex-1 min-h-[56px] p-2 flex flex-col gap-1">
                      {hourRecords.length > 0 ? (
                        hourRecords.map(record => {
                          const recordType = RECORD_TYPES.find(r => r.type === record.type)
                          const minutes = new Date(record.recorded_at).getMinutes()

                          // 睡眠の場合はラベルと絵文字を上書き
                          let displayLabel = recordType?.label || ''
                          let displayEmoji = recordType?.emoji || ''
                          let detail = ''

                          if (record.type === 'sleep' && record.value?.sleep_type) {
                            if (record.value.sleep_type === 'asleep') {
                              displayLabel = '寝た'
                              displayEmoji = '😴'
                            } else {
                              displayLabel = '起きた'
                              displayEmoji = '😊'
                            }
                          } else if (record.type === 'milk' && record.value?.amount) {
                            detail = `${record.value.amount}ml`
                          } else if (record.type === 'temperature' && record.value?.temperature) {
                            detail = `${record.value.temperature}℃`
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
                              <span className="text-gray-300 text-xs w-6">:{String(minutes).padStart(2, '0')}</span>
                              <span className="text-lg">{displayEmoji}</span>
                              <span className="font-medium">{displayLabel}</span>
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
              className="w-full py-3 rounded-xl shadow-sm text-center"
              style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-card)' }}
            >
              📝 日記を書く
            </button>
          </div>
        </div>
      )}

      {/* 選択日の日記（月表示モード） */}
      {viewMode === 'month' && selectedDate && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              {formatSelectedDate()}
            </span>
            <button
              onClick={() => setShowDiaryModal(true)}
              className="text-sm"
              style={{ color: 'var(--color-primary)' }}
            >
              📝 日記を書く
            </button>
          </div>

          {/* 日記表示 */}
          {dayDiary && (dayDiary.content || (dayDiary.photo_urls && dayDiary.photo_urls.length > 0)) ? (
            <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
              {/* iPad: 横並び（写真左・テキスト右）、iPhone: 縦積み */}
              <div className={`flex ${dayDiary.photo_urls && dayDiary.photo_urls.length > 0 && dayDiary.content ? 'md:flex-row md:gap-4' : ''} flex-col`}>
                {/* 写真があれば表示 */}
                {dayDiary.photo_urls && dayDiary.photo_urls.length > 0 && (
                  <div className="md:w-64 md:flex-shrink-0">
                    <img
                      src={dayDiary.photo_urls[0]}
                      alt="日記の写真"
                      className="w-full h-48 md:h-48 object-cover rounded-lg mb-3 md:mb-0 cursor-pointer"
                      onClick={() => setShowFullImage(dayDiary.photo_urls![0])}
                    />
                  </div>
                )}
                {dayDiary.content && (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed flex-1">
                    {dayDiary.content}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 shadow-sm text-center text-gray-400" style={{ backgroundColor: 'var(--color-card)' }}>
              日記がありません
            </div>
          )}
        </div>
      )}

      {/* フォトギャラリーボタン（月表示モード） */}
      {viewMode === 'month' && allDiaries.length > 0 && (
        <div className="px-4 mt-4 mb-4">
          <button
            onClick={() => setShowGallery(true)}
            className="w-full py-3 rounded-xl shadow-sm text-center font-medium"
            style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-card)' }}
          >
            📷 フォトギャラリーを見る（{allDiaries.reduce((sum, d) => sum + (d.photo_urls?.length || 0), 0)}枚）
          </button>
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

      {/* フォトギャラリーモーダル */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--background)' }}>
          {/* ギャラリーヘッダー */}
          <div className="safe-top flex items-center justify-between px-4 py-3" style={{ background: 'var(--background)' }}>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>フォトギャラリー</span>
            <button
              onClick={() => { setShowGallery(false); setGalleryDiary(null) }}
              className="w-10 h-10 flex items-center justify-center rounded-full"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>

          {/* 写真グリッド（3列、インスタ風） */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-0.5 px-0.5">
              {allDiaries.flatMap(diary =>
                (diary.photo_urls || []).map((url, idx) => (
                  <button
                    key={`${diary.id}-${idx}`}
                    onClick={() => setGalleryDiary(diary)}
                    className="aspect-square overflow-hidden"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ギャラリー内 日記詳細モーダル（スワイプ対応） */}
      {galleryDiary && (() => {
        const currentIdx = allDiaries.findIndex(d => d.id === galleryDiary.id)
        const goPrev = () => {
          // 左スワイプ → 古い日記へ（末尾ならループして先頭へ）
          const nextIdx = currentIdx < allDiaries.length - 1 ? currentIdx + 1 : 0
          setGalleryDiary(allDiaries[nextIdx])
        }
        const goNext = () => {
          // 右スワイプ → 新しい日記へ（先頭ならループして末尾へ）
          const nextIdx = currentIdx > 0 ? currentIdx - 1 : allDiaries.length - 1
          setGalleryDiary(allDiaries[nextIdx])
        }

        return (
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-black/90"
            onTouchStart={(e) => {
              const t = e.touches[0]
              ;(e.currentTarget as HTMLElement).dataset.touchX = String(t.clientX)
              ;(e.currentTarget as HTMLElement).dataset.touchY = String(t.clientY)
            }}
            onTouchEnd={(e) => {
              const startX = Number((e.currentTarget as HTMLElement).dataset.touchX)
              const startY = Number((e.currentTarget as HTMLElement).dataset.touchY)
              const endX = e.changedTouches[0].clientX
              const endY = e.changedTouches[0].clientY
              const diffX = endX - startX
              const diffY = Math.abs(endY - startY)
              // 横方向に50px以上 & 縦より大きいスワイプのみ
              if (Math.abs(diffX) > 50 && Math.abs(diffX) > diffY) {
                if (diffX < 0) goPrev()   // 左スワイプ → 古い日記へ
                else goNext()              // 右スワイプ → 新しい日記へ
              }
            }}
          >
            {/* ヘッダー */}
            <div className="safe-top flex items-center justify-between px-4 py-3">
              <span className="text-white text-sm">
                {(() => {
                  const d = new Date(galleryDiary.date)
                  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${['日','月','火','水','木','金','土'][d.getDay()]}）`
                })()}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-white/50 text-xs">
                  {allDiaries.length - currentIdx} / {allDiaries.length}
                </span>
                <button
                  onClick={() => setGalleryDiary(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="5" x2="15" y2="15" />
                    <line x1="15" y1="5" x2="5" y2="15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* コンテンツ（縦スクロール可能） */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 safe-bottom">
              <div className="flex flex-col items-center min-h-full justify-center">
                {/* 写真 */}
                {galleryDiary.photo_urls && galleryDiary.photo_urls.length > 1 ? (
                  <div className="w-full overflow-x-auto flex gap-2 snap-x snap-mandatory pb-4 flex-shrink-0">
                    {galleryDiary.photo_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="max-h-[55vh] rounded-lg object-contain snap-center flex-shrink-0"
                        style={{ maxWidth: '90vw' }}
                      />
                    ))}
                  </div>
                ) : galleryDiary.photo_urls && galleryDiary.photo_urls.length === 1 ? (
                  <img
                    src={galleryDiary.photo_urls[0]}
                    alt=""
                    className="max-h-[55vh] max-w-full rounded-lg object-contain flex-shrink-0"
                  />
                ) : null}

                {/* 日記テキスト */}
                {galleryDiary.content && (
                  <div className="mt-4 w-full max-w-lg bg-white/10 rounded-xl p-4 flex-shrink-0">
                    <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                      {galleryDiary.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
