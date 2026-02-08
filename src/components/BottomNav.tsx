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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-bottom z-40">
      <div className="flex justify-around py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {navItems.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className="flex flex-col items-center py-1 px-3 rounded-lg transition"
            style={current === item.id ? { backgroundColor: '#FDF4F1', color: '#D97757' } : { color: '#6b7280' }}
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
