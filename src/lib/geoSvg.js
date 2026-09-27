export const WORLD_MAP_WIDTH = 960
export const WORLD_MAP_HEIGHT = 500
const LAT_MIN = -56
const LAT_MAX = 78

export function projectLonLat(lon, lat) {
  const x = ((lon + 180) / 360) * WORLD_MAP_WIDTH
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * WORLD_MAP_HEIGHT
  return [x, y]
}

function ringToPath(ring) {
  if (!ring?.length) return ''
  return `${ring
    .map((point, index) => {
      const [x, y] = projectLonLat(point[0], point[1])
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')} Z`
}

export function geometryToPath(geometry) {
  if (!geometry) return ''
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringToPath).filter(Boolean).join(' ')
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((polygon) => polygon.map(ringToPath).filter(Boolean).join(' '))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

function visitProjectedPoints(geometry, visit) {
  if (!geometry) return
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates || []) {
      for (const point of ring || []) visit(point[0], point[1])
    }
    return
  }
  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates || []) {
      for (const ring of polygon || []) {
        for (const point of ring || []) visit(point[0], point[1])
      }
    }
  }
}

export function geometryToBounds(geometry) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  visitProjectedPoints(geometry, (lon, lat) => {
    const [x, y] = projectLonLat(lon, lat)
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  })
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }
  return { minX, minY, maxX, maxY }
}

export function geometryToFocusBounds(geometry) {
  if (!geometry) return null
  if (geometry.type === 'Polygon') return geometryToBounds(geometry)
  if (geometry.type !== 'MultiPolygon') return geometryToBounds(geometry)
  let best = null
  let bestArea = -1
  for (const polygon of geometry.coordinates || []) {
    const bounds = geometryToBounds({ type: 'Polygon', coordinates: polygon })
    if (!bounds) continue
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)
    if (area > bestArea) {
      bestArea = area
      best = bounds
    }
  }
  return best
}

export function focusViewFromBounds(
  bounds,
  {
    width = WORLD_MAP_WIDTH,
    height = WORLD_MAP_HEIGHT,
    pad = 1.32,
    minK = 1.12,
    maxK = 2.28,
  } = {},
) {
  if (!bounds) return { x: 0, y: 0, k: 1 }
  const bw = Math.max(bounds.maxX - bounds.minX, 12)
  const bh = Math.max(bounds.maxY - bounds.minY, 12)
  const k = Math.min(maxK, Math.max(minK, Math.min(width / (bw * pad), height / (bh * pad))))
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  return {
    x: -k * (cx - width / 2),
    y: -k * (cy - height / 2),
    k,
  }
}
