'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Child, Record, RECORD_TYPES } from '@/lib/types'
import RecordModal from '@/components/RecordModal'
import DiaryModal from '@/components/DiaryModal'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

type Props = {
  initialChildren: Child[]
  userId: string
}

export default function HomeClient({ initialChildren, userId }: Props) {
  const [children] = useState<Child[]>(initialChildren)
  const [selectedChildId, setSelectedChildId] = useState<string>(initialChildren[0]?.id)
  const [records, setRecords] = useState<Record[]>([])
  const [selectedRecordType, setSelectedRecordType] = useState<string | null>(null)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
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
        .order('recorded_at', { ascending: false })

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
    setRecords(prev => [newRecord, ...prev])
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
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Link href="/settings" className="text-2xl">
            ⚙️
          </Link>
        </div>
      </header>

      {/* 日付表示 */}
      <div className="text-center py-5">
        <div className="text-sm text-gray-500">{isToday ? '今日' : ''}</div>
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
              className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition"
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-xs text-gray-600 mt-1">{label}</span>
            </button>
          ))}
          {/* 日記ボタン */}
          <button
            onClick={() => setShowDiaryModal(true)}
            className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition"
          >
            <span className="text-3xl">📝</span>
            <span className="text-xs text-gray-600 mt-1">日記</span>
          </button>
        </div>
      </div>

      {/* その日のサマリー */}
      <div className="px-4 mt-6">
        <div className="text-sm font-semibold text-gray-700 mb-3">{isToday ? '今日' : 'この日'}の記録</div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
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
            <div className="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400">
              まだ記録がありません
            </div>
          ) : (
            records.map(record => {
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
              } else if (record.type === 'sleep' && record.value?.sleep_type) {
                detail = record.value.sleep_type === 'asleep' ? '寝た' : '起きた'
              }

              return (
                <div
                  key={record.id}
                  className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
                >
                  <span className="text-xs text-gray-400 w-12">{time}</span>
                  <span className="text-xl">{recordType?.emoji}</span>
                  <span className="text-sm flex-1">
                    {recordType?.label}
                    {detail && <span className="text-gray-500 ml-1">{detail}</span>}
                    {record.memo && (
                      <span className="text-xs text-gray-400 ml-2">{record.memo}</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
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
          onClose={() => setSelectedRecordType(null)}
          onSaved={handleRecordSaved}
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

      {/* ボトムナビ */}
      <BottomNav current="home" />
    </div>
  )
}
