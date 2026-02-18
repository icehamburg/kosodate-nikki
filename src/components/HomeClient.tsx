'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Child, Record, RECORD_TYPES } from '@/lib/types'
import RecordModal from '@/components/RecordModal'
import DiaryModal from '@/components/DiaryModal'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useApp } from '@/components/AppProvider'

type Props = {
  initialChildren: Child[]
  userId: string
}

export default function HomeClient({ initialChildren, userId }: Props) {
  const { selectedChildId, setSelectedChildId } = useApp()
  const children = initialChildren
  const [records, setRecords] = useState<Record[]>([])
  const [selectedRecordType, setSelectedRecordType] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<Record | null>(null)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [toast, setToast] = useState<string | null>(null)
  const supabase = createClient()

  const selectedChild = children.find(c => c.id === selectedChildId)

  // 今日かどうか判定
  const today = new Date()
  const isToday = selectedDate.toDateString() === today.toDateString()

  // 日付表示用文字列
  const dateStr = `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日（${['日','月','火','水','木','金','土'][selectedDate.getDay()]}）`

  // 日付移動
  const goToPrevDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const goToNextDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  // 生後日数を計算（選択中の日付基準）
  const getDaysOld = () => {
    if (!selectedChild) return 0
    const birthday = new Date(selectedChild.birthday)
    const diffTime = Math.abs(selectedDate.getTime() - birthday.getTime())
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  // 選択した日の記録を取得
  useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedChildId) return

      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)

      const dayEnd = new Date(selectedDate)
      dayEnd.setHours(23, 59, 59, 999)

      const { data } = await supabase
        .from('records')
        .select('*')
        .eq('child_id', selectedChildId)
        .gte('recorded_at', dayStart.toISOString())
        .lte('recorded_at', dayEnd.toISOString())
        .order('recorded_at', { ascending: true })

      if (data) setRecords(data)
    }

    fetchRecords()
  }, [selectedChildId, selectedDate, supabase])

  // サマリーを計算
  const getSummary = () => {
    const milkCount = records.filter(r => r.type === 'milk').length
    const milkTotal = records
      .filter(r => r.type === 'milk')
      .reduce((sum, r) => sum + (r.value?.amount || 0), 0)
    const poopCount = records.filter(r => r.type === 'poop').length
    const peeCount = records.filter(r => r.type === 'pee').length

    return { milkCount, milkTotal, poopCount, peeCount }
  }

  const summary = getSummary()

  const handleRecordSaved = (newRecord: Record) => {
    // 新しい記録を追加して時刻順（昇順：上から下）にソート
    setRecords(prev => {
      const newRecords = [...prev, newRecord]
      return newRecords.sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )
    })
    setSelectedRecordType(null) // モーダルを閉じる

    // トースト表示
    const recordType = RECORD_TYPES.find(r => r.type === newRecord.type)
    setToast(`${recordType?.emoji} ${recordType?.label}を記録しました`)
    setTimeout(() => setToast(null), 2000)
  }

  const handleRecordUpdated = (updatedRecord: Record) => {
    // 更新した記録を反映して時刻順にソート
    setRecords(prev => {
      const newRecords = prev.map(r => r.id === updatedRecord.id ? updatedRecord : r)
      return newRecords.sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )
    })
    setEditingRecord(null)
    setSelectedRecordType(null)

    // トースト表示
    const recordType = RECORD_TYPES.find(r => r.type === updatedRecord.type)
    setToast(`${recordType?.emoji} ${recordType?.label}を更新しました`)
    setTimeout(() => setToast(null), 2000)
  }

  // タイムラインの項目をタップして編集
  const handleRecordClick = (record: Record) => {
    setEditingRecord(record)
    setSelectedRecordType(record.type)
  }

  // 記録を削除
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('この記録を削除しますか？')) return

    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId)

    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== recordId))
    }
    setSelectedRecordType(null)
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 safe-top" style={{ background: 'var(--background)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-avatar-bg)' }}
            >
              {selectedChild?.photo_url ? (
                <img
                  src={selectedChild.photo_url}
                  alt={selectedChild.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="text-lg font-bold bg-transparent border-none focus:outline-none cursor-pointer"
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

      {/* 日付表示 */}
      <div className="text-center py-5">
        <div className="text-sm text-gray-500" style={{ color: 'var(--color-text-muted)' }}>{isToday ? '今日' : ''}</div>
        <div className="flex items-center justify-center gap-4 mt-1">
          <button
            onClick={goToPrevDay}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            <span className="text-xl">‹</span>
          </button>
          <div className="text-2xl font-bold">{dateStr}</div>
          <button
            onClick={goToNextDay}
            disabled={isToday}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
              isToday
                ? 'text-gray-200 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">›</span>
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          生後 {getDaysOld()}日目
        </div>
      </div>

      {/* アイコングリッド */}
      <div className="px-4">
        <div className="grid grid-cols-4 gap-2">
          {RECORD_TYPES.map(({ type, emoji, label }) => (
            <button
              key={type}
              onClick={() => setSelectedRecordType(type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl shadow-sm hover:bg-gray-50 transition"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-xs text-gray-600 mt-1">{label}</span>
            </button>
          ))}
          {/* 日記ボタン */}
          <button
            onClick={() => setShowDiaryModal(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl shadow-sm hover:bg-gray-50 transition"
              style={{ backgroundColor: 'var(--color-card)' }}
          >
            <span className="text-3xl">📝</span>
            <span className="text-xs text-gray-600 mt-1">日記</span>
          </button>
        </div>
      </div>

      {/* その日のサマリー */}
      <div className="px-4 mt-6">
        <div className="text-sm font-semibold text-gray-700 mb-3">{isToday ? '今日' : 'この日'}の記録</div>
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>🍼 {summary.milkCount}回 / {summary.milkTotal}ml</span>
            <span>💩 {summary.poopCount}回</span>
            <span>💧 {summary.peeCount}回</span>
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <div className="px-4 mt-6">
        <div className="text-sm font-semibold text-gray-700 mb-3">タイムライン</div>
        <div className="space-y-2">
          {records.length === 0 ? (
            <div className="rounded-xl p-4 shadow-sm text-center text-gray-400" style={{ backgroundColor: 'var(--color-card)' }}>
              まだ記録がありません
            </div>
          ) : (
            records.map(record => {
              const recordType = RECORD_TYPES.find(r => r.type === record.type)
              const time = new Date(record.recorded_at).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
              })

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
                  className="flex items-center gap-3 rounded-xl p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition"
                  style={{ backgroundColor: 'var(--color-card)' }}
                  onClick={() => handleRecordClick(record)}
                >
                  <span className="text-xs text-gray-400 w-12">{time}</span>
                  <span className="text-xl">{displayEmoji}</span>
                  <span className="text-sm flex-1">
                    {displayLabel}
                    {detail && <span className="text-gray-500 ml-1">{detail}</span>}
                    {record.memo && (
                      <span className="text-xs text-gray-400 ml-2">{record.memo}</span>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteRecord(record.id)
                    }}
                    className="text-gray-300 hover:text-red-400 transition p-1"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 記録モーダル */}
      {selectedRecordType && (
        <RecordModal
          type={selectedRecordType}
          childId={selectedChildId}
          date={selectedDate}
          onClose={() => {
            setSelectedRecordType(null)
            setEditingRecord(null)
          }}
          onSaved={handleRecordSaved}
          editRecord={editingRecord || undefined}
          onUpdated={handleRecordUpdated}
        />
      )}

      {/* 日記モーダル */}
      {showDiaryModal && (
        <DiaryModal
          childId={selectedChildId}
          date={selectedDate.toISOString().split('T')[0]}
          onClose={() => setShowDiaryModal(false)}
        />
      )}

      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in" style={{ backgroundColor: 'var(--color-toast-bg)', color: 'var(--color-toast-text)' }}>
          {toast}
        </div>
      )}

      {/* ボトムナビ */}
      <BottomNav current="home" />
    </div>
  )
}
