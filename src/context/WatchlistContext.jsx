import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { subscribeSearchRemote } from '../lib/searchRemoteBus'
import { resolveWatchlistItems } from '../lib/watchlistResolve'
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '../services/watchlistService'

const WatchlistContext = createContext(null)

export function WatchlistProvider({ children }) {
  const { user } = useAuth()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [authNeed, setAuthNeed] = useState(false)
  const [remote, setRemote] = useState({})
  const pendingKeyRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => subscribeSearchRemote(setRemote), [])

  const load = useCallback(async () => {
    if (!user) {
      setKeys([])
      setError(null)
      setLoading(false)
      return { ok: true }
    }
    setLoading(true)
    setError(null)
    const result = await getWatchlist()
    if (!result.ok) {
      setError(result.error || 'Не удалось загрузить мой мониторинг')
      setLoading(false)
      return result
    }
    setKeys((result.rows || []).map((row) => row.metric_key).filter(Boolean))
    setLoading(false)
    return result
  }, [user])

  useEffect(() => {
    let cancelled = false
    if (!user) {
      pendingKeyRef.current = null
      setKeys([])
      setError(null)
      setOpen(false)
      return undefined
    }
    setLoading(true)
    getWatchlist().then(async (result) => {
      if (cancelled) return
      if (!result.ok) {
        setError(result.error || 'Не удалось загрузить мой мониторинг')
        setLoading(false)
        return
      }
      let next = (result.rows || []).map((row) => row.metric_key).filter(Boolean)
      const pending = pendingKeyRef.current
      if (pending && !next.includes(pending)) {
        const added = await addToWatchlist(pending)
        if (added.ok) next = [pending, ...next.filter((key) => key !== pending)]
      }
      pendingKeyRef.current = null
      setKeys(next)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const closeWatchlist = useCallback(() => {
    setOpen(false)
    const node = triggerRef.current
    triggerRef.current = null
    if (node && typeof node.focus === 'function') {
      window.requestAnimationFrame(() => node.focus())
    }
  }, [])

  const openWatchlist = useCallback((trigger) => {
    triggerRef.current = trigger || document.activeElement
    setOpen(true)
  }, [])

  const toggleWatchlist = useCallback(
    (trigger) => {
      if (open) closeWatchlist()
      else openWatchlist(trigger)
    },
    [open, closeWatchlist, openWatchlist],
  )

  const isWatched = useCallback((metricKey) => Boolean(metricKey && keys.includes(metricKey)), [keys])

  const toggleMetric = useCallback(
    async (metricKey) => {
      if (!metricKey) return { ok: false }
      if (!user) {
        pendingKeyRef.current = metricKey
        setAuthNeed(true)
        return { ok: false, needsAuth: true }
      }
      if (keys.includes(metricKey)) {
        const previous = keys
        setKeys(keys.filter((key) => key !== metricKey))
        const result = await removeFromWatchlist(metricKey)
        if (!result.ok) setKeys(previous)
        return result
      }
      const previous = keys
      setKeys([metricKey, ...keys.filter((key) => key !== metricKey)])
      const result = await addToWatchlist(metricKey)
      if (!result.ok) {
        setKeys(previous)
        if (result.needsAuth) {
          pendingKeyRef.current = metricKey
          setAuthNeed(true)
        }
      }
      return result
    },
    [user, keys],
  )

  const items = useMemo(() => resolveWatchlistItems(keys, remote), [keys, remote])

  const value = useMemo(
    () => ({
      keys,
      items,
      count: keys.length,
      loading,
      error,
      open,
      authNeed,
      isWatched,
      toggleMetric,
      load,
      openWatchlist,
      closeWatchlist,
      toggleWatchlist,
      clearAuthNeed: () => setAuthNeed(false),
      cancelPending: () => {
        pendingKeyRef.current = null
        setAuthNeed(false)
      },
    }),
    [
      keys,
      items,
      loading,
      error,
      open,
      authNeed,
      isWatched,
      toggleMetric,
      load,
      openWatchlist,
      closeWatchlist,
      toggleWatchlist,
    ],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist должен использоваться внутри WatchlistProvider')
  }
  return context
}
