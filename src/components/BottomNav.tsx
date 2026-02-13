'use client'

import Link from 'next/link'

type Props = {
  current: 'home' | 'calendar' | 'summary' | 'export'
}

const navItems = [
  { id: 'home', emoji: '🏠', label: 'ホーム', href: '/' },
  { id: 'calendar', emoji: '📅', label: 'カレンダー', href: '/calendar' },
  { id: 'summary', emoji: '📊', label: 'まとめ', href: '/summary' },
  { id: 'export', emoji: '📄', label: 'PDF出力', href: '/export' },
] as const

export default function BottomNav({ current }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: '#EFEDE1', // ベージュ系
        borderTop: '2px solid #6B8E23', // オリーブグリーン
        borderRadius: 0,
        boxShadow: 'none',
      }}
    >
      <div className="flex justify-around pt-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className="flex flex-col items-center py-1 px-3 rounded-lg transition"
            style={current === item.id
              ? {
                  backgroundColor: '#D6E3C2', // 選択時グリーン系
                  color: '#6B8E23', // オリーブグリーン
                  borderRadius: 16,
                  fontWeight: 700,
                }
              : {
                  color: '#6B8E23', // オリーブグリーン
                  fontWeight: 400,
                }
            }
          >
            <span
              style={{
                fontSize: 24,
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: current === item.id ? '#6B8E23' : '#6B8E23',
              }}
            >
              {item.emoji}
            </span>
            <span
              style={{
                fontFamily: 'Arial Rounded MT Bold, LINE Seed JP_TTF, sans-serif',
                fontWeight: current === item.id ? 700 : 400,
                fontSize: 12,
                color: current === item.id ? '#6B8E23' : '#6B8E23',
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
