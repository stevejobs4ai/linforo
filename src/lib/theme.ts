export type Theme = 'dark' | 'light'

const KEY = 'linforo-theme'

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(KEY)
  if (v === 'dark' || v === 'light') return v
  return null
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function getEffectiveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, theme)
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (theme === 'light') {
    html.classList.add('light-theme')
    html.classList.remove('dark-theme')
  } else {
    html.classList.add('dark-theme')
    html.classList.remove('light-theme')
  }
}
