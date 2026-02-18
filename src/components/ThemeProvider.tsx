'use client'

import { useEffect } from 'react'
import { getThemePreference, applyTheme } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mode = getThemePreference()
    applyTheme(mode)
  }, [])

  return <>{children}</>
}
