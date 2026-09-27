import { useTheme } from '../context/ThemeContext'

function SunIcon() {
  return (
    <svg className="market-search-trigger-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="market-search-trigger-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M13.2 9.4A5.4 5.4 0 0 1 6.6 2.8 5.5 5.5 0 1 0 13.2 9.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const toLight = theme === 'dark'
  const label = toLight ? 'Включить светлую тему' : 'Включить тёмную тему'

  return (
    <button
      type="button"
      className="market-search-trigger theme-toggle"
      title={label}
      aria-label={label}
      aria-pressed={!toLight}
      onClick={toggleTheme}
    >
      {toLight ? <SunIcon /> : <MoonIcon />}
      <span className="market-search-trigger-label">{toLight ? 'Светлая' : 'Тёмная'}</span>
    </button>
  )
}
