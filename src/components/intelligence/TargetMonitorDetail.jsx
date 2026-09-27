import { Link } from 'react-router-dom'
import { IntelligenceDrawer } from './MetricInspector'
import { resolveMonitorSource } from '../../lib/targetMonitor'

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

export function TargetMonitorDetail({ item, onClose }) {
  if (!item) return null
  const targetSource = resolveMonitorSource(item.target?.sourceId)
  const factSource = resolveMonitorSource(item.fact?.sourceId)
  const targetUrl = item.target?.sourceUrl || targetSource?.url || null
  const factUrl = item.fact?.sourceUrl || factSource?.url || null

  return (
    <IntelligenceDrawer title={item.direction} onClose={onClose}>
      <p className="intel-kicker">2026 Monitor</p>
      <dl className="intel-meta">
        <MetaRow label="Направление" value={item.direction} />
        <MetaRow label="Цель / план" value={item.targetDisplay} />
        <MetaRow label="Период цели" value={item.target?.periodLabel} />
        <MetaRow
          label="Тип цели"
          value={
            item.target?.measureKind === 'expected'
              ? 'ожидание'
              : item.target?.measureKind === 'target'
                ? 'целевой показатель'
                : 'план'
          }
        />
        <MetaRow
          label="Доступный факт"
          value={item.factDisplay || 'Подтверждённый факт исполнения: нет данных'}
        />
        <MetaRow label="Период факта" value={item.fact?.periodLabel} />
        <MetaRow label="Единица" value={item.target?.unit} />
        <MetaRow label="География" value={item.target?.geographyLabel} />
        <MetaRow label="Сущность" value={item.target?.entityLabel} />
        <MetaRow label="Сопоставимость" value={item.comparabilityLabel} />
        <MetaRow label="Статус данных" value={item.dataStatusLabel} />
        <MetaRow label="Почему" value={item.evaluation?.reason} />
        <MetaRow label="Источник цели" value={targetSource?.organization || targetSource?.publication} />
        <MetaRow label="Публикация цели" value={targetSource?.publication} />
        <MetaRow label="Методология цели" value={item.target?.methodologyNote} />
        <MetaRow label="Источник факта" value={factSource?.organization} />
        <MetaRow label="Публикация факта" value={factSource?.publication} />
        <MetaRow label="Методология факта" value={item.fact?.methodologyNote} />
        <MetaRow label="Первоисточник цели" value={targetUrl} href={targetUrl} />
        {factUrl && factUrl !== targetUrl ? (
          <MetaRow label="Первоисточник факта" value={factUrl} href={factUrl} />
        ) : null}
      </dl>
      {item.baselineCaption ? <p className="intel-headline">{item.baselineCaption}</p> : null}
      {item.evaluation?.comparable && item.evaluation.completion != null ? (
        <p className="intel-headline">
          Сопоставимое выполнение: {item.evaluation.completion.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%
        </p>
      ) : null}
      {item.extraFacts.map((row) => (
        <p key={row.label} className="chart-hint">
          {row.label}: {row.value}
        </p>
      ))}
      {item.warning ? <p className="intel-conflict">{item.warning}</p> : null}
      {item.related ? (
        <p className="intel-actions">
          <Link className="ghost-btn" to={item.related.to} onClick={onClose}>
            {item.related.label}
          </Link>
        </p>
      ) : null}
    </IntelligenceDrawer>
  )
}
