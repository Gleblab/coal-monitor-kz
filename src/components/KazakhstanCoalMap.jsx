import { useMemo, useState } from 'react'
import { GEOGRAPHY_STATUS_2025, GEOGRAPHY_STATUS_LABEL } from '../data/geographyStatuses'
import { KZ_MAP_ATTRIBUTION, KZ_MAP_REGIONS, KZ_MAP_VIEWBOX } from '../data/kazakhstanRegionsMap'
import { formatCoalVolume } from '../lib/format'
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

function publicationStatus(code, data) {
  if (data && typeof data.value === 'number') return 'numeric'
  if (GEOGRAPHY_STATUS_2025[code] === 'confidential') return 'confidential'
  return 'unpublished'
}

function regionFill(status, value, max, palette) {
  if (status === 'confidential') return palette.confidential
  if (status !== 'numeric' || value == null || max == null || max <= 0) return palette.empty
  const t = Math.max(0.14, Math.min(0.88, (value / max) ** 0.72))
  return mixHex(palette.heatFrom, palette.heatTo, t)
}

export function KazakhstanCoalMap({ byCode, sourceLabel = 'БНС' }) {
  const palette = useMapTheme()
  const [hover, setHover] = useState(null)
  const max = useMemo(() => {
    const values = Object.values(byCode || {})
      .map((item) => item?.value)
      .filter((value) => typeof value === 'number')
    return values.length ? Math.max(...values) : null
  }, [byCode])

  function showTip(entry, event) {
    setHover({
      ...entry,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function hideTip() {
    setHover(null)
  }

  return (
    <div className="geo-map-frame">
      <svg
        className="geo-map-svg"
        viewBox={KZ_MAP_VIEWBOX}
        role="img"
        aria-label="Административная карта Казахстана, добыча угля 2025"
        onMouseLeave={hideTip}
      >
        {KZ_MAP_REGIONS.map((region) => {
          const data = byCode?.[region.id] || null
          const status = publicationStatus(region.id, data)
          const volume = status === 'numeric' ? formatCoalVolume(data.value) : null
          return (
            <path
              key={region.id}
              className={`geo-map-region is-${status}${hover?.id === region.id ? ' is-hover' : ''}`}
              d={region.d}
              fill={regionFill(status, data?.value, max, palette)}
              onPointerUp={(event) =>
                showTip({ id: region.id, name: data?.name || region.name, data, status, volume }, event)
              }
              onMouseEnter={(event) =>
                showTip({ id: region.id, name: data?.name || region.name, data, status, volume }, event)
              }
              onMouseMove={(event) =>
                showTip({ id: region.id, name: data?.name || region.name, data, status, volume }, event)
              }
              onFocus={(event) =>
                showTip({ id: region.id, name: data?.name || region.name, data, status, volume }, event)
              }
              onBlur={hideTip}
              tabIndex={0}
            />
          )
        })}
      </svg>
      {hover ? (
        <div
          className="geo-map-tooltip"
          style={{
            left: Math.max(8, Math.min(hover.x + 14, window.innerWidth - 248)),
            top: Math.max(8, Math.min(hover.y + 14, window.innerHeight - 140)),
          }}
        >
          <strong>{hover.name}</strong>
          {hover.status === 'numeric' && hover.volume ? (
            <>
              <span>
                {hover.volume.text} {hover.volume.unit}
              </span>
              <span>2025</span>
              <span>{sourceLabel}</span>
            </>
          ) : (
            <span>{GEOGRAPHY_STATUS_LABEL[hover.status] || GEOGRAPHY_STATUS_LABEL.unpublished}</span>
          )}
        </div>
      ) : null}
      <p className="geo-map-credit">{KZ_MAP_ATTRIBUTION}</p>
    </div>
  )
}
