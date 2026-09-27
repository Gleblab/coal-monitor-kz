import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useMetricTrace } from '../../context/MetricTraceContext'

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 7.15v3.2M8 5.35v.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M3 8h9M8.5 4.5 12.5 8 8.5 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PulseTraceAction({ item, extras }) {
  const { openTrace } = useMetricTrace()
  const ref = useRef(null)
  if (!item?.id) return null

  return (
    <button
      ref={ref}
      type="button"
      className="cmd-pulse-action"
      onClick={() => openTrace(item, extras, ref.current)}
    >
      <InfoIcon />
      О показателе
    </button>
  )
}

export function MarketPulse({ facts }) {
  if (!facts?.length) return null

  return (
    <section className="cmd-pulse" aria-labelledby="cmd-pulse-title">
      <h2 id="cmd-pulse-title">Пульс рынка</h2>
      <ul className="cmd-pulse-grid">
        {facts.map((fact) => (
          <li key={fact.id} className={`cmd-pulse-item${fact.kind === 'coverage' ? ' is-coverage' : ''}`}>
            <p className="cmd-kicker">{fact.label}</p>
            <p className={`cmd-pulse-value${fact.kind === 'coverage' ? ' is-status' : ''}`}>
              {fact.kind === 'coverage' ? <span className="cmd-pulse-dot" aria-hidden="true" /> : null}
              {fact.value}
              {fact.unit ? <span> {fact.unit}</span> : null}
            </p>
            {fact.period ? <p className="cmd-pulse-period">{fact.period}</p> : null}
            {fact.context ? <p className="cmd-pulse-context">{fact.context}</p> : null}
            {fact.href ? (
              <Link to={fact.href} className="cmd-pulse-action">
                <ArrowIcon />
                {fact.actionLabel || 'Посмотреть цены'}
              </Link>
            ) : (
              <PulseTraceAction item={fact.metric} extras={fact.traceExtras} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
