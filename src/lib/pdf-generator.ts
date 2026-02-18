import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { PdfTheme } from './pdf-themes'
import { Diary, Record as DiaryRecord, RECORD_TYPES } from './types'

// ===== ページサイズ設定 =====
type PageSizeId = 'a4' | 'a5'

const PAGE_SIZES: { [key in PageSizeId]: { width: number; height: number; margin: number } } = {
  a4: { width: 595.28, height: 841.89, margin: 42.52 },   // 210×297mm, 余白15mm
  a5: { width: 419.53, height: 595.28, margin: 35.43 },   // 148×210mm, 余白12.5mm
}

const ENTRIES_PER_PAGE = 2

type PdfOptions = {
  theme: PdfTheme
  childName: string
  birthday: string
  startDate: string
  endDate: string
  diaries: Diary[]
  coverPhotoUrl?: string
  pageSize?: PageSizeId
  includeText?: boolean
  includeTimeline?: boolean
  records?: DiaryRecord[]
}

// 日付フォーマット
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
}

// 生後日数
const getDaysOld = (birthday: string, date: string) => {
  const birth = new Date(birthday)
  const d = new Date(date)
  return Math.floor((d.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
}

// 日付の範囲を生成
const getDateRange = (start: string, end: string): string[] => {
  const dates: string[] = []
  const current = new Date(start)
  const endDate = new Date(end)

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// Base64 Data URLをUint8Arrayに変換
const base64ToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// 画像をUint8Arrayに変換（EXIF orientationを適用）
const loadImageAsBytes = async (url: string): Promise<{ bytes: Uint8Array; isVertical: boolean } | null> => {
  try {
    let bytes: Uint8Array

    // Base64 Data URLの場合は直接変換
    if (url.startsWith('data:')) {
      bytes = base64ToUint8Array(url)
      return { bytes, isVertical: false }
    }

    // 通常のURLの場合はfetchで取得
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    bytes = new Uint8Array(arrayBuffer)

    // EXIF orientationを読み取る（簡易版）
    const orientation = getExifOrientation(bytes)
    const isVertical = orientation >= 5 && orientation <= 8

    // Canvas で EXIF 補正した画像を生成
    const correctedBytes = await correctImageOrientation(url)

    return { bytes: correctedBytes || bytes, isVertical }
  } catch (e) {
    console.error('画像読み込みエラー:', e)
    return null
  }
}

// EXIF orientation を取得（JPEG用）
const getExifOrientation = (bytes: Uint8Array): number => {
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1

  let offset = 2
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xFF) break
    const marker = bytes[offset + 1]

    if (marker === 0xE1) {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3]
      if (bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 &&
          bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66) {
        const tiffOffset = offset + 10
        const littleEndian = bytes[tiffOffset] === 0x49

        const ifdOffset = tiffOffset + (littleEndian
          ? (bytes[tiffOffset + 4] | (bytes[tiffOffset + 5] << 8) | (bytes[tiffOffset + 6] << 16) | (bytes[tiffOffset + 7] << 24))
          : ((bytes[tiffOffset + 4] << 24) | (bytes[tiffOffset + 5] << 16) | (bytes[tiffOffset + 6] << 8) | bytes[tiffOffset + 7]))

        const numEntries = littleEndian
          ? (bytes[tiffOffset + ifdOffset] | (bytes[tiffOffset + ifdOffset + 1] << 8))
          : ((bytes[tiffOffset + ifdOffset] << 8) | bytes[tiffOffset + ifdOffset + 1])

        for (let i = 0; i < numEntries; i++) {
          const entryOffset = tiffOffset + ifdOffset + 2 + (i * 12)
          const tag = littleEndian
            ? (bytes[entryOffset] | (bytes[entryOffset + 1] << 8))
            : ((bytes[entryOffset] << 8) | bytes[entryOffset + 1])

          if (tag === 0x0112) {
            const value = littleEndian
              ? (bytes[entryOffset + 8] | (bytes[entryOffset + 9] << 8))
              : ((bytes[entryOffset + 8] << 8) | bytes[entryOffset + 9])
            return value
          }
        }
      }
      offset += 2 + length
    } else if (marker === 0xD9 || marker === 0xDA) {
      break
    } else {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3]
      offset += 2 + length
    }
  }
  return 1
}

