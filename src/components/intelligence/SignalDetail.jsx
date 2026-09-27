import { Link } from 'react-router-dom'
import { IntelligenceDrawer } from './MetricInspector'

export function SignalDetail({ signal, onClose }) {
  if (!signal) return null
  const sourceUrl = signal.source?.url || null

  return (
    <IntelligenceDrawer title={signal.title || signal.domain} onClose={onClose}>
      <p className="intel-kicker">{signal.domain}</p>
      <p className="intel-headline">{signal.headline}</p>
      {signal.details?.length ? (
        <ul className="intel-detail-list">
          {signal.details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <dl className="intel-meta">
        <dt>Сравниваемые периоды</dt>
        <dd>{(signal.periods || []).join(' · ') || 'Не указано в текущем наборе данных'}</dd>
        {signal.unit ? (
          <>
            <dt>Единицы</dt>
            <dd>{signal.unit}</dd>
          </>
        ) : null}
        {signal.source?.organization ? (
          <>
            <dt>Источник</dt>
            <dd>{signal.source.organization}</dd>
          </>
        ) : null}
        {signal.source?.publication ? (
          <>
            <dt>Публикация</dt>
            <dd>{signal.source.publication}</dd>
          </>
        ) : null}
        {signal.methodologyScope ? (
          <>
            <dt>Методологический контур</dt>
            <dd>{signal.methodologyScope}</dd>
          </>
        ) : null}
        {signal.calculation ? (
          <>
            <dt>Расчёт</dt>
            <dd>{signal.calculation}</dd>
          </>
        ) : null}
      </dl>
      {signal.inputs?.length ? (
        <ul className="intel-inputs">
          {signal.inputs.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <strong>
                {row.value}
                {row.unit ? ` ${row.unit}` : ''}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="intel-actions">
        {signal.section ? (
          <Link className="ghost-btn" to={signal.section.to} onClick={onClose}>
            {signal.section.label}
          </Link>
        ) : null}
        {sourceUrl ? (
          <a className="ghost-btn" href={sourceUrl} target="_blank" rel="noreferrer">
            Официальный первоисточник
          </a>
        ) : null}
      </div>
    </IntelligenceDrawer>
  )
}
