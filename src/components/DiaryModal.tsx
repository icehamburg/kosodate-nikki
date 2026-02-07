'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image-compressor'

type Props = {
  childId: string
  date: string
  onClose: () => void
}

export default function DiaryModal({ childId, date, onClose }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 既存の日記を取得
  useEffect(() => {
    const fetchDiary = async () => {
      const { data } = await supabase
        .from('diaries')
        .select('*')
        .eq('child_id', childId)
        .eq('date', date)
        .single()

      if (data) {
        setContent(data.content || '')
        setExistingId(data.id)
        // 1枚のみ対応（配列の最初の要素を使用）
        const urls = data.photo_urls || []
        setPhotoUrl(urls.length > 0 ? urls[0] : null)
      }
    }
    fetchDiary()
  }, [childId, date, supabase])

  // 写真アップロード（自動圧縮付き、1枚のみ）
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // 画像を圧縮（長辺1800px、画質85%）
      const compressedBlob = await compressImage(file)

      const fileName = `${childId}/${date}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

      const { error } = await supabase.storage
        .from('photos')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
        })

      if (error) {
        console.error('Upload error:', error)
        return
      }

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      setPhotoUrl(urlData.publicUrl)
    } catch (err) {
      console.error('Compression error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 写真削除
  const handleRemovePhoto = () => {
    setPhotoUrl(null)
  }

  const handleSubmit = async () => {
    setLoading(true)

    if (existingId) {
      await supabase
        .from('diaries')
        .update({
          content,
          photo_urls: photoUrl ? [photoUrl] : null,
        })
        .eq('id', existingId)
    } else {
      await supabase
        .from('diaries')
        .insert({
          child_id: childId,
          date,
          content,
          photo_urls: photoUrl ? [photoUrl] : null,
        })
    }

    setLoading(false)
    onClose()
  }

  const formattedDate = new Date(date).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] animate-slide-up max-h-[80vh] overflow-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-4xl">📝</span>
          <span className="text-lg font-semibold">{formattedDate}の日記</span>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* 日記入力 */}
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今日の出来事を書いてみよう..."
            className="w-full p-4 border border-gray-200 rounded-xl resize-none h-40 text-base leading-relaxed"
          />
        </div>

        {/* 写真プレビュー */}
        {photoUrl && (
          <div className="mb-4">
            <div className="relative inline-block">
              <img
                src={photoUrl}
                alt="今日の写真"
                className="w-32 h-32 object-cover rounded-lg"
              />
              <button
                onClick={handleRemovePhoto}
                className="absolute w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-md"
                style={{ top: '4px', right: '4px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 写真追加ボタン（1枚のみ） */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          {!photoUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 transition disabled:opacity-50"
            >
              {uploading ? '📷 アップロード中...' : '📷 今日の写真を追加'}
            </button>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSubmit}
          disabled={loading || uploading}
          className="w-full py-4 text-white rounded-xl font-semibold transition disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}