// Canvas を使って EXIF orientation を適用した画像を生成
const correctImageOrientation = async (url: string): Promise<Uint8Array | null> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        blob.arrayBuffer().then(ab => resolve(new Uint8Array(ab)))
      }, 'image/jpeg', 0.9)
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// HEXをRGBに変換 (0-1の範囲)
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }
}

// 日本語フォントをロード
const loadJapaneseFont = async (): Promise<ArrayBuffer> => {
  const response = await fetch('/fonts/NotoSansJP-Regular.ttf')
  return response.arrayBuffer()
}

// ===== 画像埋め込みヘルパー =====
async function embedImage(
  pdfDoc: PDFDocument,
  url: string,
  imgResult: { bytes: Uint8Array; isVertical: boolean }
) {
  if (url.toLowerCase().includes('.png') || url.startsWith('data:image/png')) {
    return pdfDoc.embedPng(imgResult.bytes)
  }
  return pdfDoc.embedJpg(imgResult.bytes)
}

// ===== タイムライン1行フォーマット =====
function formatRecordForPdf(record: DiaryRecord): string {
  const d = new Date(record.recorded_at)
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  const typeInfo = RECORD_TYPES.find(r => r.type === record.type)
  let label = typeInfo?.label || record.type
  let detail = ''

  if (record.type === 'sleep' && record.value?.sleep_type) {
    label = record.value.sleep_type === 'asleep' ? '寝た' : '起きた'
  } else if (record.type === 'milk' && record.value?.amount) {
    detail = `${record.value.amount}ml`
  } else if (record.type === 'temperature' && record.value?.temperature) {
    detail = `${record.value.temperature}度`
  } else if (record.type === 'breast') {
    const left = record.value?.left_minutes
    const right = record.value?.right_minutes
    if (left || right) detail = `左${left || 0}分 右${right || 0}分`
  } else if (record.type === 'condition' && record.value?.condition_type) {
    const condLabels: { [key: string]: string } = {
      cough: 'せき', rash: '発疹', vomit: '嘔吐', injury: 'けが'
    }
    detail = condLabels[record.value.condition_type] || ''
  }

  const parts = [time, label]
  if (detail) parts.push(detail)
  if (record.memo) parts.push(record.memo)
  return parts.join('  ')
}

