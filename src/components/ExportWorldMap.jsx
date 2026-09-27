import { useEffect, useMemo, useRef, useState } from 'react'
import { KAZAKHSTAN_ISO3, iso3FromPartner } from '../data/exportMapIso'
import worldCountries from '../data/worldCountries110m.json'
import { formatNumber, formatSignedPercent, formatTonnes } from '../lib/format'
import {
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
  focusViewFromBounds,
  geometryToFocusBounds,
  geometryToPath,
} from '../lib/geoSvg'
import { useMapTheme } from '../hooks/useChartTheme'

function mixHex(from, to, t) {
  const parse = (hex) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
  const a = parse(from)
  const b = parse(to)
  const channel = (i) => Math.round(a[i] + (b[i] - a[i]) * t)
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`
}

function partnerFill(tonnes, max, palette) {
  if (typeof tonnes !== 'number' || max == null || max <= 0) return palette.empty
  const t = Math.max(0.16, Math.min(0.92, (tonnes / max) ** 0.62))
  return mixHex(palette.exportFrom, palette.exportTo, t)
}

function yoyCaption(period) {
  if (!period) return ''
  if (period.is_full_year) return `к ${period.year} году`
  return `к январю–июлю ${period.year}`
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const WORLD_VIEW = { x: 0, y: 0, k: 1 }

const COUNTRY_PATHS = worldCountries.features.map((feature) => ({
  iso: feature.properties.iso,
  name: feature.properties.name,
  d: geometryToPath(feature.geometry),
  bounds: geometryToFocusBounds(feature.geometry),
}))

export function ExportWorldMap({
  partners,
  nationalTonnes,
  yoyByCode,
  previousPeriod,
  comparableAvailable,
  selectedIso = null,
  onSelect,
}) {
  const palette = useMapTheme()
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const viewRef = useRef(WORLD_VIEW)
  const [hover, setHover] = useState(null)
  const [view, setView] = useState(WORLD_VIEW)
  const [isDragging, setIsDragging] = useState(false)
  viewRef.current = view

  const byIso = useMemo(() => {
    const map = new Map()
    for (const row of partners || []) {
      const iso =
        iso3FromPartner(row.code, row.countryEn) ||
        COUNTRY_PATHS.find(
          (country) =>
            country.name.toLowerCase() === String(row.countryEn || '').trim().toLowerCase(),
        )?.iso
      if (!iso || iso === KAZAKHSTAN_ISO3) continue
      map.set(iso, row)
    }
    return map
  }, [partners])

  const maxTonnes = useMemo(() => {
    const values = (partners || [])
      .map((row) => row.tonnes)
      .filter((value) => typeof value === 'number' && value > 0)
    return values.length ? Math.max(...values) : null
  }, [partners])

  useEffect(() => {
    if (!selectedIso) {
      setView(WORLD_VIEW)
      return
    }
    const country = COUNTRY_PATHS.find((item) => item.iso === selectedIso)
    setView(focusViewFromBounds(country?.bounds))
  }, [selectedIso])

  function pointFromEvent(event) {
    if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
      return { x: event.clientX, y: event.clientY }
    }
    const rect = event?.currentTarget?.getBoundingClientRect?.()
    if (rect) {
      return { x: rect.left + Math.min(rect.width, 80), y: rect.top + 16 }
    }
    return { x: 24, y: 24 }
  }

  function showTip(entry, event) {
    if (selectedIso && entry?.iso === selectedIso) return
    const point = pointFromEvent(event)
    setHover({
      ...entry,
      x: point.x,
      y: point.y,
    })
  }

  function hideTip() {
    setHover(null)
  }

  function selectIso(iso) {
    if (typeof onSelect !== 'function') return
    hideTip()
    onSelect(iso)
  }

  function onPointerDown(event) {
    if (selectedIso) return
    dragRef.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event) {
    if (hover) {
      setHover((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev))
    }
    if (selectedIso || !dragRef.current) return
    const dx = event.clientX - dragRef.current.x
    const dy = event.clientY - dragRef.current.y
    if (!dragRef.current.moved && Math.abs(dx) + Math.abs(dy) < 5) return
    dragRef.current.moved = true
    setIsDragging(true)
    setView({
      ...viewRef.current,
      x: dragRef.current.vx + dx,
      y: dragRef.current.vy + dy,
    })
  }

  function onPointerUp(event) {
    const drag = dragRef.current
    dragRef.current = null
    setIsDragging(false)
    if (drag?.moved) return
    const iso = event.target?.getAttribute?.('data-iso')
    if (!iso) {
      if (selectedIso) selectIso(null)
      return
    }
    if (iso === KAZAKHSTAN_ISO3) return
    const row = byIso.get(iso)
    if (typeof row?.tonnes !== 'number') return
    selectIso(iso)
  }

  useEffect(() => {
    const node = svgRef.current
    if (!node) return undefined
    function onWheel(event) {
      if (selectedIso) return
      event.preventDefault()
      const prev = viewRef.current
      const nextK = Math.min(4, Math.max(1, prev.k * (event.deltaY > 0 ? 0.88 : 1.14)))
      setView({ ...prev, k: nextK })
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [selectedIso])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && selectedIso) {
        event.preventDefault()
        selectIso(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIso, onSelect])

  const national = formatTonnes(nationalTonnes)
  const layerTransform = `translate(${WORLD_MAP_WIDTH / 2 + view.x}px, ${WORLD_MAP_HEIGHT / 2 + view.y}px) scale(${view.k}) translate(${-WORLD_MAP_WIDTH / 2}px, ${-WORLD_MAP_HEIGHT / 2}px)`

  return (
    <div className={`export-map-frame${selectedIso ? ' is-focused' : ''}`}>
      <svg
        ref={svgRef}
        className={`export-map-svg${selectedIso ? ' is-focused' : ''}`}
        viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
        role="img"
        aria-label="Карта стран-партнёров экспорта каменного угля Казахстана, ТН ВЭД 2701"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null
          setIsDragging(false)
        }}
        onMouseLeave={hideTip}
      >
        <rect width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} fill={palette.canvas} />
        <g
          className={`export-map-layer${isDragging ? ' is-dragging' : ''}${prefersReducedMotion() ? ' is-reduced' : ''}`}
          style={{ transform: layerTransform }}
        >
          {COUNTRY_PATHS.map((country) => {
            const isKazakhstan = country.iso === KAZAKHSTAN_ISO3
            const row = byIso.get(country.iso)
            const hasVolume = typeof row?.tonnes === 'number'
            const clickable = hasVolume && !isKazakhstan
            const isSelected = selectedIso === country.iso
            const fill = isKazakhstan
              ? palette.origin
              : hasVolume
                ? partnerFill(row.tonnes, maxTonnes, palette)
                : palette.empty
            return (
              <path
                key={country.iso}
                data-iso={country.iso}
                role={clickable ? 'button' : undefined}
                aria-pressed={clickable ? isSelected : undefined}
                aria-label={
                  isKazakhstan
                    ? 'Казахстан, страна-экспортёр'
                    : hasVolume
                      ? `${row.name}, объём экспорта. Открыть детализацию`
                      : country.name
                }
                className={`export-map-country${isKazakhstan ? ' is-origin' : ''}${clickable ? ' is-partner' : ''}${isSelected ? ' is-selected' : ''}${hover?.iso === country.iso ? ' is-hover' : ''}`}
                d={country.d}
                fill={fill}
                tabIndex={clickable ? 0 : -1}
                onPointerEnter={(event) =>
                  showTip(
                    {
                      iso: country.iso,
                      mapName: country.name,
                      isKazakhstan,
                      row,
                    },
                    event,
                  )
                }
                onMouseEnter={(event) =>
                  showTip(
                    {
                      iso: country.iso,
                      mapName: country.name,
                      isKazakhstan,
                      row,
                    },
                    event,
                  )
                }
                onMouseMove={(event) =>
                  showTip(
                    {
                      iso: country.iso,
                      mapName: country.name,
                      isKazakhstan,
                      row,
                    },
                    event,
                  )
                }
                onFocus={(event) =>
                  showTip(
                    {
                      iso: country.iso,
                      mapName: country.name,
                      isKazakhstan,
                      row,
                    },
                    event,
                  )
                }
                onBlur={hideTip}
                onKeyDown={(event) => {
                  if (!clickable) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectIso(country.iso)
                  }
                }}
              />
            )
          })}
        </g>
      </svg>
      {selectedIso ? null : (
        <div className="export-map-controls" aria-hidden="true">
          <button type="button" onClick={() => setView((prev) => ({ ...prev, k: Math.min(4, prev.k * 1.2) }))}>
            +
          </button>
          <button type="button" onClick={() => setView((prev) => ({ ...prev, k: Math.max(1, prev.k / 1.2) }))}>
            −
          </button>
          <button type="button" onClick={() => setView(WORLD_VIEW)}>
            Сброс
          </button>
        </div>
      )}
      {hover && hover.iso !== selectedIso ? (
        <div
          className="geo-map-tooltip export-map-tooltip"
          style={{
            left: Math.max(8, Math.min(hover.x + 14, window.innerWidth - 272)),
            top: Math.max(8, Math.min(hover.y + 14, window.innerHeight - 180)),
          }}
        >
          {hover.isKazakhstan ? (
            <>
              <strong>Казахстан</strong>
              <span>Страна-экспортёр</span>
              {typeof nationalTonnes === 'number' ? (
                <span>
                  {national.text} {national.unit} · ТН ВЭД 2701
                </span>
              ) : (
                <span>Национальный итог выбранного периода в API отсутствует.</span>
              )}
            </>
          ) : hover.row ? (
            <>
              <strong>{hover.row.name}</strong>
              <span>
                {formatTonnes(hover.row.tonnes).text} {formatTonnes(hover.row.tonnes).unit}
              </span>
              {hover.row.share != null ? (
                <span>{formatNumber(hover.row.share, 2)}% экспорта</span>
              ) : null}
              {comparableAvailable && yoyByCode?.get(hover.row.code)?.status === 'ok' &&
              yoyByCode.get(hover.row.code).pct != null ? (
                <span>
                  {formatSignedPercent(yoyByCode.get(hover.row.code).pct)} {yoyCaption(previousPeriod)}
                </span>
              ) : null}
              {comparableAvailable && yoyByCode?.get(hover.row.code)?.status === 'new' ? (
                <span>
                  Есть экспорт в текущем сопоставимом периоде; в предыдущем сопоставимом наборе не
                  зафиксирован.
                </span>
              ) : null}
              {hover.row.transit ? (
                <span>Страна-партнёр может не совпадать с конечным потребителем.</span>
              ) : null}
            </>
          ) : (
            <>
              <strong>{hover.mapName}</strong>
              <span>Экспорт в выбранном периоде не зафиксирован.</span>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
