import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { inspectKpiRecord } from '../../lib/marketIntelligence'

export function IntelligenceDrawer({ title, onClose, children }) {
  const headingId = useId()
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="intel-drawer-back" onClick={onClose} role="presentation">
      <aside
        className="intel-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="intel-drawer-head">
          <h2 id={headingId}>{title}</h2>
          <button ref={closeRef} type="button" className="ghost-btn" onClick={onClose} aria-label="Закрыть панель">
            Закрыть
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}

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

export function MetricInspector({ item, conflict, sourceByCode, onClose }) {
  const record = inspectKpiRecord(item, { conflicts: conflict ? { [item.id]: conflict } : {}, sourceByCode })
  const [compareOpen, setCompareOpen] = useState(false)
  if (!record) return null
  const activeConflict = record.conflict

  return (
    <IntelligenceDrawer title={record.title || 'Показатель'} onClose={onClose}>
      <dl className="intel-meta">
        <MetaRow label="Название метрики" value={record.title} />
        <MetaRow label="Значение" value={record.value} />
        <MetaRow label="Единица" value={record.unit} />
        <MetaRow label="Период" value={record.period} />
        <MetaRow label="География" value={record.geography} />
        <MetaRow label="Статус" value={record.status} />
        <MetaRow label="Издатель" value={record.publisher} />
        <MetaRow label="Публикация" value={record.sourceName} />
        <MetaRow label="Методологический контур" value={record.methodologyScope} />
        <MetaRow label="Первоисточник" value={record.sourceUrl} href={record.sourceUrl} />
      </dl>
      {record.related ? (
        <p className="intel-actions">
          <Link className="ghost-btn" to={record.related.to} onClick={onClose}>
            {record.related.label}
          </Link>
        </p>
      ) : null}
      {activeConflict ? (
        <div className="intel-conflict">
          <p>{activeConflict.warning}</p>
          <button type="button" className="ghost-btn" onClick={() => setCompareOpen((open) => !open)}>
            {compareOpen ? 'Скрыть сравнение' : 'Сравнить методологии'}
          </button>
          {compareOpen ? (
            <div className="intel-compare">
              {activeConflict.sides.map((side) => (
                <article key={side.label}>
                  <h3>{side.label}</h3>
                  <p className="intel-compare-value">
                    {side.value} {side.unit}
                  </p>
                  <p>{side.period}</p>
                  <p>{side.contour}</p>
                </article>
              ))}
              <p className="intel-compare-note">{activeConflict.conclusion}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </IntelligenceDrawer>
  )
}
