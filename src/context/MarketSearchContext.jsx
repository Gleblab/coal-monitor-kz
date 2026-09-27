import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getCompanyProfiles, getExportAnnualTotals, getExportByCountry, getOverview, getProduction } from '../api/marketApi'
import { ingestSearchRemote, subscribeSearchRemote } from '../lib/searchRemoteBus'
import {
  buildStaticSearchIndex,
  mergeRemoteSearchIndex,
} from '../lib/marketSearch'

const MarketSearchContext = createContext(null)

export function MarketSearchProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(() => buildStaticSearchIndex())
  const triggerRef = useRef(null)

  useEffect(() => {
    return subscribeSearchRemote((remote) => {
      try {
        setItems(mergeRemoteSearchIndex(buildStaticSearchIndex(), remote))
      } catch {
        /* keep last good index */
      }
    })
  }, [])

  useEffect(() => {
    getOverview().then((data) => ingestSearchRemote('overview', data)).catch(() => {})
    getProduction().then((data) => ingestSearchRemote('production', data)).catch(() => {})
    getExportAnnualTotals().then((data) => ingestSearchRemote('exportTotals', data)).catch(() => {})
    getExportByCountry('fy-2025').then((data) => ingestSearchRemote('exportPartners', data)).catch(() => {})
    getCompanyProfiles().then((data) => ingestSearchRemote('companies', data)).catch(() => {})
  }, [])

  const closeSearch = useCallback(() => {
    setOpen(false)
    const node = triggerRef.current
    triggerRef.current = null
    if (node && typeof node.focus === 'function') {
      window.requestAnimationFrame(() => node.focus())
    }
  }, [])

  const openSearch = useCallback((trigger) => {
    triggerRef.current = trigger || document.activeElement
    setOpen(true)
  }, [])

  const toggleSearch = useCallback(
    (trigger) => {
      if (open) closeSearch()
      else openSearch(trigger)
    },
    [open, closeSearch, openSearch],
  )

  useEffect(() => {
    function onKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggleSearch(document.activeElement)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSearch])

  const value = useMemo(
    () => ({
      open,
      items,
      openSearch,
      closeSearch,
      toggleSearch,
    }),
    [open, items, openSearch, closeSearch, toggleSearch],
  )

  return <MarketSearchContext.Provider value={value}>{children}</MarketSearchContext.Provider>
}

export function useMarketSearch() {
  const context = useContext(MarketSearchContext)
  if (!context) {
    throw new Error('useMarketSearch должен использоваться внутри MarketSearchProvider')
  }
  return context
}
