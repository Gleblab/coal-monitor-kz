import { useSources } from '../context/SourceContext'
import { formatNumber, valueQualifierPrefix } from '../lib/format'
import { CompareButton } from './comparison/CompareButton'
import { MetricTraceButton } from './traceability/MetricTraceButton'
import { DataSkeleton } from './DataSkeleton'

export function StatusBadge({ status }) {
  const map = {
    'Официальные данные': 'status-official',
    'Отраслевая оценка': 'status-industry',
    План: 'status-plan',
    'Региональные данные': 'status-regional',
    'Данные предприятия': 'status-company',
    'Демонстрационные данные': 'status-demo',
    'Официальный источник': 'status-official',
    ФАКТ: 'status-official',
    ПЛАН: 'status-plan',
    ОЖИДАНИЕ: 'status-expect',
    'УТВЕРЖДЁННАЯ ПРОГРАММА': 'status-official',
    'ДОРОЖНАЯ КАРТА': 'status-industry',
    'СЕЗОННАЯ ПОТРЕБНОСТЬ': 'status-regional',
    'ЦЕЛЕВОЙ ПОКАЗАТЕЛЬ': 'status-target',
  }
  return <span className={`status-badge ${map[status] || ''}`}>{status}</span>
}

export function SourceButton({ sourceId }) {
  const { openSource } = useSources()
  return (
    <button type="button" className="source-btn" onClick={() => openSource(sourceId)}>
      Источник
    </button>
  )
}

export function QuietSource({ sourceId }) {
  const { openSource } = useSources()
  if (!sourceId) return null
  return (
    <button
      type="button"
      className="outlook-source"
      onClick={() => openSource(sourceId)}
      aria-label="Источник показателя"
      title="Источник"
    >
      ист.
    </button>
  )
}

export function PageHeader({ title, description }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Рынок угля Казахстана · верифицированный контур</p>
        <h1>{title}</h1>
        {description ? <p className="page-desc">{description}</p> : null}
      </div>
    </header>
  )
}

export function LoadErrorState({ onRetry }) {
  return (
    <div className="state-block error" role="alert">
      <p className="state-block-title">Не удалось загрузить данные.</p>
      <p className="state-block-hint">Попробуйте обновить данные или повторить попытку позже.</p>
      {typeof onRetry === 'function' ? (
        <button type="button" className="ghost-btn state-block-retry" onClick={onRetry}>
          Повторить
        </button>
      ) : null}
    </div>
  )
}

export function StateBlock({ loading, error, empty, emptyText, skeleton = 'cards', onRetry, children }) {
  if (loading) return <DataSkeleton variant={skeleton} />
  if (error) return <LoadErrorState onRetry={onRetry} />
  if (empty) {
    return <div className="state-block">{emptyText || 'Нет подтвержденных данных'}</div>
  }
  return children
}

export function NoData({ text, hint, actionLabel, onAction }) {
  return (
    <div className="no-data">
      <strong>Нет подтвержденных данных</strong>
      {text ? <p>{text}</p> : <p>Нет подтверждённых данных для выбранного среза.</p>}
      {hint ? <p>{hint}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="ghost-btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function kpiValueParts(item) {
  const unit = item.unit ? String(item.unit).trim() : ''
  const raw =
    item.display != null && String(item.display).trim() !== ''
      ? String(item.display).trim()
      : formatNumber(item.value)
  if (!unit) return { valueText: raw, unitText: null }
  if (raw === unit) return { valueText: raw, unitText: null }
  const spaced = ` ${unit}`
  if (raw.endsWith(spaced)) return { valueText: raw.slice(0, -spaced.length).trim(), unitText: unit }
  if (raw.endsWith(unit) && /\s/.test(raw.slice(0, -unit.length))) {
    return { valueText: raw.slice(0, -unit.length).trim(), unitText: unit }
  }
  return { valueText: raw, unitText: unit }
}

export function KpiCard({ item, onInspect, comparable = false, comparisonExtras, traceable = false, traceExtras }) {
  const { valueText, unitText } = kpiValueParts(item)
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <StatusBadge status={item.status} />
        <div className="kpi-top-actions">
          {comparable ? <CompareButton item={item} extras={comparisonExtras} /> : null}
          {traceable ? <MetricTraceButton item={item} extras={traceExtras || comparisonExtras} /> : null}
          {onInspect ? (
            <button type="button" className="kpi-inspect" onClick={() => onInspect(item)}>
              Подробнее
            </button>
          ) : null}
          <SourceButton sourceId={item.sourceId} />
        </div>
      </div>
      <p className="kpi-label">{item.label}</p>
      <p className="kpi-value">
        {valueQualifierPrefix(item.value_qualifier, item.approx)}
        {valueText}
        {unitText ? <span className="kpi-unit">{unitText}</span> : null}
      </p>
      <p className="kpi-period">{item.period}</p>
      {item.altDisplay ? <p className="kpi-alt">{item.altDisplay}</p> : null}
      {item.note ? <p className="kpi-note">{item.note}</p> : null}
    </article>
  )
}

export function SourceDialog() {
  const { source, closeSource } = useSources()
  if (!source) return null

  return (
    <div className="modal-back" onClick={closeSource} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="source-title">Источник показателя</h2>
          <button type="button" className="ghost-btn" onClick={closeSource} aria-label="Закрыть источник">
            Закрыть
          </button>
        </div>
        <dl className="source-dl">
          <dt>Организация</dt>
          <dd>{source.organization}</dd>
          <dt>Публикация</dt>
          <dd>{source.publication}</dd>
          {source.period ? (
            <>
              <dt>Отчетный период</dt>
              <dd>{source.period}</dd>
            </>
          ) : null}
          {source.notes ? (
            <>
              <dt>Методологическая заметка</dt>
              <dd>{source.notes}</dd>
            </>
          ) : null}
          <dt>Статус источника</dt>
          <dd>
            <StatusBadge status={source.sourceStatus} />
          </dd>
          <dt>Первоисточник</dt>
          <dd>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          </dd>
        </dl>
      </div>
    </div>
  )
}