// ===== PDF生成メイン =====
export async function generatePdf(options: PdfOptions): Promise<Blob> {
  const { theme, childName, birthday, startDate, endDate, diaries, coverPhotoUrl } = options
  const size = PAGE_SIZES[options.pageSize || 'a4']
  const contentWidth = size.width - size.margin * 2
  const includeText = options.includeText !== false
  const includeTimeline = options.includeTimeline || false

  // PDF作成
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // 日本語フォントを読み込んで埋め込む
  const fontBytes = await loadJapaneseFont()
  const japaneseFont = await pdfDoc.embedFont(fontBytes)

  // 日記をMapに変換
  const diaryMap = new Map<string, Diary>()
  diaries.forEach(d => diaryMap.set(d.date, d))

  // レコードを日付ごとのMapに変換
  const recordsByDate = new Map<string, DiaryRecord[]>()
  if (includeTimeline && options.records) {
    for (const r of options.records) {
      const dateKey = new Date(r.recorded_at).toISOString().split('T')[0]
      if (!recordsByDate.has(dateKey)) recordsByDate.set(dateKey, [])
      recordsByDate.get(dateKey)!.push(r)
    }
  }

  // ===== 表紙 =====
  const coverPage = pdfDoc.addPage([size.width, size.height])

  // 背景色
  const coverBg = theme.cover.background
  if (coverBg.startsWith('#')) {
    const { r, g, b } = hexToRgb(coverBg)
    coverPage.drawRectangle({
      x: 0, y: 0,
      width: size.width, height: size.height,
      color: rgb(r, g, b),
    })
  } else {
    coverPage.drawRectangle({
      x: 0, y: 0,
      width: size.width, height: size.height,
      color: rgb(0.98, 0.97, 0.96),
    })
  }

  // 表紙写真があれば配置（丸形で表示）
  let nameYOffset = 20
  if (coverPhotoUrl) {
    const imgResult = await loadImageAsBytes(coverPhotoUrl)
    if (imgResult) {
      try {
        const image = await embedImage(pdfDoc, coverPhotoUrl, imgResult)

        const circleSize = 200
        const photoX = (size.width - circleSize) / 2
        const photoY = size.height - size.margin - circleSize - 80

        const scaledDims = image.scaleToFit(circleSize, circleSize)
        const centeredX = photoX + (circleSize - scaledDims.width) / 2
        const centeredY = photoY + (circleSize - scaledDims.height) / 2

        coverPage.drawImage(image, {
          x: centeredX, y: centeredY,
          width: scaledDims.width, height: scaledDims.height,
        })

        nameYOffset = -(size.height / 2 - photoY + 60)
      } catch (e) {
        console.error('表紙写真の埋め込みエラー:', e)
      }
    }
  }

  // 名前（中央）
  const nameColor = hexToRgb(theme.cover.nameColor)
  const nameSize = 36
  const safeChildName = safeText(childName, japaneseFont)
  const nameWidth = japaneseFont.widthOfTextAtSize(safeChildName, nameSize)
  coverPage.drawText(safeChildName, {
    x: (size.width - nameWidth) / 2,
    y: size.height / 2 + nameYOffset,
    size: nameSize,
    font: japaneseFont,
    color: rgb(nameColor.r, nameColor.g, nameColor.b),
  })

  // サブタイトル
  const subColor = hexToRgb(theme.cover.subColor)
  const subText = `${startDate} - ${endDate}`
  const subSize = 14
  const subWidth = japaneseFont.widthOfTextAtSize(subText, subSize)
  coverPage.drawText(subText, {
    x: (size.width - subWidth) / 2,
    y: size.height / 2 + nameYOffset - 40,
    size: subSize,
    font: japaneseFont,
    color: rgb(subColor.r, subColor.g, subColor.b),
  })

  // ===== 本文 =====
  const dates = getDateRange(startDate, endDate)
  const entryHeight = (size.height - size.margin * 2) / ENTRIES_PER_PAGE

  // 2日ずつページにする
  for (let i = 0; i < dates.length; i += ENTRIES_PER_PAGE) {
    const contentPage = pdfDoc.addPage([size.width, size.height])

    // 背景色
    const bgColor = theme.content.background
    if (bgColor.startsWith('#')) {
      const { r, g, b } = hexToRgb(bgColor)
      contentPage.drawRectangle({
        x: 0, y: 0,
        width: size.width, height: size.height,
        color: rgb(r, g, b),
      })
    }

    const borderColor = hexToRgb(theme.content.borderColor)

    for (let j = 0; j < ENTRIES_PER_PAGE && (i + j) < dates.length; j++) {
      const entryTopY = size.height - size.margin - (j * entryHeight)
      const dateKey = dates[i + j]

      await renderDayEntry(
        pdfDoc,
        contentPage,
        japaneseFont,
        theme,
        dateKey,
        birthday,
        diaryMap.get(dateKey),
        recordsByDate.get(dateKey),
        size.margin,
        entryTopY,
        contentWidth,
        entryHeight - 10,
        includeText,
        includeTimeline,
      )

      // 区切り線（最後のエントリ以外）
      if (j < ENTRIES_PER_PAGE - 1 && (i + j + 1) < dates.length) {
        const lineY = entryTopY - entryHeight
        contentPage.drawLine({
          start: { x: size.margin, y: lineY },
          end: { x: size.width - size.margin, y: lineY },
          thickness: 0.5,
          color: rgb(borderColor.r, borderColor.g, borderColor.b),
        })
      }
    }
  }

  // PDFをBlobとして出力
  const pdfBytes = await pdfDoc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}

