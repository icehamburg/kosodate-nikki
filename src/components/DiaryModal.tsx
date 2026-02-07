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
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
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
        setPhotoUrls(data.photo_urls || [])
      }
    }
    fetchDiary()
  }, [childId, date, supabase])

  // 写真アップロード（自動圧縮付き）
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    const newUrls: string[] = []

    for (const file of Array.from(files)) {
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
          continue
        }

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName)

        newUrls.push(urlData.publicUrl)
      } catch (err) {
        console.error('Compression error:', err)
      }
    }

    setPhotoUrls(prev => [...prev, ...newUrls])
    setUploading(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 写真削除
  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setLoading(true)

    if (existingId) {
      await supabase
        .from('diaries')
        .update({
          content,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
        })
        .eq('id', existingId)
    } else {
      await supabase
        .from('diaries')
        .insert({
          child_id: childId,
          date,
          content,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
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
        {photoUrls.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative flex-shrink-0 w-24 h-24">
                  <img
                    src={url}
                    alt={`写真${i + 1}`}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-md"
                    style={{ top: '4px', right: '4px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 写真追加ボタン */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 transition disabled:opacity-50"
          >
            {uploading ? '📷 アップロード中...' : `📷 写真を追加${photoUrls.length > 0 ? `（${photoUrls.length}枚）` : ''}`}
          </button>
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
