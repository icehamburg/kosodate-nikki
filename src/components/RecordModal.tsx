'use client'

import { useState, useEffect } from 'react'
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
  const [amount, setAmount] = useState<number>(100)
  const [temperatureInt, setTemperatureInt] = useState(36)
  const [temperatureDec, setTemperatureDec] = useState(5)
  // 母乳ストップウォッチ
  const [leftSeconds, setLeftSeconds] = useState(0)
  const [rightSeconds, setRightSeconds] = useState(0)
  const [leftTimerRunning, setLeftTimerRunning] = useState(false)
  const [rightTimerRunning, setRightTimerRunning] = useState(false)
  const [sleepType, setSleepType] = useState<'asleep' | 'awake' | null>(null)
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)

  // ストップウォッチのタイマー
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (leftTimerRunning) {
      interval = setInterval(() => {
        setLeftSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [leftTimerRunning])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (rightTimerRunning) {
      interval = setInterval(() => {
        setRightSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [rightTimerRunning])

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
      // 秒を分に変換（小数点以下1桁まで）
      if (leftSeconds > 0) value.left_minutes = Math.round(leftSeconds / 6) / 10
      if (rightSeconds > 0) value.right_minutes = Math.round(rightSeconds / 6) / 10
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

  // ミルク量は10-350mlまで10ml刻み (selectで生成)

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

        {/* ミルクの量（ドラムロール） */}
        {type === 'milk' && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">量（ml）</label>
            <div className="flex items-center justify-center gap-2">
              <select
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="text-4xl font-bold p-3 border border-gray-200 rounded-xl bg-white appearance-none text-center w-32"
                style={{ fontSize: '2rem' }}
              >
                {Array.from({ length: 35 }, (_, i) => (i + 1) * 10).map(ml => (
                  <option key={ml} value={ml}>{ml}</option>
                ))}
              </select>
              <span className="text-2xl text-gray-500">ml</span>
            </div>
          </div>
        )}

        {/* 母乳の時間（ストップウォッチ or ドラムロール） */}
        {type === 'breast' && (
          <>
            {/* 左側 */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-2">左（分:秒）</label>
              <div className="flex items-center gap-3">
                {/* ストップウォッチ */}
                <div className="flex-1 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (leftTimerRunning) {
                        setLeftTimerRunning(false)
                      } else {
                        setLeftTimerRunning(true)
                        setRightTimerRunning(false)
                      }
                    }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition"
                    style={{
                      backgroundColor: leftTimerRunning ? '#ef4444' : '#D97757',
                      color: 'white'
                    }}
                  >
                    {leftTimerRunning ? '⏹' : '▶'}
                  </button>
                  <div className="text-3xl font-mono font-bold tabular-nums">
                    {String(Math.floor(leftSeconds / 60)).padStart(2, '0')}:{String(leftSeconds % 60).padStart(2, '0')}
                  </div>
                  {leftSeconds > 0 && !leftTimerRunning && (
                    <button
                      onClick={() => setLeftSeconds(0)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* ドラムロール */}
                <div className="flex items-center gap-1">
                  <select
                    value={Math.floor(leftSeconds / 60)}
                    onChange={(e) => setLeftSeconds(Number(e.target.value) * 60 + (leftSeconds % 60))}
                    className="text-lg p-2 border border-gray-200 rounded-lg bg-white w-16 text-center"
                  >
                    {Array.from({ length: 61 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-lg">:</span>
                  <select
                    value={leftSeconds % 60}
                    onChange={(e) => setLeftSeconds(Math.floor(leftSeconds / 60) * 60 + Number(e.target.value))}
                    className="text-lg p-2 border border-gray-200 rounded-lg bg-white w-16 text-center"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 右側 */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-2">右（分:秒）</label>
              <div className="flex items-center gap-3">
                {/* ストップウォッチ */}
                <div className="flex-1 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (rightTimerRunning) {
                        setRightTimerRunning(false)
                      } else {
                        setRightTimerRunning(true)
                        setLeftTimerRunning(false)
                      }
                    }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition"
                    style={{
                      backgroundColor: rightTimerRunning ? '#ef4444' : '#D97757',
                      color: 'white'
                    }}
                  >
                    {rightTimerRunning ? '⏹' : '▶'}
                  </button>
                  <div className="text-3xl font-mono font-bold tabular-nums">
                    {String(Math.floor(rightSeconds / 60)).padStart(2, '0')}:{String(rightSeconds % 60).padStart(2, '0')}
                  </div>
                  {rightSeconds > 0 && !rightTimerRunning && (
                    <button
                      onClick={() => setRightSeconds(0)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* ドラムロール */}
                <div className="flex items-center gap-1">
                  <select
                    value={Math.floor(rightSeconds / 60)}
                    onChange={(e) => setRightSeconds(Number(e.target.value) * 60 + (rightSeconds % 60))}
                    className="text-lg p-2 border border-gray-200 rounded-lg bg-white w-16 text-center"
                  >
                    {Array.from({ length: 61 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-lg">:</span>
                  <select
                    value={rightSeconds % 60}
                    onChange={(e) => setRightSeconds(Math.floor(rightSeconds / 60) * 60 + Number(e.target.value))}
                    className="text-lg p-2 border border-gray-200 rounded-lg bg-white w-16 text-center"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
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
