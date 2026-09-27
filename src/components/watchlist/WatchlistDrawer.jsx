import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataSkeleton } from '../DataSkeleton'
import { useMarketSearch } from '../../context/MarketSearchContext'
import { useMetricTrace } from '../../context/MetricTraceContext'
import { useWatchlist } from '../../context/WatchlistContext'
import { BookmarkIcon } from './BookmarkIcon'

const EXIT_MS = 280

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function WatchlistDrawer() {
  const {
    open,
    closeWatchlist,
    items,
    loading,
    error,
    load,
    toggleMetric,
  } = useWatchlist()
  const { openTrace } = useMetricTrace()
  const { openSearch } = useMarketSearch()
  const headingId = useId()
  const closeRef = useRef(null)
  const exitTimer = useRef(null)
  const enterFrame = useRef(0)
  const closingRef = useRef(false)
  const phaseRef = useRef('closed')
  const [phase, setPhase] = useState('closed')

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
      closeWatchlist()
    }, delay)
  }

  function openMetric(entry, trigger) {
    if (!entry?.available) return
    const delay = prefersReducedMotion() ? 0 : EXIT_MS
    requestClose()
    window.setTimeout(() => {
      openTrace(entry.metric, entry.extras || {}, trigger)
    }, delay)
  }

  function openSearchFromEmpty() {
    const delay = prefersReducedMotion() ? 0 : EXIT_MS
    requestClose()
    window.setTimeout(() => openSearch(), delay)
  }

  if (phase === 'closed' && !open) return null

  const wrapClass =
    phase === 'open' ? 'watchlist-wrap is-open' : phase === 'exiting' ? 'watchlist-wrap is-exiting' : 'watchlist-wrap'

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
            <div>
              <h2 id={headingId}>Мой мониторинг</h2>
              <p className="watchlist-subtitle">Закреплённые показатели</p>
            </div>
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
          <div className="watchlist-body">
            {loading ? <DataSkeleton variant="compact" /> : null}
            {!loading && error ? (
              <div className="watchlist-state">
                <p>Не удалось загрузить мой мониторинг</p>
                <button type="button" className="ghost-btn" onClick={() => load()}>
                  Повторить
                </button>
              </div>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <div className="watchlist-state">
                <p>Здесь пока нет показателей</p>
                <span>Откройте карточку «О показателе» и добавьте важный показатель в свой мониторинг.</span>
                <button type="button" className="ghost-btn" onClick={openSearchFromEmpty}>
                  Открыть поиск
                </button>
              </div>
            ) : null}
            {!loading && !error
              ? items.map((entry) => (
                  <WatchlistCard
                    key={entry.key}
                    entry={entry}
                    onOpen={(event) => openMetric(entry, event.currentTarget)}
                    onRemove={() => toggleMetric(entry.key)}
                    onClose={requestClose}
                  />
                ))
              : null}
          </div>
        </aside>
      </div>
    </div>
  )
}

function WatchlistCard({ entry, onOpen, onRemove, onClose }) {
  if (!entry.available) {
    return (
      <article className="watchlist-card">
        <p className="watchlist-card-title">Нет подтверждённых данных</p>
        <button type="button" className="ghost-btn" onClick={onRemove} aria-label="Убрать из мониторинга">
          Убрать
        </button>
      </article>
    )
  }

  const record = entry.record
  const meta = [record.period, record.status].filter(Boolean).join(' · ')

  return (
    <article className="watchlist-card">
      <p className="watchlist-card-kicker">{record.routeLabel || 'Показатель'}</p>
      <h3 className="watchlist-card-title">{record.title}</h3>
      {record.display ? (
        <p className="watchlist-card-value">
          {record.display}
          {record.unit ? <span> {record.unit}</span> : null}
        </p>
      ) : null}
      {meta ? <p className="watchlist-card-meta">{meta}</p> : null}
      {record.publisher ? <p className="watchlist-card-source">{record.publisher}</p> : null}
      <div className="watchlist-card-actions">
        <button type="button" className="ghost-btn" onClick={onOpen}>
          О показателе
        </button>
        {record.route ? (
          <Link className="ghost-btn" to={record.route} onClick={onClose}>
            Перейти к разделу
          </Link>
        ) : null}
        <button type="button" className="ghost-btn watchlist-remove" onClick={onRemove} aria-label="Убрать из мониторинга">
          <BookmarkIcon filled />
          Убрать
        </button>
      </div>
    </article>
  )
}
