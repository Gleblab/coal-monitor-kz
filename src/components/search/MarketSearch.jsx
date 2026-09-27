import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFilters } from '../../context/FilterContext'
import { useMarketSearch } from '../../context/MarketSearchContext'
import { useMetricTrace } from '../../context/MetricTraceContext'
import {
  quickAccessItems,
  searchMarketIndex,
  TYPE_LABELS,
} from '../../lib/marketSearch'

function isMacPlatform() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
}

export function MarketSearchButton() {
  const { openSearch } = useMarketSearch()
  const shortcutHint = isMacPlatform() ? '⌘K' : 'Ctrl+K'
  return (
    <button
      type="button"
      className="market-search-trigger"
      title={`Поиск по данным · ${shortcutHint}`}
      aria-label="Поиск"
      onClick={(event) => openSearch(event.currentTarget)}
    >
      <svg
        className="market-search-trigger-icon"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6.75" cy="6.75" r="4.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 10.25 13.25 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="market-search-trigger-label">Поиск</span>
    </button>
  )
}

export function MarketSearchPalette() {
  const { open, items, closeSearch } = useMarketSearch()
  const { openTrace } = useMetricTrace()
  const { setRegion } = useFilters()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const dialogRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState('closed')
  const titleId = useId()
  const inputId = useId()
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const results = useMemo(() => searchMarketIndex(items, query), [items, query])
  const quick = useMemo(() => quickAccessItems(items), [items])
  const list = query.trim() ? results : quick
  const emptyQuery = !query.trim()

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
      setPhase('closed')
      return undefined
    }
    setPhase('entering')
    const frame = window.requestAnimationFrame(() => {
      setPhase('open')
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function requestClose() {
    if (reducedMotion) {
      setPhase('closed')
      closeSearch()
      return
    }
    setPhase('exiting')
    window.setTimeout(() => {
      setPhase('closed')
      closeSearch()
    }, 160)
  }

  function activate(item) {
    if (!item) return
    requestClose()
    window.setTimeout(() => {
      if (item.type === 'metric' && item.traceMetric) {
        openTrace(item.traceMetric, item.traceExtras || {})
        return
      }
      if (item.type === 'region' && item.regionId) {
        setRegion(item.regionId)
        navigate('/geography')
        return
      }
      if (item.type === 'company') {
        navigate('/companies', item.companyCode ? { state: { companyCode: item.companyCode } } : undefined)
        return
      }
      if (item.route) navigate(item.route)
    }, reducedMotion ? 0 : 180)
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(Math.max(list.length - 1, 0), index + 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      activate(list[activeIndex])
    }
  }

  function onDialogKeyDown(event) {
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll('input, button, a[href]')
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open && phase === 'closed') return null

  return (
    <div
      className={`market-search-overlay is-${phase}`}
      onClick={requestClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="market-search-dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <header className="market-search-head">
          <h2 id={titleId}>Поиск по Coal Monitor KZ</h2>
          <input
            id={inputId}
            ref={inputRef}
            className="market-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Показатель, компания, регион или источник..."
            aria-label="Поиск по Coal Monitor KZ"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </header>
        <div className="market-search-body" role="listbox" aria-label="Результаты поиска">
          {emptyQuery ? (
            <>
              <p className="market-search-kicker">Быстрый доступ</p>
              {quick.map((item, index) => (
                <SearchResultRow
                  key={item.id}
                  item={item}
                  active={index === activeIndex}
                  onHover={() => setActiveIndex(index)}
                  onActivate={() => activate(item)}
                />
              ))}
              <p className="market-search-hint">Можно искать по названию или значению показателя.</p>
            </>
          ) : results.length === 0 ? (
            <div className="market-search-empty">
              <p>Ничего не найдено</p>
              <span>Попробуйте название показателя, компании, региона или источника.</span>
            </div>
          ) : (
            results.map((item, index) => (
              <SearchResultRow
                key={item.id}
                item={item}
                active={index === activeIndex}
                onHover={() => setActiveIndex(index)}
                onActivate={() => activate(item)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SearchResultRow({ item, active, onHover, onActivate }) {
  const metricMeta =
    item.type === 'metric' && (item.value || item.period)
      ? [item.value && item.unit ? `${item.value} ${item.unit}` : item.value, item.period].filter(Boolean).join(' · ')
      : item.hint || null
  const sourceActions = item.type === 'source'

  return (
    <div
      role="option"
      aria-selected={active}
      className={`market-search-row${active ? ' is-active' : ''}`}
      onMouseEnter={onHover}
    >
      <button type="button" className="market-search-main" onClick={onActivate}>
        <span className="market-search-type">{TYPE_LABELS[item.type] || item.type}</span>
        <strong>{item.title}</strong>
        {item.subtitle ? <span className="market-search-sub">{item.subtitle}</span> : null}
        {metricMeta ? <span className="market-search-meta">{metricMeta}</span> : null}
      </button>
      {sourceActions ? (
        <div className="market-search-actions">
          <button type="button" className="ghost-btn" onClick={onActivate}>
            Перейти к источникам
          </button>
          {item.sourceUrl ? (
            <a className="ghost-btn" href={item.sourceUrl} target="_blank" rel="noreferrer">
              Открыть первоисточник
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
