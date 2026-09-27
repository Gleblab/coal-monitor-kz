import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { overviewAwakeningWillPlay } from './useOverviewAwakening'

const ANALYTICAL_ROUTES = new Set([
  '/',
  '/energy-role',
  '/resources',
  '/production',
  '/geography',
  '/outlook',
  '/concentration',
  '/dynamics',
  '/retail',
  '/sources',
  '/companies',
  '/exports',
  '/constraints',
])

const SCAN_MS = 420

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useRouteScan() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  const [scanKey, setScanKey] = useState(0)

  useEffect(() => {
    const from = previous.current
    previous.current = pathname
    if (from === pathname) return undefined
    if (prefersReducedMotion()) return undefined
    if (!ANALYTICAL_ROUTES.has(pathname)) return undefined
    if (pathname === '/' && overviewAwakeningWillPlay()) return undefined

    setScanKey((value) => value + 1)
    return undefined
  }, [pathname])

  return scanKey
}

export { SCAN_MS }
