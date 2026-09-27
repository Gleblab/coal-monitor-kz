import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSource } from '../data/catalog'
import { fetchPublishedSources } from '../services/coalDataService'
import { SOURCE_STATUS } from '../data/sources'

const SourceContext = createContext(null)

function sourceStatusFromType(type) {
  if (type === 'company') return SOURCE_STATUS.company
  if (type === 'regional') return 'Региональные данные'
  return SOURCE_STATUS.official
}

export function SourceProvider({ children }) {
  const [sourceId, setSourceId] = useState(null)
  const [remoteByCode, setRemoteByCode] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPublishedSources().then((result) => {
      if (cancelled || !result.ok) return
      const map = {}
      for (const row of result.rows) {
        if (!row.code) continue
        map[row.code] = {
          id: row.code,
          organization: row.organization,
          publication: row.publication_title,
          period: row.published_at || null,
          url: row.url,
          sourceStatus: sourceStatusFromType(row.source_type),
          notes: row.notes || null,
        }
      }
      setRemoteByCode(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const source = sourceId ? remoteByCode?.[sourceId] || getSource(sourceId) : null

  const value = useMemo(
    () => ({
      openSource: (id) => setSourceId(id),
      closeSource: () => setSourceId(null),
      source,
      remoteByCode,
    }),
    [source, remoteByCode],
  )

  return <SourceContext.Provider value={value}>{children}</SourceContext.Provider>
}

export function useSources() {
  const context = useContext(SourceContext)
  if (!context) {
    throw new Error('useSources должен использоваться внутри SourceProvider')
  }
  return context
}
