import { buildStaticSearchIndex, mergeRemoteSearchIndex } from './marketSearch'
import { buildMetricTrace, watchlistMetricKey } from './metricTraceability'

export function resolveWatchlistItems(keys, remote) {
  const index = mergeRemoteSearchIndex(buildStaticSearchIndex(), remote)
  return (keys || []).map((key) => {
    const row = index.find((item) => {
      if (item.type !== 'metric') return false
      const itemKey = watchlistMetricKey(item.traceMetric, item.traceExtras)
      return itemKey === key || item.traceMetric?.id === key || item.id === `metric:${key}`
    })
    if (!row?.traceMetric) return { key, available: false }
    const record = buildMetricTrace(row.traceMetric, row.traceExtras || {})
    if (!record) return { key, available: false }
    return {
      key,
      available: true,
      record,
      metric: row.traceMetric,
      extras: row.traceExtras || {},
    }
  })
}
