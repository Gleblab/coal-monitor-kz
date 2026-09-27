import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useComparison } from '../../context/ComparisonContext'
import { useMetricTrace } from '../../context/MetricTraceContext'
import { useWatchlist } from '../../context/WatchlistContext'
import { BookmarkIcon } from '../watchlist/BookmarkIcon'

const EXIT_MS = 280

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Row({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="metric-trace-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function MetricTraceDrawer() {
  const { record, closeTrace } = useMetricTrace()
  const { addComparisonItem, isCompared } = useComparison()
  const { isWatched, toggleMetric } = useWatchlist()
  const headingId = useId()
  const closeRef = useRef(null)
  const exitTimer = useRef(null)
  const enterFrame = useRef(0)
  const closingRef = useRef(false)
  const shownRef = useRef(null)
  const phaseRef = useRef('closed')
  const [phase, setPhase] = useState('closed')

  if (record) shownRef.current = record
  const shown = record || shownRef.current
  phaseRef.current = phase

  useEffect(() => {
    if (!record) return undefined
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
  }, [record])

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
    if (!shownRef.current || closingRef.current) return
    const current = phaseRef.current
    if (current === 'exiting' || current === 'closed') return
    closingRef.current = true
    window.cancelAnimationFrame(enterFrame.current)
    setPhase('exiting')
    const delay = prefersReducedMotion() ? 0 : EXIT_MS
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null
      closingRef.current = false
      shownRef.current = null
      setPhase('closed')
      closeTrace()
    }, delay)
  }

  if (phase === 'closed' || !shown) return null

  const compared = shown.id ? isCompared(shown.id) : false
  const watched = shown.watchlistKey ? isWatched(shown.watchlistKey) : false
  const kicker = [shown.status, shown.year || shown.period].filter(Boolean).join(' · ')

  function handleAdd() {
    if (!shown.comparable || compared || closingRef.current) return
    addComparisonItem(shown.comparisonMetric, shown.comparisonExtras, { addOnly: true })
  }

  const wrapClass =
    phase === 'open' ? 'metric-trace-wrap is-open' : phase === 'exiting' ? 'metric-trace-wrap is-exiting' : 'metric-trace-wrap'

  return (
    <div className={wrapClass}>
      <div className="intel-drawer-back" onClick={requestClose} role="presentation">
        <aside
          className="intel-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="intel-drawer-head">
            <h2 id={headingId}>{shown.title || 'Показатель'}</h2>
            <button
              ref={closeRef}
              type="button"
              className="ghost-btn"
              onClick={requestClose}
              aria-label="Закрыть панель"
            >
              Закрыть
            </button>
          </div>
          <div className="metric-trace-body">
            <header className="metric-trace-hero">
              {shown.title ? <p className="metric-trace-kicker">{shown.title}</p> : null}
              {shown.display ? (
                <p className="metric-trace-value">
                  {shown.display}
                  {shown.unit ? <span> {shown.unit}</span> : null}
                </p>
              ) : null}
              {kicker ? <p className="metric-trace-status">{kicker}</p> : null}
              {shown.derivedNote ? <p className="metric-trace-derived">{shown.derivedNote}</p> : null}
            </header>

            {shown.emptyCopy ? <p className="chart-hint">{shown.emptyCopy}</p> : null}

            <section className="metric-trace-block">
              <h3>О показателе</h3>
              <dl>
                <Row label="Что показывает" value={shown.meaning} />
                <Row label="Период" value={shown.period} />
                <Row label="География" value={shown.geography} />
                <Row label="Статус" value={shown.status} />
                <Row label="Единица" value={shown.unit} />
              </dl>
            </section>

            {shown.publisher || shown.publication || shown.sourceUrl ? (
              <section className="metric-trace-block">
                <h3>Источник</h3>
                {shown.publisher ? <p className="metric-trace-publisher">{shown.publisher}</p> : null}
                <dl>
                  <Row label="Публикация" value={shown.publication} />
                </dl>
                {shown.sourceUrl ? (
                  <a className="ghost-btn metric-trace-link" href={shown.sourceUrl} target="_blank" rel="noreferrer">
                    Открыть первоисточник
                  </a>
                ) : null}
              </section>
            ) : null}

            {shown.methodology ? (
              <section className="metric-trace-block">
                <h3>Как считать показатель</h3>
                <p>{shown.methodology}</p>
              </section>
            ) : null}

            {shown.limitation ? (
              <section className="metric-trace-block is-caution">
                <h3>Важно при сравнении</h3>
                <p>{shown.limitation}</p>
              </section>
            ) : null}

            {shown.watchlistKey || shown.comparable || shown.route ? (
              <div className="metric-trace-actions">
                {shown.watchlistKey ? (
                  <button
                    type="button"
                    className="ghost-btn watchlist-toggle"
                    onClick={() => toggleMetric(shown.watchlistKey)}
                  >
                    <BookmarkIcon filled={watched} />
                    {watched ? 'В моём мониторинге' : 'Добавить в мой мониторинг'}
                  </button>
                ) : null}
                {shown.comparable ? (
                  <button type="button" className="ghost-btn" onClick={handleAdd} disabled={compared}>
                    {compared ? 'Добавлено в сравнение' : 'Добавить в сравнение'}
                  </button>
                ) : null}
                {shown.route ? (
                  <Link className="ghost-btn" to={shown.route} onClick={requestClose}>
                    Перейти к разделу{shown.routeLabel ? `: ${shown.routeLabel}` : ''}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
