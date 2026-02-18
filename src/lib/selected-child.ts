const STORAGE_KEY = 'selected-child-id'

export function getSelectedChildId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setSelectedChildId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore
  }
}
