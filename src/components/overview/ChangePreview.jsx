import { DataSkeleton } from '../DataSkeleton'
import { useChangeCenter } from '../../context/ChangeCenterContext'
import { useMetricTrace } from '../../context/MetricTraceContext'
import { formatChangeValue } from '../../lib/changeDetection'
import { changeCategoryLabel, changePreviewDelta, selectChangePreview } from '../../lib/overviewCommand'

function directionMark(direction) {
  if (direction === 'increase') return '↑'
  if (direction === 'decrease') return '↓'
  return '→'
}

export function ChangePreview() {
  const { changes, loading, error, openChangeCenter } = useChangeCenter()
  const { openTrace } = useMetricTrace()
  const preview = selectChangePreview(changes)

  return (
    <section className="cmd-change" aria-labelledby="cmd-change-title">
      <div className="cmd-section-head">
        <h2 id="cmd-change-title">Последние изменения</h2>
        <button type="button" className="cmd-text-btn" onClick={(event) => openChangeCenter(event.currentTarget)}>
          Все изменения
        </button>
      </div>
      {loading && !changes.length ? <DataSkeleton variant="compact" /> : null}
      {!loading && error && !changes.length ? (
        <p className="cmd-fallback">Блок изменений временно недоступен. Остальные показатели на странице сохранены.</p>
      ) : null}
      {preview.length ? (
        <ul className="cmd-change-list">
          {preview.map((change) => {
            const delta = changePreviewDelta(change)
            return (
              <li key={change.id} className="cmd-change-row">
                <p className="cmd-kicker">{changeCategoryLabel(change.category)}</p>
                <p className="cmd-change-title">{change.title}</p>
                <p className={`cmd-change-delta is-${change.direction}`}>
                  <span aria-hidden="true">{directionMark(change.direction)}</span> {delta}
                </p>
                <p className="cmd-change-period">
                  {change.previous.period} → {change.current.period}
                </p>
                <p className="cmd-change-values">
                  {formatChangeValue(change, 'previous')} → {formatChangeValue(change, 'current')}
                </p>
                {change.traceMetric ? (
                  <button
                    type="button"
                    className="cmd-trace"
                    onClick={(event) => openTrace(change.traceMetric, change.traceExtras, event.currentTarget)}
                  >
                    О показателе
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : !loading && !error ? (
        <p className="cmd-fallback">Нет сопоставимых изменений в текущем наборе данных.</p>
      ) : null}
    </section>
  )
}
