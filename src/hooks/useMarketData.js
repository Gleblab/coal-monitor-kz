import { useCallback, useEffect, useState } from 'react'
import { ingestSearchRemote } from '../lib/searchRemoteBus'

export function useMarketData(loader, filters = { region: 'all', coalType: 'all' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const region = filters.region ?? 'all'
  const coalType = filters.coalType ?? 'all'
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loader({ region, coalType })
      .then((result) => {
        if (loader.searchRemoteKey) ingestSearchRemote(loader.searchRemoteKey, result)
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Не удалось загрузить данные')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loader, region, coalType, reloadToken])

  return { data, loading, error, reload }
}
