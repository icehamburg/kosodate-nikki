const fs = require('fs')
const path = require('path')

// フォントファイルを読み込む
const fontPath = path.join(__dirname, '../public/fonts/NotoSansJP-Regular.ttf')
const fontBuffer = fs.readFileSync(fontPath)

// Base64に変換
const base64 = fontBuffer.toString('base64')

// TypeScriptファイルとして出力
const output = `// Generated file - do not edit manually
// Noto Sans CJK JP Regular font in Base64 format
export const NotoSansJPBase64 = '${base64}'
`

const outputPath = path.join(__dirname, '../src/lib/fonts/noto-sans-jp.ts')

// ディレクトリを作成
fs.mkdirSync(path.dirname(outputPath), { recursive: true })

fs.writeFileSync(outputPath, output)
console.log('Font file generated at:', outputPath)
console.log('Base64 length:', base64.length)
