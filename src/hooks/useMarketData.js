import { useEffect, useState } from 'react'

export function useMarketData(loader, filters = { region: 'all', coalType: 'all' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const region = filters.region ?? 'all'
  const coalType = filters.coalType ?? 'all'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loader({ region, coalType })
      .then((result) => {
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
  }, [loader, region, coalType])

  return { data, loading, error }
}
