import { useTheme } from '../context/ThemeContext'

export function useChartTheme() {
  return useTheme().chart
}

export function useMapTheme() {
  return useTheme().map
}
