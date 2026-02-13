'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Child } from '@/lib/types'
import { pdfThemes, ThemeId } from '@/lib/pdf-themes'
import { generatePdf } from '@/lib/pdf-generator'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('simple')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [cropSettings, setCropSettings] = useState<CropSettings>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [showCropEditor, setShowCropEditor] = useState(false)
  const [croppedPhoto, setCroppedPhoto] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

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
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('設定の保存に失敗:', e)
    }
  }, [selectedChildId, selectedTheme, startDate, endDate, coverPhoto, croppedPhoto, cropSettings, isInitialized])

  // 設定が変更されたら保存
  useEffect(() => {
    saveSettings()
  }, [saveSettings])

  // 初期データ取得とローカルストレージからの復元
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

        // ローカルストレージから設定を復元
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const settings: ExportSettings = JSON.parse(saved)

            // 子どもが存在するか確認
            const childExists = data.some(c => c.id === settings.selectedChildId)
            if (childExists) {
              setSelectedChildId(settings.selectedChildId)
              setStartDate(settings.startDate)
              setEndDate(settings.endDate)
            } else {
              // 存在しない場合はデフォルト値
              setSelectedChildId(data[0].id)
              const birthday = new Date(data[0].birthday)
              const oneYearLater = new Date(birthday)
              oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
              oneYearLater.setDate(oneYearLater.getDate() - 1)
              setStartDate(data[0].birthday)
              setEndDate(oneYearLater.toISOString().split('T')[0])
            }

            setSelectedTheme(settings.selectedTheme || 'simple')
            setCoverPhoto(settings.coverPhotoBase64)
            setCroppedPhoto(settings.coverPhotoBase64) // 保存されている画像は切り抜き済み
            if (settings.cropSettings) {
              setCropSettings(settings.cropSettings)
            }
          } else {
            // 保存された設定がない場合はデフォルト値
            setSelectedChildId(data[0].id)
            const birthday = new Date(data[0].birthday)
            const oneYearLater = new Date(birthday)
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
            oneYearLater.setDate(oneYearLater.getDate() - 1)
            setStartDate(data[0].birthday)
            setEndDate(oneYearLater.toISOString().split('T')[0])
          }
        } catch (e) {
          // パースエラーの場合はデフォルト値
          setSelectedChildId(data[0].id)
          const birthday = new Date(data[0].birthday)
          const oneYearLater = new Date(birthday)
          oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
          oneYearLater.setDate(oneYearLater.getDate() - 1)
          setStartDate(data[0].birthday)
          setEndDate(oneYearLater.toISOString().split('T')[0])
        }

        setIsInitialized(true)
      }
    }
    fetchData()
  }, [supabase, router])

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
    setProgress('PDFを生成中...')

    try {
      const { data: diaries } = await supabase
        .from('diaries')
        .select('*')
        .eq('child_id', selectedChildId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      const theme = pdfThemes[selectedTheme]
      const blob = await generatePdf({
        theme,
        childName: selectedChild.name,
        birthday: selectedChild.birthday,
        startDate,
        endDate,
        diaries: diaries || [],
        coverPhotoUrl: croppedPhoto || coverPhoto || undefined,
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

  // 推定ページ数（1ページ4日分）
  const estimatedPages = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 4)) + 1
    : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-semibold">📄 PDF出力</span>
          <Link href="/settings" className="text-2xl">⚙️</Link>
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
            className="w-full p-3 bg-white border border-gray-200 rounded-xl"
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
              className="flex-1 p-3 bg-white border border-gray-200 rounded-xl"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 p-3 bg-white border border-gray-200 rounded-xl"
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
            <div className="bg-white rounded-xl p-4 shadow-sm">
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
                    style={{ borderColor: '#D97757', color: '#D97757' }}
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
                    ? { borderColor: '#D97757', backgroundColor: '#FDF4F1' }
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

        {/* プレビュー情報 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-3">出力内容</div>
          <div className="space-y-2 text-sm text-gray-600">
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
            style={{ backgroundColor: '#D97757' }}
          >
            {generating ? '生成中...' : 'PDFをダウンロード'}
          </button>
        </div>
      </div>

      {/* 切り抜きエディターモーダル */}
      {showCropEditor && coverPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
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
                  style={{ accentColor: '#D97757' }}
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
                      style={{ accentColor: '#D97757' }}
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
                      style={{ accentColor: '#D97757' }}
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
                style={{ borderColor: '#D97757', color: '#D97757' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCropConfirm}
                className="flex-1 py-3 text-white rounded-xl font-semibold"
                style={{ backgroundColor: '#D97757' }}
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
