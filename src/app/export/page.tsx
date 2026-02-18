'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Record as DiaryRecord } from '@/lib/types'
import { pdfThemes, ThemeId } from '@/lib/pdf-themes'
import { generatePdf } from '@/lib/pdf-generator'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useApp } from '@/components/AppProvider'

const themeList = Object.values(pdfThemes)
const STORAGE_KEY = 'export-settings'

type CropSettings = {
  scale: number
  offsetX: number
  offsetY: number
}

type ExportSettings = {
  selectedChildId: string
  selectedTheme: ThemeId
  startDate: string
  endDate: string
  coverPhotoBase64: string | null
  cropSettings?: CropSettings
  includeText?: boolean
  includeTimeline?: boolean
}

// 画像をBase64に変換
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ExportPage() {
  const { children, selectedChildId, setSelectedChildId } = useApp()
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('simple')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [cropSettings, setCropSettings] = useState<CropSettings>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [showCropEditor, setShowCropEditor] = useState(false)
  const [croppedPhoto, setCroppedPhoto] = useState<string | null>(null)
  const [includeText, setIncludeText] = useState(true)
  const [includeTimeline, setIncludeTimeline] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const selectedChild = children.find(c => c.id === selectedChildId)

  // 設定をローカルストレージに保存
  const saveSettings = useCallback(() => {
    if (!isInitialized) return

    const settings: ExportSettings = {
      selectedChildId,
      selectedTheme,
      startDate,
      endDate,
      coverPhotoBase64: croppedPhoto || coverPhoto,
      cropSettings,
      includeText,
      includeTimeline,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('設定の保存に失敗:', e)
    }
  }, [selectedChildId, selectedTheme, startDate, endDate, coverPhoto, croppedPhoto, cropSettings, includeText, includeTimeline, isInitialized])

  // 設定が変更されたら保存
  useEffect(() => {
    saveSettings()
  }, [saveSettings])

  // ローカルストレージからの復元（childrenはContextから取得済み）
  useEffect(() => {
    if (children.length === 0) return

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const settings: ExportSettings = JSON.parse(saved)

        // 選んだ子どもに応じて期間を設定
        const targetChild = children.find(c => c.id === selectedChildId)
        if (selectedChildId === settings.selectedChildId && settings.startDate && settings.endDate) {
          setStartDate(settings.startDate)
          setEndDate(settings.endDate)
        } else if (targetChild) {
          const birthday = new Date(targetChild.birthday)
          const oneYearLater = new Date(birthday)
          oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
          oneYearLater.setDate(oneYearLater.getDate() - 1)
          setStartDate(targetChild.birthday)
          setEndDate(oneYearLater.toISOString().split('T')[0])
        }

        setSelectedTheme(settings.selectedTheme || 'simple')
        setCoverPhoto(settings.coverPhotoBase64)
        setCroppedPhoto(settings.coverPhotoBase64)
        if (settings.cropSettings) {
          setCropSettings(settings.cropSettings)
        }
        if (settings.includeText !== undefined) setIncludeText(settings.includeText)
        if (settings.includeTimeline !== undefined) setIncludeTimeline(settings.includeTimeline)
      } else {
        // 保存された設定がない場合
        const targetChild = children.find(c => c.id === selectedChildId) || children[0]
        const birthday = new Date(targetChild.birthday)
        const oneYearLater = new Date(birthday)
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
        oneYearLater.setDate(oneYearLater.getDate() - 1)
        setStartDate(targetChild.birthday)
        setEndDate(oneYearLater.toISOString().split('T')[0])
      }
    } catch (e) {
      // パースエラーの場合はデフォルト値
      const targetChild = children.find(c => c.id === selectedChildId) || children[0]
      const birthday = new Date(targetChild.birthday)
      const oneYearLater = new Date(birthday)
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
      oneYearLater.setDate(oneYearLater.getDate() - 1)
      setStartDate(targetChild.birthday)
      setEndDate(oneYearLater.toISOString().split('T')[0])
    }

    setIsInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 表紙写真のアップロード
  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Base64に変換して保存（ローカルストレージ用）
      const base64 = await fileToBase64(file)
      setCoverPhoto(base64)
      setCroppedPhoto(null)
      setCropSettings({ scale: 1, offsetX: 0, offsetY: 0 })
      setShowCropEditor(true)
    } catch (error) {
      console.error('写真の読み込みに失敗:', error)
    }
  }

  // 表紙写真の削除
  const handleRemoveCoverPhoto = () => {
    setCoverPhoto(null)
    setCroppedPhoto(null)
    setCropSettings({ scale: 1, offsetX: 0, offsetY: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 丸形に切り抜いた画像を生成
  const generateCroppedImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!coverPhoto) {
        reject(new Error('No cover photo'))
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 600 // 出力サイズ
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Cannot get canvas context'))
          return
        }

        // 丸形のクリッピング
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()

        // 画像のアスペクト比を考慮
        const imgAspect = img.width / img.height
        let drawWidth, drawHeight

        if (imgAspect > 1) {
          // 横長画像
          drawHeight = size * cropSettings.scale
          drawWidth = drawHeight * imgAspect
        } else {
          // 縦長画像
          drawWidth = size * cropSettings.scale
          drawHeight = drawWidth / imgAspect
        }

        const x = (size - drawWidth) / 2 + cropSettings.offsetX
        const y = (size - drawHeight) / 2 + cropSettings.offsetY

        ctx.drawImage(img, x, y, drawWidth, drawHeight)

        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = coverPhoto
    })
  }, [coverPhoto, cropSettings])

  // 切り抜きを確定
  const handleCropConfirm = async () => {
    try {
      const cropped = await generateCroppedImage()
      setCroppedPhoto(cropped)
      setShowCropEditor(false)
    } catch (error) {
      console.error('切り抜きエラー:', error)
    }
  }

  // PDFダウンロード
  const handleDownload = async () => {
    if (!selectedChild) return

    setGenerating(true)
    setProgress('データを取得中...')

    try {
      const { data: diaries } = await supabase
        .from('diaries')
        .select('*')
        .eq('child_id', selectedChildId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      // タイムライン用のレコードを取得
      let records: DiaryRecord[] = []
      if (includeTimeline) {
        const startDateTime = new Date(startDate)
        startDateTime.setHours(0, 0, 0, 0)
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)

        const { data: recordsData } = await supabase
          .from('records')
          .select('*')
          .eq('child_id', selectedChildId)
          .gte('recorded_at', startDateTime.toISOString())
          .lte('recorded_at', endDateTime.toISOString())
          .order('recorded_at', { ascending: true })

        records = (recordsData || []) as DiaryRecord[]
      }

      setProgress('PDFを生成中...')

      const theme = pdfThemes[selectedTheme]
      const blob = await generatePdf({
        theme,
        childName: selectedChild.name,
        birthday: selectedChild.birthday,
        startDate,
        endDate,
        diaries: diaries || [],
        coverPhotoUrl: croppedPhoto || coverPhoto || undefined,
        includeText,
        includeTimeline,
        records,
      })

      const fileName = `${selectedChild.name}_日記_${startDate}_${endDate}.pdf`

      // Web Share API対応（iOS Safari / Capacitorで共有シートを表示）
      if (navigator.share && typeof File !== 'undefined') {
        try {
          const file = new File([blob], fileName, { type: 'application/pdf' })
          await navigator.share({
            title: fileName,
            files: [file],
          })
          setProgress('共有が完了しました！')
        } catch (shareError) {
          // ユーザーがキャンセルした場合
          if ((shareError as Error).name === 'AbortError') {
            setProgress('')
            return
          }
          // シェアが失敗した場合はフォールバック
          fallbackDownload(blob, fileName)
          setProgress('完了！')
        }
      } else {
        // Web Share API非対応の場合は従来のダウンロード
        fallbackDownload(blob, fileName)
        setProgress('完了！')
      }
    } catch (error) {
      console.error('PDF生成エラー:', error)
      setProgress('エラーが発生しました')
    } finally {
      setGenerating(false)
      setTimeout(() => setProgress(''), 3000)
    }
  }

  // 従来のダウンロード方法（フォールバック）
  const fallbackDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 推定ページ数（1ページ2日分）
  const totalDays = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0
  const estimatedPages = totalDays > 0 ? Math.ceil(totalDays / 2) + 1 : 0

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--background)' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 safe-top" style={{ background: 'var(--background)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold">PDF出力</span>
          <Link href="/settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.2304 13.5456V10.4544L22.6104 8.724C22.8427 8.43451 22.9819 8.08149 23.0098 7.71138C23.0376 7.34126 22.9528 6.97138 22.7664 6.6504L22.0176 5.3496C21.8321 5.02817 21.554 4.77013 21.2197 4.60915C20.8853 4.44817 20.5102 4.39173 20.1432 4.4472L17.9544 4.7784L15.276 3.2328L14.4696 1.1736C14.3342 0.828038 14.0978 0.53127 13.7913 0.321943C13.4848 0.112616 13.1224 0.000432 12.7512 0H11.2488C10.8777 0.000432 10.5152 0.112616 10.2087 0.321943C9.90223 0.53127 9.66586 0.828038 9.53041 1.1736L8.72401 3.2328L6.04561 4.7784L3.85681 4.4472C3.48987 4.39173 3.11473 4.44817 2.78036 4.60915C2.44598 4.77013 2.1679 5.02817 1.98241 5.3496L1.23361 6.6504C1.04725 6.97138 0.962414 7.34126 0.990259 7.71138C1.0181 8.08149 1.15732 8.43451 1.38961 8.724L2.76961 10.4544V13.5456L1.38961 15.276C1.15732 15.5655 1.0181 15.9185 0.990259 16.2886C0.962414 16.6587 1.04725 17.0286 1.23361 17.3496L1.98241 18.6504C2.1679 18.9718 2.44598 19.2299 2.78036 19.3909C3.11473 19.5518 3.48987 19.6083 3.85681 19.5528L6.04561 19.2216L8.72401 20.7672L9.53041 22.8264C9.66586 23.172 9.90223 23.4687 10.2087 23.6781C10.5152 23.8874 10.8777 23.9996 11.2488 24H12.7512C13.1224 23.9996 13.4848 23.8874 13.7913 23.6781C14.0978 23.4687 14.3342 23.172 14.4696 22.8264L15.276 20.7672L17.9544 19.2216L20.1432 19.5528C20.5102 19.6083 20.8853 19.5518 21.2197 19.3909C21.554 19.2299 21.8321 18.9718 22.0176 18.6504L22.7664 17.3496C22.9528 17.0286 23.0376 16.6587 23.0098 16.2886C22.9819 15.9185 22.8427 15.5655 22.6104 15.276L21.2304 13.5456ZM12 15.6C11.5273 15.6 11.0591 15.5069 10.6224 15.326C10.1856 15.145 9.78872 14.8799 9.45443 14.5456C9.12014 14.2113 8.85496 13.8144 8.67405 13.3777C8.49313 12.9409 8.40001 12.4728 8.40001 12C8.40001 11.5272 8.49313 11.0591 8.67405 10.6223C8.85496 10.1856 9.12014 9.78871 9.45443 9.45442C9.78872 9.12012 10.1856 8.85495 10.6224 8.67403C11.0591 8.49312 11.5273 8.4 12 8.4C12.9548 8.4 13.8705 8.77928 14.5456 9.45442C15.2207 10.1295 15.6 11.0452 15.6 12C15.6 12.9548 15.2207 13.8705 14.5456 14.5456C13.8705 15.2207 12.9548 15.6 12 15.6Z" fill="var(--color-icon-active)" />
              </svg>
            </Link>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 子ども選択 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            お子さまを選択
          </label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full p-3 shadow-sm rounded-xl"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 期間選択 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            出力期間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 p-3 shadow-sm rounded-xl"
              style={{ backgroundColor: 'var(--color-card)' }}
            />
            <span className="text-gray-400">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 p-3 shadow-sm rounded-xl"
              style={{ backgroundColor: 'var(--color-card)' }}
            />
          </div>
        </div>

        {/* 表紙写真 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            表紙の写真（任意・丸形に切り抜き）
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverPhotoUpload}
            className="hidden"
          />
          {croppedPhoto || coverPhoto ? (
            <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="flex flex-col items-center gap-4">
                {/* 丸形プレビュー */}
                <div
                  className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200"
                  style={{
                    backgroundImage: `url(${croppedPhoto || coverPhoto})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCropEditor(true)}
                    className="px-4 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    調整する
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600"
                  >
                    変更
                  </button>
                  <button
                    onClick={handleRemoveCoverPhoto}
                    className="px-4 py-2 text-sm rounded-lg bg-red-50 text-red-500"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:bg-gray-50 transition"
            >
              📷 写真を選択
            </button>
          )}
        </div>

        {/* テーマ選択 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            デザインテーマ
          </label>
          <div className="grid grid-cols-2 gap-3">
            {themeList.map(theme => {
              const previewBg = theme.id === 'simple' ? '#f5f5f5' :
                               theme.id === 'natural' ? '#f5f0e8' :
                               theme.id === 'pastelPink' ? '#ffe4e8' : '#d4e8f7'
              const previewAccent = theme.cover.nameColor

              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className="p-4 rounded-xl border-2 transition text-left"
                  style={selectedTheme === theme.id
                    ? { borderColor: '#D97757', backgroundColor: '#EDE0CF' }
                    : { borderColor: '#e5e7eb', backgroundColor: 'white' }}
                >
                  <div
                    className="w-full h-16 rounded-lg mb-2 flex items-center justify-center"
                    style={{ background: previewBg }}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ background: previewAccent }}
                    />
                  </div>
                  <div className="font-semibold text-sm">{theme.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 含める内容 */}
        <div>
          <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            含める内容
          </label>
          <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ backgroundColor: 'var(--color-card)' }}>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked disabled className="w-5 h-5 rounded" />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>写真（常に含む）</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeText}
                onChange={(e) => setIncludeText(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>日記テキスト</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeTimeline}
                onChange={(e) => setIncludeTimeline(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>タイムライン</span>
            </label>
            <p className="text-xs mt-1 pl-1" style={{ color: 'var(--color-text-muted)' }}>
              ※絵文字など特殊文字は反映されない場合があります
            </p>
          </div>
        </div>

        {/* プレビュー情報 */}
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>出力内容</div>
          <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex justify-between">
              <span>お名前</span>
              <span className="font-medium">{selectedChild?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>テーマ</span>
              <span className="font-medium">{pdfThemes[selectedTheme].name}</span>
            </div>
            <div className="flex justify-between">
              <span>期間</span>
              <span className="font-medium">
                {startDate && endDate ? `${startDate} 〜 ${endDate}` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>推定ページ数</span>
              <span className="font-medium">約{estimatedPages}ページ（表紙含む）</span>
            </div>
            <div className="flex justify-between">
              <span>表紙写真</span>
              <span className="font-medium">{coverPhoto ? 'あり' : 'なし'}</span>
            </div>
            <div className="flex justify-between">
              <span>日記テキスト</span>
              <span className="font-medium">{includeText ? '含む' : '含まない'}</span>
            </div>
            <div className="flex justify-between">
              <span>タイムライン</span>
              <span className="font-medium">{includeTimeline ? '含む' : '含まない'}</span>
            </div>
          </div>
        </div>

        {/* 進捗表示 */}
        {progress && (
          <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-center text-sm">
            {progress}
          </div>
        )}

        {/* ボタン */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={generating || !selectedChildId}
            className="w-full py-4 text-white rounded-xl font-semibold transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {generating ? '生成中...' : 'PDFをダウンロード'}
          </button>
        </div>
      </div>

      {/* 切り抜きエディターモーダル */}
      {showCropEditor && coverPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl w-full max-w-md overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="p-4 border-b">
              <span className="font-semibold">写真の調整</span>
            </div>
            <div className="p-4">
              {/* プレビューエリア */}
              <div className="relative w-64 h-64 mx-auto mb-4">
                {/* 丸形の枠 */}
                <div
                  className="absolute inset-0 rounded-full border-4 border-dashed z-10 pointer-events-none"
                  style={{ borderColor: '#D97757' }}
                />
                {/* 画像表示（クリップなし、位置調整可能） */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden"
                  style={{
                    backgroundImage: `url(${coverPhoto})`,
                    backgroundSize: `${cropSettings.scale * 100}%`,
                    backgroundPosition: `calc(50% + ${cropSettings.offsetX}px) calc(50% + ${cropSettings.offsetY}px)`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              </div>

              {/* スケールスライダー */}
              <div className="mb-4">
                <label className="text-sm text-gray-600 block mb-2">
                  拡大・縮小: {Math.round(cropSettings.scale * 100)}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={cropSettings.scale * 100}
                  onChange={(e) => setCropSettings(prev => ({ ...prev, scale: Number(e.target.value) / 100 }))}
                  className="w-full"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
              </div>

              {/* 位置調整 */}
              <div className="mb-4">
                <label className="text-sm text-gray-600 block mb-2">位置調整</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">左右</span>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={cropSettings.offsetX}
                      onChange={(e) => setCropSettings(prev => ({ ...prev, offsetX: Number(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">上下</span>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={cropSettings.offsetY}
                      onChange={(e) => setCropSettings(prev => ({ ...prev, offsetY: Number(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* リセットボタン */}
              <button
                onClick={() => setCropSettings({ scale: 1, offsetX: 0, offsetY: 0 })}
                className="w-full py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg mb-4"
              >
                リセット
              </button>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowCropEditor(false)}
                className="flex-1 py-3 border-2 rounded-xl font-semibold"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCropConfirm}
                className="flex-1 py-3 text-white rounded-xl font-semibold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav current="export" />
    </div>
  )
}
