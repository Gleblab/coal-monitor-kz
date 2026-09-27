import { Link } from 'react-router-dom'
import { IntelligenceDrawer } from './MetricInspector'

function MetaRow({ label, value, href }) {
  if (value == null || value === '') return null
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </>
  )
}

function ListBlock({ title, items }) {
  if (!items?.length) return null
  return (
    <div className="dq-block">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function DataQualityInspector({ contour, onClose }) {
  if (!contour) return null
  const urls = [...new Set((contour.sources || []).map((item) => item.url).filter(Boolean))]

  return (
    <IntelligenceDrawer title={contour.label} onClose={onClose}>
      <p className="intel-kicker">Центр качества данных</p>
      <dl className="intel-meta">
        <MetaRow label="Название контура" value={contour.label} />
        <MetaRow label="Последний доступный период" value={contour.latestPeriod || 'нет данных'} />
        <MetaRow label="Тип периода" value={contour.periodTypeLabel} />
        <MetaRow label="Покрытие" value={contour.coverageLabel} />
        <MetaRow label="География" value={contour.geography} />
        <MetaRow label="Качество / ограничение" value={contour.qualityLabel} />
        <MetaRow label="Факт FY 2026" value={contour.has2026Fact ? 'есть' : 'нет'} />
      </dl>
      <ListBlock title="Какие метрики покрываются" items={contour.metrics} />
      <ListBlock title="Основные источники" items={contour.sources.map((item) => item.publication || item.organization)} />
      <ListBlock title="Ограничения" items={contour.limitations} />
      <ListBlock title="Методологические замечания" items={contour.methodologyNotes} />
      <ListBlock title="Как интерпретировать данные" items={contour.cannot} />
      <ListBlock title="Допустимое сопоставление" items={contour.allowed} />
      {urls.map((url) => (
        <p key={url} className="dq-url">
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </p>
      ))}
      {contour.route ? (
        <p className="intel-actions">
          <Link className="ghost-btn" to={contour.route} onClick={onClose}>
            {contour.routeLabel || 'Открыть раздел'}
          </Link>
        </p>
      ) : null}
    </IntelligenceDrawer>
  )
}
