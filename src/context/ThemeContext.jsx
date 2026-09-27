import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyTheme,
  DEFAULT_THEME,
  persistTheme,
  readChartTheme,
  readMapTheme,
  readStoredTheme,
} from '../lib/theme'

const ThemeContext = createContext(null)

function initialTheme() {
  if (typeof document === 'undefined') return DEFAULT_THEME
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return readStoredTheme()
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    const applied = applyTheme(next)
    persistTheme(applied)
    setThemeState(applied)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      chart: readChartTheme(),
      map: readMapTheme(),
    }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
