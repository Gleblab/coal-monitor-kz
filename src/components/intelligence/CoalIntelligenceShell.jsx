import { useEffect, useId, useRef, useState } from 'react'
import { useScenario } from '../../context/ScenarioContext'
import {
  SCENARIO_ASSETS,
  SCENARIO_HORIZONS,
  SCENARIO_REGIONS,
  VIEW_MODE_CONTROL,
  formatSliceLine,
  formatViewModeLine,
} from '../../lib/scenarioSlice.js'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function SegmentedRadios({ label, value, options, onChange, size = 'primary', name }) {
  const groupRef = useRef(null)

  function handleKeyDown(event) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const enabled = options.filter((item) => !item.disabled)
    const index = enabled.findIndex((item) => item.id === value)
    let next = index
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = enabled.length - 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index <= 0 ? enabled.length - 1 : index - 1
    else next = index >= enabled.length - 1 ? 0 : index + 1
    const picked = enabled[next]
    if (picked) onChange(picked.id)
  }

  return (
    <div
      className={`ci-seg is-${size}`}
      role="radiogroup"
      aria-label={label}
      ref={groupRef}
      onKeyDown={handleKeyDown}
    >
      {options.map((item) => {
        const checked = item.id === value
        return (
          <button
            key={String(item.id)}
            type="button"
            role="radio"
            name={name}
            aria-checked={checked}
            aria-label={item.ariaLabel || item.label}
            tabIndex={checked ? 0 : -1}
            className={`ci-seg-btn${checked ? ' is-active' : ''}`}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
          >
            <span className="ci-seg-full">{item.label}</span>
            <span className="ci-seg-short">{item.shortLabel || item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ScenarioListbox({ id, label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const selected = options.find((item) => item.id === value) || options[0]
  const listId = `${id}-list`

  useEffect(() => {
    if (!open) return undefined
    function onDoc(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(option) {
    if (!option.enabled) return
    onChange(option.id)
    setOpen(false)
  }

  function onTriggerKey(event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function onListKey(event) {
    const enabled = options.filter((item) => item.enabled)
    const index = enabled.findIndex((item) => item.id === value)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = enabled[Math.min(enabled.length - 1, index + 1)]
      if (next) onChange(next.id)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = enabled[Math.max(0, index - 1)]
      if (next) onChange(next.id)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(false)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      if (enabled[0]) onChange(enabled[0].id)
    }
    if (event.key === 'End') {
      event.preventDefault()
      if (enabled[enabled.length - 1]) onChange(enabled[enabled.length - 1].id)
    }
  }

  return (
    <div className={`ci-listbox${open ? ' is-open' : ''}`} ref={rootRef}>
      <span className="ci-field-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        type="button"
        className="ci-listbox-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label || ''}`}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKey}
      >
        {selected?.label}
      </button>
      {open ? (
        <ul
          id={listId}
          className="ci-listbox-menu"
          role="listbox"
          aria-labelledby={`${id}-label`}
          ref={listRef}
          tabIndex={-1}
          onKeyDown={onListKey}
        >
          {options.map((option) => (
            <li key={String(option.id)} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.id === value}
                aria-disabled={!option.enabled}
                disabled={!option.enabled}
                className={`ci-listbox-option${option.id === value ? ' is-selected' : ''}${option.enabled ? '' : ' is-disabled'}`}
                onClick={() => pick(option)}
              >
                <span>{option.label}</span>
                {!option.enabled && option.reason ? <small>{option.reason}</small> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SliceSheet({ open, onClose, triggerRef }) {
  const { regionId, assetId, setRegionId, setAssetId } = useScenario()
  const titleId = useId()
  const closeRef = useRef(null)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => closeRef.current?.focus(), reduced ? 0 : 40)
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [open, onClose, reduced])

  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) {
      wasOpen.current = true
      return undefined
    }
    if (wasOpen.current) {
      wasOpen.current = false
      triggerRef.current?.focus()
    }
    return undefined
  }, [open, triggerRef])

  if (!open) return null

  return (
    <div className="ci-sheet-back" onClick={onClose} role="presentation">
      <div
        className="ci-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ci-sheet-head">
          <h2 id={titleId}>Аналитический срез</h2>
          <button type="button" className="ghost-btn ci-sheet-close" ref={closeRef} onClick={onClose}>
            Закрыть
          </button>
        </div>
        <p className="ci-sheet-hint">Сначала регион, затем актив. Национальные наблюдения в регион или актив не подставляются.</p>
        <div className="ci-sheet-fields">
          <p className="ci-field-label" id="ci-sheet-region-label">
            Регион
          </p>
          <div role="radiogroup" aria-labelledby="ci-sheet-region-label" className="ci-sheet-choices">
            {SCENARIO_REGIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={regionId === item.id}
                className={`ci-sheet-choice${regionId === item.id ? ' is-active' : ''}`}
                disabled={!item.enabled}
                onClick={() => setRegionId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="ci-field-label" id="ci-sheet-asset-label">
            Актив
          </p>
          <div role="radiogroup" aria-labelledby="ci-sheet-asset-label" className="ci-sheet-choices">
            {SCENARIO_ASSETS.map((item) => (
              <button
                key={String(item.id)}
                type="button"
                role="radio"
                aria-checked={assetId === item.id}
                className={`ci-sheet-choice${assetId === item.id ? ' is-active' : ''}`}
                disabled={!item.enabled}
                onClick={() => setAssetId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="ghost-btn ci-sheet-done" onClick={onClose}>
          Готово
        </button>
      </div>
    </div>
  )
}

export function CoalIntelligenceShell() {
  const slice = useScenario()
  const [sheetOpen, setSheetOpen] = useState(false)
  const changeRef = useRef(null)
  const contextLine = formatSliceLine(slice)
  const compactLine = formatSliceLine(slice, { compact: true })
  const modeLine = formatViewModeLine(slice.viewMode)

  return (
    <header className="ci-shell">
      <div className="ci-head">
        <p className="ci-kicker">06 · Перспективы и развитие</p>
        <h1>Сценарий</h1>
        <p className="ci-sub">Контур чтения · Казахстан</p>
        <p className="ci-lede">Верифицированный контур планов, фактов и ограничений угольного рынка.</p>
      </div>

      <div className="ci-context" aria-live="polite">
        <p className="ci-context-slice">{contextLine}</p>
        <p className="ci-context-mode">{modeLine}</p>
      </div>

      <div className="ci-mobile-strip">
        <div>
          <p className="ci-context-slice">{compactLine}</p>
          <p className="ci-context-mode">{modeLine}</p>
        </div>
        <button
          type="button"
          className="ghost-btn ci-change"
          ref={changeRef}
          onClick={() => setSheetOpen(true)}
        >
          Изменить
        </button>
      </div>

      <div className="ci-instrument" aria-label="Аналитический инструмент">
        <div className="ci-instrument-primary">
          <span className="ci-field-label" id="ci-viewmode-label">
            Контур
          </span>
          <SegmentedRadios
            label="Аналитический контур"
            name="ci-view-mode"
            size="primary"
            value={slice.viewMode}
            onChange={slice.setViewMode}
            options={VIEW_MODE_CONTROL.map((item) => ({
              id: item.id,
              label: item.label,
              shortLabel: item.shortLabel,
            }))}
          />
        </div>
        <div className="ci-instrument-horizon">
          <span className="ci-field-label" id="ci-horizon-label">
            Горизонт
          </span>
          <SegmentedRadios
            label="Горизонт"
            name="ci-horizon"
            size="secondary"
            value={slice.horizon}
            onChange={slice.setHorizon}
            options={SCENARIO_HORIZONS.map((year) => ({
              id: year,
              label: String(year),
              shortLabel: String(year),
            }))}
          />
        </div>
        <div className="ci-instrument-slice">
          <ScenarioListbox
            id="ci-region"
            label="Регион"
            value={slice.regionId}
            options={SCENARIO_REGIONS}
            onChange={slice.setRegionId}
          />
          <ScenarioListbox
            id="ci-asset"
            label="Актив"
            value={slice.assetId}
            options={SCENARIO_ASSETS}
            onChange={slice.setAssetId}
          />
        </div>
      </div>

        <p className="ci-note">
          Срез задаёт охват чтения. Национальные наблюдения не подставляются в регион или актив.
        </p>

        <SliceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} triggerRef={changeRef} />
    </header>
  )
}
