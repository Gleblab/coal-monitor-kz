import { useRef } from 'react'
import { useMetricTrace } from '../../context/MetricTraceContext'

export function MetricTraceButton({ item, extras, className = 'metric-trace-btn' }) {
  const { openTrace } = useMetricTrace()
  const ref = useRef(null)
  if (!item?.id && !extras?.id) return null
  if (typeof item?.value !== 'number' || !Number.isFinite(item.value)) return null

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      aria-label="О показателе"
      onClick={() => openTrace(item, extras, ref.current)}
    >
      О показателе
    </button>
  )
}
