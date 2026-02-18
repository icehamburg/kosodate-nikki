export type ThemeMode = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'theme-preference'

export function getThemePreference(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

export function setThemePreference(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme(mode)
}

export function applyTheme(mode: ThemeMode): void {
  const html = document.documentElement

  // Remove existing theme classes
  html.classList.remove('light', 'dark')

  if (mode === 'light') {
    html.classList.add('light')
  } else if (mode === 'dark') {
    html.classList.add('dark')
  }
  // 'auto' → no class, let prefers-color-scheme media query handle it
}
