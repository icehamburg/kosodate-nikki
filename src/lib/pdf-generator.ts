import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { PdfTheme } from './pdf-themes'
import { Diary } from './types'

type PdfOptions = {
  theme: PdfTheme
  childName: string
  birthday: string
  startDate: string
  endDate: string
  diaries: Diary[]
  coverPhotoUrl?: string // 表紙写真のURL
}

// A4サイズ (pt) - pdf-libはポイント単位
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 42.52 // 15mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

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
      // Data URLはすでに処理済みなので、そのまま返す
      return { bytes, isVertical: false }
    }

    // 通常のURLの場合はfetchで取得
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    bytes = new Uint8Array(arrayBuffer)

    // EXIF orientationを読み取る（簡易版）
    const orientation = getExifOrientation(bytes)
    // orientation 5,6,7,8 は縦向き（90度/270度回転）
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
  // JPEG SOI marker check
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1

  let offset = 2
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xFF) break
    const marker = bytes[offset + 1]

    // APP1 marker (EXIF)
    if (marker === 0xE1) {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3]
      // Check for "Exif\0\0"
      if (bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 &&
          bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66) {
        const tiffOffset = offset + 10
        const littleEndian = bytes[tiffOffset] === 0x49

        // Find IFD0
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

          // Orientation tag (0x0112)
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
      break // EOI or SOS
    } else {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3]
      offset += 2 + length
    }
  }
  return 1 // default orientation
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

