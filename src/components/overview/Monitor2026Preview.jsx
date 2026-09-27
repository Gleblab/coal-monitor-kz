import { Link } from 'react-router-dom'
import { DataSkeleton } from '../DataSkeleton'
import { MetricTraceButton } from '../traceability/MetricTraceButton'
import { monitorFactCaption, selectMonitorPreview } from '../../lib/overviewCommand'

export function Monitor2026Preview({ outlook, loading, error }) {
  const items = selectMonitorPreview(outlook?.targetMonitor)

  return (
    <section className="cmd-monitor" aria-labelledby="cmd-monitor-title">
      <div className="cmd-section-head">
        <h2 id="cmd-monitor-title">Монитор 2026</h2>
        <Link to="/outlook" className="cmd-text-btn">
          Подробнее о планах и развитии
        </Link>
      </div>
      {loading ? <DataSkeleton variant="compact" /> : null}
      {!loading && error ? (
        <p className="cmd-fallback">Планы 2026 временно недоступны. Ключевые KPI на странице сохранены.</p>
      ) : null}
      {!loading && !error && items.length ? (
        <ul className="cmd-monitor-grid">
          {items.map((item) => (
            <li key={item.id} className="cmd-monitor-item">
              <p className="cmd-kicker">{item.direction}</p>
              <p className="cmd-monitor-value">{item.targetDisplay}</p>
              <p className="cmd-monitor-role">
                {item.target?.measureKind === 'expected' ? 'Ожидание 2026' : 'План 2026'}
                {item.target?.entityLabel ? ` · ${item.target.entityLabel}` : ''}
              </p>
              <p className="cmd-monitor-fact">{monitorFactCaption(item)}</p>
              <MetricTraceButton
                item={{
                  id: item.id,
                  value: item.target?.value,
                  display: item.targetDisplay,
                  unit: item.target?.unit,
                  period: item.target?.periodLabel || '2026',
                  sourceId: item.target?.sourceId,
                  label: item.direction,
                }}
                extras={{ route: '/outlook', label: item.direction }}
                className="cmd-trace"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {!loading && !error && !items.length ? (
        <p className="cmd-fallback">Нет подтверждённых планов 2026 в текущем наборе данных.</p>
      ) : null}
    </section>
  )
}
