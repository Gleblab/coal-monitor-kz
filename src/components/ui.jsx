import { useSources } from '../context/SourceContext'
import { formatNumber } from '../lib/format'

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

export function StateBlock({ loading, error, empty, emptyText, children }) {
  if (loading) return <div className="state-block">Загрузка…</div>
  if (error) return <div className="state-block error">{error}</div>
  if (empty) {
    return <div className="state-block">{emptyText || 'Нет подтвержденных данных'}</div>
  }
  return children
}

export function NoData({ text }) {
  return (
    <div className="no-data">
      <strong>Нет подтвержденных данных</strong>
      {text ? <p>{text}</p> : null}
    </div>
  )
}

export function KpiCard({ item }) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <StatusBadge status={item.status} />
        <SourceButton sourceId={item.sourceId} />
      </div>
      <p className="kpi-label">{item.label}</p>
      <p className="kpi-value">
        {item.approx ? '≈ ' : ''}
        {item.display || formatNumber(item.value)}
        <span className="kpi-unit">{item.unit}</span>
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
          <button type="button" className="ghost-btn" onClick={closeSource}>
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
