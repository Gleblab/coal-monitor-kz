import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useSources } from './SourceContext'
import { buildMetricTrace } from '../lib/metricTraceability'

const MetricTraceContext = createContext(null)

export function MetricTraceProvider({ children }) {
  const { remoteByCode } = useSources()
  const [payload, setPayload] = useState(null)
  const triggerRef = useRef(null)

  const closeTrace = useCallback(() => {
    setPayload(null)
    const node = triggerRef.current
    triggerRef.current = null
    if (node && typeof node.focus === 'function') {
      window.requestAnimationFrame(() => node.focus())
    }
  }, [])

  const openTrace = useCallback((metric, extras = {}, trigger) => {
    triggerRef.current = trigger || null
    const sourceId = extras.sourceId || metric?.sourceId
    setPayload({
      metric,
      extras: {
        ...extras,
        sourceRecord: extras.sourceRecord || remoteByCode?.[sourceId] || null,
      },
    })
  }, [remoteByCode])

  const record = payload ? buildMetricTrace(payload.metric, payload.extras) : null

  const value = useMemo(
    () => ({
      record,
      payload,
      openTrace,
      closeTrace,
    }),
    [record, payload, openTrace, closeTrace],
  )

  return <MetricTraceContext.Provider value={value}>{children}</MetricTraceContext.Provider>
}

export function useMetricTrace() {
  const context = useContext(MetricTraceContext)
  if (!context) {
    throw new Error('useMetricTrace должен использоваться внутри MetricTraceProvider')
  }
  return context
}
