import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export const OVERVIEW_AWAKENED_KEY = 'coalMonitorOverviewAwakened'

const AWAKEN_MS = 3400

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readAwakened() {
  try {
    return sessionStorage.getItem(OVERVIEW_AWAKENED_KEY) === '1'
  } catch {
    return false
  }
}

function markAwakened() {
  try {
    sessionStorage.setItem(OVERVIEW_AWAKENED_KEY, '1')
  } catch {
    /* presentation-only */
  }
}

function isIntroPreview(searchParams) {
  return searchParams.get('intro') === '1'
}

function shouldAwaken(preview) {
  if (typeof window === 'undefined') return false
  if (prefersReducedMotion()) return false
  if (preview) return true
  return !readAwakened()
}

/** True while first-visit Overview Data Awakening will still run this session. */
export function overviewAwakeningWillPlay() {
  if (typeof window === 'undefined') return false
  const preview = new URLSearchParams(window.location.search).get('intro') === '1'
  return shouldAwaken(preview)
}

/** Once-per-session Overview entrance. Does not persist filters or data. */
export function useOverviewAwakening(ready) {
  const [searchParams] = useSearchParams()
  const preview = isIntroPreview(searchParams)
  const [awakening, setAwakening] = useState(() => shouldAwaken(preview))
  const started = useRef(false)

  useEffect(() => {
    started.current = false
  }, [preview])

  useEffect(() => {
    if (!ready || started.current) return
    started.current = true

    if (!shouldAwaken(preview)) {
      setAwakening(false)
      if (!preview && !prefersReducedMotion()) markAwakened()
      return undefined
    }

    setAwakening(true)
    const timer = window.setTimeout(() => {
      if (!preview) markAwakened()
      setAwakening(false)
    }, AWAKEN_MS)

    return () => {
      window.clearTimeout(timer)
      if (!preview) markAwakened()
      setAwakening(false)
    }
  }, [ready, preview])

  return awakening
}
