export type Child = {
  id: string
  user_id: string
  name: string
  birthday: string
  photo_url: string | null
  created_at: string
}

export type RecordType =
  | 'milk'      // ミルク
  | 'breast'    // 母乳
  | 'baby_food' // 離乳食
  | 'snack'     // おやつ
  | 'poop'      // うんち
  | 'pee'       // おしっこ
  | 'sleep'     // 睡眠
  | 'bath'      // お風呂
  | 'walk'      // さんぽ
  | 'temperature' // 体温
  | 'medicine'  // くすり
  | 'condition' // 体調（せき・発疹・嘔吐・けが）

export type Record = {
  id: string
  child_id: string
  type: RecordType
  recorded_at: string
  value: RecordValue | null
  memo: string | null
  created_at: string
}

export type RecordValue = {
  // ミルク
  amount?: number // ml
  // 母乳
  left_minutes?: number
  right_minutes?: number
  // 睡眠
  sleep_type?: 'asleep' | 'awake' // 寝た / 起きた
  // 体温
  temperature?: number
  // 体調
  condition_type?: 'cough' | 'rash' | 'vomit' | 'injury'
}

export type Diary = {
  id: string
  child_id: string
  date: string
  content: string | null
  photo_urls: string[] | null
  created_at: string
}

export const RECORD_TYPES: { type: RecordType; emoji: string; label: string }[] = [
  { type: 'milk', emoji: '🍼', label: 'ミルク' },
  { type: 'breast', emoji: '🤱', label: '母乳' },
  { type: 'baby_food', emoji: '🍚', label: '離乳食' },
  { type: 'snack', emoji: '🍪', label: 'おやつ' },
  { type: 'poop', emoji: '💩', label: 'うんち' },
  { type: 'pee', emoji: '💧', label: 'おしっこ' },
  { type: 'sleep', emoji: '😴', label: '睡眠' },
  { type: 'bath', emoji: '🛁', label: 'お風呂' },
  { type: 'walk', emoji: '🚶', label: 'さんぽ' },
  { type: 'temperature', emoji: '🌡️', label: '体温' },
  { type: 'medicine', emoji: '💊', label: 'くすり' },
  { type: 'condition', emoji: '🤧', label: '体調' },
]
