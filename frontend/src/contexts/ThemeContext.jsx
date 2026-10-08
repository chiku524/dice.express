import { createContext, useContext, useEffect, useState } from 'react'
import {
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  normalizeTheme,
  readStoredTheme,
  writeStoredTheme,
} from '../utils/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof document !== 'undefined') {
      const fromDom = normalizeTheme(document.documentElement.dataset.theme)
      if (fromDom) return fromDom
    }
    return readStoredTheme()
  })

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== THEME_STORAGE_KEY) return
      const next = normalizeTheme(e.newValue) ?? 'dark'
      setThemeState(next)
      applyThemeToDocument(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = (next) => {
    const resolved = writeStoredTheme(next)
    setThemeState(resolved)
    applyThemeToDocument(resolved)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
