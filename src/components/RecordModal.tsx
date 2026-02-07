'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Record, RecordType, RECORD_TYPES } from '@/lib/types'

type Props = {
  type: string
  childId: string
  date: Date
  onClose: () => void
  onSaved: (record: Record) => void
}

export default function RecordModal({ type, childId, date, onClose, onSaved }: Props) {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [amount, setAmount] = useState<number | null>(null)
  const [temperatureInt, setTemperatureInt] = useState(36)
  const [temperatureDec, setTemperatureDec] = useState(5)
  const [leftMinutes, setLeftMinutes] = useState<number | null>(null)
  const [rightMinutes, setRightMinutes] = useState<number | null>(null)
  const [sleepType, setSleepType] = useState<'asleep' | 'awake' | null>(null)
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()
  const recordType = RECORD_TYPES.find(r => r.type === type)

  const handleSubmit = async () => {
    setLoading(true)

    const recordDate = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    recordDate.setHours(hours, minutes, 0, 0)

    const value: Record['value'] = {}
    if (type === 'milk' && amount) value.amount = amount
    if (type === 'breast') {
      if (leftMinutes) value.left_minutes = leftMinutes
      if (rightMinutes) value.right_minutes = rightMinutes
    }
    if (type === 'sleep' && sleepType) {
      value.sleep_type = sleepType
    }
    if (type === 'temperature') {
      value.temperature = temperatureInt + temperatureDec / 10
    }

    const { data, error } = await supabase
      .from('records')
      .insert({
        child_id: childId,
        type: type as RecordType,
        recorded_at: recordDate.toISOString(),
        value: Object.keys(value).length > 0 ? value : null,
        memo: memo || null,
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      alert('保存に失敗しました')
      return
    }

    onSaved(data)
  }

  const milkAmounts = [60, 80, 100, 120, 140, 160, 180, 200, 220, 240]
  const breastMinutes = [5, 10, 15, 20, 25, 30]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] animate-slide-up">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-4xl">{recordType?.emoji}</span>
          <span className="text-lg font-semibold">{recordType?.label}を記録</span>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* 時刻 */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-2">時刻</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-lg"
          />
        </div>

        {/* ミルクの量 */}
        {type === 'milk' && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">量（ml）</label>
            <div className="flex flex-wrap gap-2">
              {milkAmounts.map(ml => (
                <button
                  key={ml}
                  onClick={() => setAmount(ml)}
                  className="px-4 py-2 rounded-full border transition"
                  style={amount === ml ? { backgroundColor: '#D97757', color: 'white', borderColor: '#D97757' } : { borderColor: '#e5e7eb' }}
                >
                  {ml}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 母乳の時間 */}
        {type === 'breast' && (
          <>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-2">左（分）</label>
              <div className="flex flex-wrap gap-2">
                {breastMinutes.map(min => (
                  <button
                    key={min}
                    onClick={() => setLeftMinutes(min)}
                    className="px-4 py-2 rounded-full border transition"
                    style={leftMinutes === min ? { backgroundColor: '#D97757', color: 'white', borderColor: '#D97757' } : { borderColor: '#e5e7eb' }}
                  >
                    {min}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-2">右（分）</label>
              <div className="flex flex-wrap gap-2">
                {breastMinutes.map(min => (
                  <button
                    key={min}
                    onClick={() => setRightMinutes(min)}
                    className="px-4 py-2 rounded-full border transition"
                    style={rightMinutes === min ? { backgroundColor: '#D97757', color: 'white', borderColor: '#D97757' } : { borderColor: '#e5e7eb' }}
                  >
                    {min}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 睡眠 */}
        {type === 'sleep' && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">どっち？</label>
            <div className="flex gap-3">
              <button
                onClick={() => setSleepType('asleep')}
                className="flex-1 py-4 rounded-xl border-2 transition text-lg font-medium"
                style={sleepType === 'asleep' ? { backgroundColor: '#5B6B8A', color: 'white', borderColor: '#5B6B8A' } : { borderColor: '#e5e7eb' }}
              >
                😴 寝た
              </button>
              <button
                onClick={() => setSleepType('awake')}
                className="flex-1 py-4 rounded-xl border-2 transition text-lg font-medium"
                style={sleepType === 'awake' ? { backgroundColor: '#E8B86D', color: 'white', borderColor: '#E8B86D' } : { borderColor: '#e5e7eb' }}
              >
                ☀️ 起きた
              </button>
            </div>
          </div>
        )}

        {/* 体温 */}
        {type === 'temperature' && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">体温（℃）</label>
            <div className="flex items-center justify-center gap-2">
              <select
                value={temperatureInt}
                onChange={(e) => setTemperatureInt(Number(e.target.value))}
                className="text-3xl font-bold p-3 border border-gray-200 rounded-xl bg-white appearance-none text-center w-24"
              >
                {[34, 35, 36, 37, 38, 39, 40, 41, 42].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-3xl font-bold">.</span>
              <select
                value={temperatureDec}
                onChange={(e) => setTemperatureDec(Number(e.target.value))}
                className="text-3xl font-bold p-3 border border-gray-200 rounded-xl bg-white appearance-none text-center w-20"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-2xl text-gray-500">℃</span>
            </div>
          </div>
        )}

        {/* メモ */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 block mb-2">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力..."
            className="w-full p-3 border border-gray-200 rounded-xl resize-none h-20"
          />
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 text-white rounded-xl font-semibold transition disabled:opacity-50"
          style={{ backgroundColor: '#D97757' }}
        >
          {loading ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}
