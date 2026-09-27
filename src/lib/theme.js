export const THEME_STORAGE_KEY = 'coal-monitor-theme'
export const THEMES = Object.freeze(['dark', 'light'])
export const DEFAULT_THEME = 'light'

export function isTheme(value) {
  return value === 'dark' || value === 'light'
}

export function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* private mode / blocked storage */
  }
}

export function applyTheme(theme) {
  const next = isTheme(theme) ? theme : DEFAULT_THEME
  document.documentElement.setAttribute('data-theme', next)
  document.documentElement.style.colorScheme = next
  return next
}

function readVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** Presentation only: Recharts/maps read inline colors, not CSS variables. */
export function readChartTheme() {
  return {
    grid: readVar('--chart-grid', 'rgba(255, 255, 255, 0.06)'),
    axis: readVar('--chart-axis', '#7d8ca3'),
    tooltipBackground: readVar('--chart-tooltip-bg', '#101826'),
    tooltipBorder: readVar('--chart-tooltip-border', '#2c3a52'),
    tooltipText: readVar('--text', '#e7eef8'),
    dotStroke: readVar('--chart-dot-stroke', '#0f1624'),
    cursor: readVar('--chart-cursor', 'rgba(255, 255, 255, 0.12)'),
    plotFill: readVar('--surface-raised', '#101826'),
  }
}

export function readMapTheme() {
  return {
    canvas: readVar('--map-canvas', '#0c121c'),
    empty: readVar('--map-empty', '#151c28'),
    confidential: readVar('--map-confidential', '#2a3345'),
    origin: readVar('--map-origin', '#3f4d3c'),
    heatFrom: readVar('--map-heat-from', '#2f2b22'),
    heatTo: readVar('--map-heat-to', '#8f7848'),
    exportFrom: readVar('--export-heat-from', '#2a271f'),
    exportTo: readVar('--export-heat-to', '#9a7a32'),
  }
}

export function getChartTooltipStyle() {
  const theme = readChartTheme()
  return {
    background: theme.tooltipBackground,
    border: `1px solid ${theme.tooltipBorder}`,
    borderRadius: 6,
    fontSize: 12,
    color: theme.tooltipText,
  }
}
