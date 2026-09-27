import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataSkeleton } from '../DataSkeleton'
import { useChangeCenter } from '../../context/ChangeCenterContext'
import { useMetricTrace } from '../../context/MetricTraceContext'
import {
  CHANGE_CATEGORIES,
  changeCategoriesPresent,
  formatChangeDelta,
  formatChangeValue,
} from '../../lib/changeDetection'

const EXIT_MS = 280

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function directionMark(direction) {
  if (direction === 'increase') return '↑'
  if (direction === 'decrease') return '↓'
  return '→'
}

export function ChangeCenterDrawer() {
  const { open, closeChangeCenter, changes, loading, error, load } = useChangeCenter()
  const { openTrace } = useMetricTrace()
  const headingId = useId()
  const closeRef = useRef(null)
  const exitTimer = useRef(null)
  const enterFrame = useRef(0)
  const closingRef = useRef(false)
  const phaseRef = useRef('closed')
  const [phase, setPhase] = useState('closed')
  const [filter, setFilter] = useState('all')

  phaseRef.current = phase

  useEffect(() => {
    if (!open) return undefined
    closingRef.current = false
    if (exitTimer.current) {
      window.clearTimeout(exitTimer.current)
      exitTimer.current = null
    }
    window.cancelAnimationFrame(enterFrame.current)
    if (phaseRef.current === 'open' || phaseRef.current === 'entering') return undefined
    setPhase('entering')
    enterFrame.current = window.requestAnimationFrame(() => {
      enterFrame.current = window.requestAnimationFrame(() => {
        setPhase('open')
        closeRef.current?.focus()
      })
    })
    return undefined
  }, [open])

  const panelOpen = phase !== 'closed'

  useEffect(() => {
    if (!panelOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event) {
      if (event.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [panelOpen])

  useEffect(
    () => () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current)
      window.cancelAnimationFrame(enterFrame.current)
    },
    [],
  )

  function requestClose() {
    if (closingRef.current) return
    const current = phaseRef.current
    if (current === 'exiting' || current === 'closed') return
    closingRef.current = true
    window.cancelAnimationFrame(enterFrame.current)
    setPhase('exiting')
    const delay = prefersReducedMotion() ? 0 : EXIT_MS
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null
      closingRef.current = false
      setPhase('closed')
      closeChangeCenter()
    }, delay)
  }

  function openMetric(change, trigger) {
    if (!change?.traceMetric) return
    const delay = prefersReducedMotion() ? 0 : EXIT_MS
    requestClose()
    window.setTimeout(() => {
      openTrace(change.traceMetric, change.traceExtras || {}, trigger)
    }, delay)
  }

  if (phase === 'closed' && !open) return null

  const wrapClass =
    phase === 'open' ? 'watchlist-wrap is-open' : phase === 'exiting' ? 'watchlist-wrap is-exiting' : 'watchlist-wrap'
  const chips = changeCategoriesPresent(changes)
  const visible = filter === 'all' ? changes : changes.filter((item) => item.category === filter)
  const categoryLabel = (id) => CHANGE_CATEGORIES.find((item) => item.id === id)?.label || id

  return (
    <div className={wrapClass}>
      <div className="intel-drawer-back" onClick={requestClose} role="presentation">
        <aside
          className="intel-drawer change-center-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="intel-drawer-head change-center-head">
            <div>
              <h2 id={headingId}>Что изменилось?</h2>
              <p className="watchlist-subtitle">Изменения по сопоставимым опубликованным данным</p>
            </div>
            <button ref={closeRef} type="button" className="ghost-btn" onClick={requestClose} aria-label="Закрыть панель">
              Закрыть
            </button>
          </div>
          <div className="watchlist-body change-center-body">
            {loading ? <DataSkeleton variant="compact" /> : null}
            {!loading && error && changes.length === 0 ? (
              <div className="watchlist-state">
                <p>Не удалось загрузить изменения</p>
                <button type="button" className="ghost-btn" onClick={() => load()}>
                  Повторить
                </button>
              </div>
            ) : null}
            {!loading && !error && changes.length === 0 ? (
              <div className="watchlist-state">
                <p>Нет сопоставимых изменений</p>
                <span>
                  Для расчёта изменения нужны показатели с одинаковой методологией, единицей измерения и сопоставимыми
                  периодами.
                </span>
              </div>
            ) : null}
            {!loading && changes.length > 0 ? (
              <>
                <div className="change-chips" role="tablist" aria-label="Категории изменений">
                  <button
                    type="button"
                    className={`change-chip${filter === 'all' ? ' is-active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    Все
                  </button>
                  {chips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`change-chip${filter === chip.id ? ' is-active' : ''}`}
                      onClick={() => setFilter(chip.id)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                {visible.map((change) => (
                  <article key={change.id} className="watchlist-card change-card">
                    <p className="watchlist-card-kicker">{categoryLabel(change.category)}</p>
                    <h3 className="watchlist-card-title">{change.title}</h3>
                    <p className="watchlist-card-value">
                      {formatChangeValue(change, 'previous')} → {formatChangeValue(change, 'current')}
                    </p>
                    <p className="change-card-period">
                      <span>
                        {change.previous.period} → {change.current.period}
                      </span>
                      <span className="change-delta">
                        <span aria-hidden="true">{directionMark(change.direction)}</span> {formatChangeDelta(change)}
                      </span>
                    </p>
                    {change.source ? <p className="watchlist-card-source">{change.source}</p> : null}
                    <div className="change-card-actions">
                      {change.traceMetric ? (
                        <button
                          type="button"
                          className="change-card-link"
                          onClick={(event) => openMetric(change, event.currentTarget)}
                        >
                          О показателе
                        </button>
                      ) : null}
                      {change.route ? (
                        <Link className="change-card-link" to={change.route} onClick={requestClose}>
                          К разделу
                        </Link>
                      ) : null}
                      {change.sourceUrl ? (
                        <a className="change-card-link" href={change.sourceUrl} target="_blank" rel="noreferrer">
                          Источник
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path
                              d="M4 2.5H2.5A1 1 0 0 0 1.5 3.5v6A1 1 0 0 0 2.5 10.5h6a1 1 0 0 0 1-1V7.5M7 1.5h3.5V5M5.5 6.5 10.5 1.5"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
                <p className="change-note">
                  Изменения рассчитываются только между сопоставимыми опубликованными показателями. Плановые и фактические
                  значения, разные методологии и разные временные окна напрямую не сравниваются.
                </p>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