export async function generatePdf(options: PdfOptions): Promise<Blob> {
  const { theme, childName, birthday, startDate, endDate, diaries, coverPhotoUrl } = options

  // PDF作成
  const pdfDoc = await PDFDocument.create()

  // fontkitを登録（カスタムフォント用）
  pdfDoc.registerFontkit(fontkit)

  // 日本語フォントを読み込んで埋め込む
  const fontBytes = await loadJapaneseFont()
  const japaneseFont = await pdfDoc.embedFont(fontBytes)

  // 日記をMapに変換
  const diaryMap = new Map<string, Diary>()
  diaries.forEach(d => diaryMap.set(d.date, d))

  // ===== 表紙 =====
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  // 背景色
  const coverBg = theme.cover.background
  if (coverBg.startsWith('#')) {
    const { r, g, b } = hexToRgb(coverBg)
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(r, g, b),
    })
  } else {
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(0.98, 0.97, 0.96),
    })
  }

  // 表紙写真があれば配置（丸形で表示）
  let nameYOffset = 20
  if (coverPhotoUrl) {
    const imgResult = await loadImageAsBytes(coverPhotoUrl)
    if (imgResult) {
      try {
        let image
        // data:image/pngの場合もPNGとして扱う
        if (coverPhotoUrl.toLowerCase().includes('.png') || coverPhotoUrl.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(imgResult.bytes)
        } else {
          image = await pdfDoc.embedJpg(imgResult.bytes)
        }

        // 丸形の写真サイズ（直径200pt = 約70mm）
        const circleSize = 200
        const photoX = (PAGE_WIDTH - circleSize) / 2
        const photoY = PAGE_HEIGHT - MARGIN - circleSize - 80

        // 丸形クリッピング用のマスクを作成
        // pdf-libでは直接的な丸形クリッピングがないため、
        // 受け取った画像がすでに丸形に切り抜かれていることを前提とする
        // （export/page.tsxで丸形に切り抜いてPNG形式で保存済み）

        // 画像を正方形で描画
        const scaledDims = image.scaleToFit(circleSize, circleSize)
        const centeredX = photoX + (circleSize - scaledDims.width) / 2
        const centeredY = photoY + (circleSize - scaledDims.height) / 2

        coverPage.drawImage(image, {
          x: centeredX,
          y: centeredY,
          width: scaledDims.width,
          height: scaledDims.height,
        })

        // 写真がある場合、名前の位置を調整
        nameYOffset = -(PAGE_HEIGHT / 2 - photoY + 60)
      } catch (e) {
        console.error('表紙写真の埋め込みエラー:', e)
      }
    }
  }

  // 名前（中央）
  const nameColor = hexToRgb(theme.cover.nameColor)
  const nameSize = 36
  const nameWidth = japaneseFont.widthOfTextAtSize(childName, nameSize)
  coverPage.drawText(childName, {
    x: (PAGE_WIDTH - nameWidth) / 2,
    y: PAGE_HEIGHT / 2 + nameYOffset,
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
    x: (PAGE_WIDTH - subWidth) / 2,
    y: PAGE_HEIGHT / 2 + nameYOffset - 40,
    size: subSize,
    font: japaneseFont,
    color: rgb(subColor.r, subColor.g, subColor.b),
  })

  // ===== 本文 =====
  const dates = getDateRange(startDate, endDate)
  const ENTRIES_PER_PAGE = 4
  const QUARTER_HEIGHT = (PAGE_HEIGHT - MARGIN * 2) / ENTRIES_PER_PAGE

  // 4日ずつペアにする
  for (let i = 0; i < dates.length; i += ENTRIES_PER_PAGE) {
    const contentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

    // 背景色
    const bgColor = theme.content.background
    if (bgColor.startsWith('#')) {
      const { r, g, b } = hexToRgb(bgColor)
      contentPage.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        color: rgb(r, g, b),
      })
    }

    const borderColor = hexToRgb(theme.content.borderColor)

    for (let j = 0; j < ENTRIES_PER_PAGE && (i + j) < dates.length; j++) {
      const entryTopY = PAGE_HEIGHT - MARGIN - (j * QUARTER_HEIGHT)

      await renderDayEntry(
        pdfDoc,
        contentPage,
        japaneseFont,
        theme,
        dates[i + j],
        birthday,
        diaryMap.get(dates[i + j]),
        MARGIN,
        entryTopY,
        QUARTER_HEIGHT - 10
      )

      // 区切り線（最後のエントリ以外）
      if (j < ENTRIES_PER_PAGE - 1 && (i + j + 1) < dates.length) {
        const lineY = entryTopY - QUARTER_HEIGHT
        contentPage.drawLine({
          start: { x: MARGIN, y: lineY },
          end: { x: PAGE_WIDTH - MARGIN, y: lineY },
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

async function renderDayEntry(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  theme: PdfTheme,
  date: string,
  birthday: string,
  diary: Diary | undefined,
  x: number,
  y: number,
  maxHeight: number = 380,
) {
  const daysOld = getDaysOld(birthday, date)

  // 日付
  const dateColor = hexToRgb(theme.content.dateColor)
  const dateText = formatDate(date)
  page.drawText(dateText, {
    x,
    y: y - 14,
    size: 13,
    font,
    color: rgb(dateColor.r, dateColor.g, dateColor.b),
  })

  // 生後○日目（日付の右に配置）
  const dayCountColor = hexToRgb(theme.content.dayCountColor)
  const dayCountText = `生後 ${daysOld}日目`
  const dateWidth = font.widthOfTextAtSize(dateText, 13)
  page.drawText(dayCountText, {
    x: x + dateWidth + 10,
    y: y - 14,
    size: 9,
    font,
    color: rgb(dayCountColor.r, dayCountColor.g, dayCountColor.b),
  })

  // 写真があれば配置
  let textStartX = x
  let hasPhoto = false
  const contentStartY = y - 28

  if (diary?.photo_urls && diary.photo_urls.length > 0) {
    const photoUrl = diary.photo_urls[0]
    const imgResult = await loadImageAsBytes(photoUrl)

    if (imgResult) {
      try {
        // JPEGまたはPNGの判定
        let image
        if (photoUrl.toLowerCase().includes('.png')) {
          image = await pdfDoc.embedPng(imgResult.bytes)
        } else {
          image = await pdfDoc.embedJpg(imgResult.bytes)
        }

        const photoMaxSize = maxHeight - 35 // 日付分を引く
        const photoSize = Math.min(100, photoMaxSize) // 最大100pt
        const scaledDims = image.scaleToFit(photoSize, photoSize)

        page.drawImage(image, {
          x,
          y: contentStartY - scaledDims.height,
          width: scaledDims.width,
          height: scaledDims.height,
        })

        hasPhoto = true
        textStartX = x + scaledDims.width + 14
      } catch (e) {
        console.error('画像の埋め込みエラー:', e)
      }
    }
  }

  // コメント
  const textColor = hexToRgb(theme.content.textColor)
  if (diary?.content) {
    const maxWidth = hasPhoto ? CONTENT_WIDTH - 120 : CONTENT_WIDTH
    const fontSize = 9.5
    const lineHeight = 14

    // 絵文字を除去してからテキストを行に分割
    const cleanContent = removeEmoji(diary.content)
    const lines = wrapText(cleanContent, font, fontSize, maxWidth)
    const maxLines = Math.floor((maxHeight - 35) / lineHeight)
    const displayLines = lines.slice(0, maxLines)

    displayLines.forEach((line, index) => {
      page.drawText(line, {
        x: textStartX,
        y: contentStartY - 4 - (index * lineHeight),
        size: fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
      })
    })
  } else if (!hasPhoto) {
    // 日記なし
    page.drawText('', {
      x,
      y: contentStartY - 4,
      size: 9,
      font,
      color: rgb(dayCountColor.r, dayCountColor.g, dayCountColor.b),
    })
  }
}

// 絵文字を除去する（フォントがサポートしていないため）
function removeEmoji(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')  // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation Selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental Symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Symbols Extended-A
    .replace(/[\u{200D}]/gu, '')             // Zero Width Joiner
    .replace(/[\u{20E3}]/gu, '')             // Combining Enclosing Keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')  // Tags
}

// テキストの折り返し処理
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
      const width = font.widthOfTextAtSize(testLine, fontSize)

      if (width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}
