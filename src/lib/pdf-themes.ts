export type ThemeId = 'simple' | 'natural' | 'pastelPink' | 'pastelBlue'

export type PdfTheme = {
  id: ThemeId
  name: string
  cover: {
    background: string
    nameColor: string
    subColor: string
    photoStyle: string // border-radius等
  }
  content: {
    background: string
    dateColor: string
    dayCountColor: string
    textColor: string
    borderColor: string
    photoBorderRadius: string
  }
  fontFamily: string
}

export const pdfThemes: Record<ThemeId, PdfTheme> = {
  simple: {
    id: 'simple',
    name: 'シンプル',
    cover: {
      background: '#ffffff',
      nameColor: '#333333',
      subColor: '#888888',
      photoStyle: 'border-radius: 50%;',
    },
    content: {
      background: '#ffffff',
      dateColor: '#333333',
      dayCountColor: '#888888',
      textColor: '#444444',
      borderColor: '#eeeeee',
      photoBorderRadius: '8px',
    },
    fontFamily: "'Hiragino Sans', 'Yu Gothic', sans-serif",
  },
  natural: {
    id: 'natural',
    name: 'ナチュラル',
    cover: {
      background: 'linear-gradient(180deg, #fdfcfb 0%, #f5f0e8 100%)',
      nameColor: '#5c5347',
      subColor: '#a89f91',
      photoStyle: 'border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);',
    },
    content: {
      background: '#fdfcfa',
      dateColor: '#5c5347',
      dayCountColor: '#a89f91',
      textColor: '#5c5347',
      borderColor: '#e8e2d9',
      photoBorderRadius: '8px',
    },
    fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
  },
  pastelPink: {
    id: 'pastelPink',
    name: 'パステルピンク',
    cover: {
      background: 'linear-gradient(180deg, #fff5f5 0%, #ffe4e8 100%)',
      nameColor: '#d4768a',
      subColor: '#e8a0ad',
      photoStyle: 'border-radius: 50%; border: 4px solid #ffb6c1; box-shadow: 0 4px 20px rgba(255,182,193,0.4);',
    },
    content: {
      background: '#fffafa',
      dateColor: '#d4768a',
      dayCountColor: '#e8a0ad',
      textColor: '#7a5a60',
      borderColor: '#ffe4e8',
      photoBorderRadius: '12px',
    },
    fontFamily: "'Hiragino Maru Gothic ProN', sans-serif",
  },
  pastelBlue: {
    id: 'pastelBlue',
    name: 'パステルブルー',
    cover: {
      background: 'linear-gradient(180deg, #f0f8ff 0%, #d4e8f7 100%)',
      nameColor: '#5a8fb4',
      subColor: '#7ba3c2',
      photoStyle: 'border-radius: 50%; border: 4px solid #87b4d2; box-shadow: 0 4px 20px rgba(135,180,210,0.4);',
    },
    content: {
      background: '#f8fbff',
      dateColor: '#5a8fb4',
      dayCountColor: '#7ba3c2',
      textColor: '#506a7a',
      borderColor: '#d4e8f7',
      photoBorderRadius: '12px',
    },
    fontFamily: "'Hiragino Maru Gothic ProN', sans-serif",
  },
}