// ===== 1日分のエントリ描画 =====
async function renderDayEntry(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  theme: PdfTheme,
  date: string,
  birthday: string,
  diary: Diary | undefined,
  records: DiaryRecord[] | undefined,
  x: number,
  y: number,
  contentWidth: number,
  maxHeight: number,
  includeText: boolean,
  includeTimeline: boolean,
) {
  const daysOld = getDaysOld(birthday, date)
  const dateColor = hexToRgb(theme.content.dateColor)
  const dayCountColor = hexToRgb(theme.content.dayCountColor)
  const textColor = hexToRgb(theme.content.textColor)

  // ===== 日付ヘッダー =====
  const dateText = formatDate(date)
  page.drawText(dateText, {
    x,
    y: y - 14,
    size: 13,
    font,
    color: rgb(dateColor.r, dateColor.g, dateColor.b),
  })

  const dayCountText = `生後 ${daysOld}日目`
  const dateWidth = font.widthOfTextAtSize(dateText, 13)
  page.drawText(dayCountText, {
    x: x + dateWidth + 10,
    y: y - 14,
    size: 9,
    font,
    color: rgb(dayCountColor.r, dayCountColor.g, dayCountColor.b),
  })

  let currentY = y - 28
  const bottomLimit = y - maxHeight

  // ===== スペース配分計算 =====
  const totalAvailable = currentY - bottomLimit  // ヘッダー後の残り高さ
  // テキストに必要な最小高さ (3行分)
  const minTextHeight = includeText && diary?.content ? 48 : 0
  // タイムラインに必要な最小高さ (ラベル + 3行分)
  const minTimelineHeight = includeTimeline && records && records.length > 0 ? 50 : 0
  // 写真の最大高さをテキスト・タイムラインの分を確保した残りから決める
  const photoAreaMaxHeight = Math.max(
    80, // 最低でも80ptは写真に使う
    Math.min(220, totalAvailable - minTextHeight - minTimelineHeight - 10)
  )

  // ===== 写真エリア（全写真・大きく） =====
  if (diary?.photo_urls && diary.photo_urls.length > 0) {
    const photos = diary.photo_urls.slice(0, 4) // 最大4枚
    const gap = 6

    if (photos.length === 1) {
      // 1枚: 大きく表示
      const imgResult = await loadImageAsBytes(photos[0])
      if (imgResult) {
        try {
          const image = await embedImage(pdfDoc, photos[0], imgResult)
          const scaled = image.scaleToFit(contentWidth, photoAreaMaxHeight)
          page.drawImage(image, {
            x,
            y: currentY - scaled.height,
            width: scaled.width,
            height: scaled.height,
          })
          currentY -= scaled.height + 8
        } catch (e) {
          console.error('画像の埋め込みエラー:', e)
        }
      }
    } else if (photos.length <= 3) {
      // 2-3枚: 横並び
      const photoWidth = (contentWidth - gap * (photos.length - 1)) / photos.length
      const photoHeight = Math.min(photoAreaMaxHeight, photoWidth)
      let maxActualHeight = 0

      for (let idx = 0; idx < photos.length; idx++) {
        const imgResult = await loadImageAsBytes(photos[idx])
        if (imgResult) {
          try {
            const image = await embedImage(pdfDoc, photos[idx], imgResult)
            const scaled = image.scaleToFit(photoWidth, photoHeight)
            const photoX = x + idx * (photoWidth + gap) + (photoWidth - scaled.width) / 2
            page.drawImage(image, {
              x: photoX,
              y: currentY - scaled.height,
              width: scaled.width,
              height: scaled.height,
            })
            if (scaled.height > maxActualHeight) maxActualHeight = scaled.height
          } catch (e) {
            console.error('画像の埋め込みエラー:', e)
          }
        }
      }
      currentY -= maxActualHeight + 8
    } else {
      // 4枚: 2×2グリッド
      const cellWidth = (contentWidth - gap) / 2
      const cellHeight = Math.min((photoAreaMaxHeight - gap) / 2, cellWidth * 0.75)

      for (let idx = 0; idx < photos.length; idx++) {
        const row = Math.floor(idx / 2)
        const col = idx % 2
        const imgResult = await loadImageAsBytes(photos[idx])
        if (imgResult) {
          try {
            const image = await embedImage(pdfDoc, photos[idx], imgResult)
            const scaled = image.scaleToFit(cellWidth, cellHeight)
            const cellX = x + col * (cellWidth + gap) + (cellWidth - scaled.width) / 2
            const cellY = currentY - row * (cellHeight + gap) - scaled.height
            page.drawImage(image, {
              x: cellX,
              y: cellY + (cellHeight - scaled.height) / 2,
              width: scaled.width,
              height: scaled.height,
            })
          } catch (e) {
            console.error('画像の埋め込みエラー:', e)
          }
        }
      }
      currentY -= 2 * cellHeight + gap + 8
    }
  }

  // ===== 日記テキスト =====
  if (includeText && diary?.content) {
    const cleanContent = safeText(diary.content, font)
    if (cleanContent.trim()) {
      const fontSize = 9.5
      const lineHeight = 14
      // タイムライン用にスペースを残す
      const reserveForTimeline = includeTimeline && records && records.length > 0 ? 50 : 0
      const remainingForText = currentY - bottomLimit - reserveForTimeline
      const maxLines = Math.max(0, Math.min(Math.floor(remainingForText / lineHeight), 8))

      if (maxLines > 0) {
        const lines = wrapText(cleanContent, font, fontSize, contentWidth)
        const displayLines = lines.slice(0, maxLines)

        displayLines.forEach((line, index) => {
          if (line.trim()) {
            page.drawText(line, {
              x,
              y: currentY - 4 - (index * lineHeight),
              size: fontSize,
              font,
              color: rgb(textColor.r, textColor.g, textColor.b),
            })
          }
        })
        currentY -= displayLines.length * lineHeight + 6
      }
    }
  }

  // ===== タイムライン =====
  if (includeTimeline && records && records.length > 0) {
    const remainingBeforeTimeline = currentY - bottomLimit
    // 最低でも2行分(22pt)のスペースがないとスキップ
    if (remainingBeforeTimeline >= 22) {
      const recordFontSize = 8
      const recordLineHeight = 11
      const remainingForTimeline = currentY - bottomLimit
      const maxRecordLines = Math.max(0, Math.min(Math.floor(remainingForTimeline / recordLineHeight), 15))

      const formattedRecords = records.map(r => safeText(formatRecordForPdf(r), font))
      const displayRecords = formattedRecords.slice(0, maxRecordLines)

      displayRecords.forEach((line, index) => {
        if (line.trim()) {
          page.drawText(line, {
            x: x + 4,
            y: currentY - (index * recordLineHeight),
            size: recordFontSize,
            font,
            color: rgb(textColor.r, textColor.g, textColor.b),
          })
        }
      })

      // 表示しきれなかった場合「他 N件」を表示
      if (formattedRecords.length > maxRecordLines && maxRecordLines > 0) {
        const moreCount = formattedRecords.length - maxRecordLines
        const moreText = `... 他 ${moreCount}件`
        page.drawText(moreText, {
          x: x + 4,
          y: currentY - (maxRecordLines * recordLineHeight),
          size: 7,
          font,
          color: rgb(dayCountColor.r, dayCountColor.g, dayCountColor.b),
        })
      }
    }
  }
}

