const STORAGE_PREFIX = 'genki-lab:'

export function readLocalValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocalValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
}

export function removeLocalValue(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
}
