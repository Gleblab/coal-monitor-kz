import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getConcentration, getExportPeriodComparison, getProduction } from '../api/marketApi'
import { detectMarketChanges } from '../lib/changeDetection'

const ChangeCenterContext = createContext(null)
const YTD_CURRENT = 'ytd-2026-01-07'
const YTD_PREVIOUS = 'ytd-2025-01-07'

export function ChangeCenterProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const triggerRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [production, exportYtd, concentration] = await Promise.all([
        getProduction().catch((err) => {
          console.error(err)
          return null
        }),
        getExportPeriodComparison(YTD_CURRENT, YTD_PREVIOUS).catch((err) => {
          console.error(err)
          return null
        }),
        getConcentration({ region: 'all', coalType: 'all' }).catch((err) => {
          console.error(err)
          return null
        }),
      ])
      const failedAll = !production && !exportYtd && !concentration
      const next = detectMarketChanges({
        production,
        exportYtd: exportYtd?.ok ? exportYtd : null,
        concentration,
      })
      setChanges(next)
      setLoaded(true)
      setError(failedAll ? 'Не удалось загрузить изменения' : null)
    } catch (err) {
      console.error(err)
      setChanges([])
      setError('Не удалось загрузить изменения')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closeChangeCenter = useCallback(() => {
    setOpen(false)
    const node = triggerRef.current
    triggerRef.current = null
    if (node && typeof node.focus === 'function') {
      window.requestAnimationFrame(() => node.focus())
    }
  }, [])

  const openChangeCenter = useCallback(
    (trigger) => {
      triggerRef.current = trigger || document.activeElement
      setOpen(true)
      if (!loaded && !loading) load()
    },
    [load, loaded, loading],
  )

  const value = useMemo(
    () => ({
      open,
      changes,
      count: changes.length,
      loading,
      error,
      load,
      openChangeCenter,
      closeChangeCenter,
    }),
    [open, changes, loading, error, load, openChangeCenter, closeChangeCenter],
  )

  return <ChangeCenterContext.Provider value={value}>{children}</ChangeCenterContext.Provider>
}

export function useChangeCenter() {
  const context = useContext(ChangeCenterContext)
  if (!context) {
    throw new Error('useChangeCenter должен использоваться внутри ChangeCenterProvider')
  }
  return context
}