// ===== 絵文字・特殊文字除去 =====
function removeEmoji(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/[\u{2103}]/gu, '度')   // ℃ → 度
    .replace(/[\u{2109}]/gu, '')      // ℉
    .replace(/[\u{00B0}]/gu, '')      // °
    .replace(/[\u{203C}\u{2049}]/gu, '') // ‼ ⁉
    .replace(/[\u{2122}\u{2139}]/gu, '') // ™ ℹ
    .replace(/[\u{2194}-\u{21AA}]/gu, '') // 矢印系
    .replace(/[\u{231A}-\u{23F3}]/gu, '') // ⌚⌛系
    .replace(/[\u{25AA}-\u{25FE}]/gu, '') // ▪▫系
    .replace(/[\u{2934}-\u{2935}]/gu, '') // ⤴⤵
    .replace(/[\u{3030}\u{303D}]/gu, '')  // 〰〽
    .replace(/[\u{3297}\u{3299}]/gu, '')  // ㊗㊙
}

// ===== フォントで描画可能かチェックして安全なテキストを返す =====
function safeText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
): string {
  const cleaned = removeEmoji(text)
  // 1文字ずつチェックして、フォントが扱えない文字を除去
  let safe = ''
  for (const char of cleaned) {
    try {
      font.widthOfTextAtSize(char, 10)
      safe += char
    } catch {
      // フォントに含まれない文字はスキップ
    }
  }
  return safe
}

// ===== テキスト折り返し =====
function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('')
      continue
    }

    let currentLine = ''
    const chars = paragraph.split('')

    for (const char of chars) {
      const testLine = currentLine + char
      try {
        const width = font.widthOfTextAtSize(testLine, fontSize)
        if (width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = char
        } else {
          currentLine = testLine
        }
      } catch {
        // フォントが扱えない文字はスキップ
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}
