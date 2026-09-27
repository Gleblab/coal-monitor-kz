import { countryNameRu } from '../data/exportCountries'
import { getSource } from '../data/catalog'
import { evaluateComparison, toComparisonItem } from './comparison'
import { formatNumber, formatTonnes, formatUsdAmount } from './format'

export const CHANGE_CATEGORIES = [
  { id: 'production', label: 'Добыча' },
  { id: 'export', label: 'Экспорт' },
  { id: 'concentration', label: 'Концентрация' },
]

const CATEGORY_ORDER = CHANGE_CATEGORIES.map((item) => item.id)
const MAX_PARTNER_CHANGES = 3
const YTD_WINDOW = 'jan_jul'

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function directionOf(delta) {
  if (delta > 0) return 'increase'
  if (delta < 0) return 'decrease'
  return 'unchanged'
}

function publisherOf(sourceId) {
  return getSource(sourceId)?.organization || null
}

function sourceUrlOf(sourceId) {
  return getSource(sourceId)?.url || null
}

function comparablePair(previous, current, extraPrev, extraCurr) {
  const left = toComparisonItem(previous, extraPrev)
  const right = toComparisonItem(current, extraCurr)
  if (!left || !right) return null
  const verdict = evaluateComparison([left, right])
  if (!verdict.comparable) return null
  if (left.measureKind !== 'actual' || right.measureKind !== 'actual') return null
  return { left, right }
}

function makeChange({
  id,
  metricKey,
  category,
  title,
  previousValue,
  currentValue,
  previousPeriod,
  currentPeriod,
  unit,
  deltaMode,
  currentYear,
  route,
  sourceId,
  traceMetric,
  traceExtras,
}) {
  const from = finiteNumber(previousValue)
  const to = finiteNumber(currentValue)
  if (from == null || to == null) return null
  const delta = to - from
  const percentChange = deltaMode === 'percentage_points' || from === 0 ? null : (delta / from) * 100
  return {
    id,
    metricKey,
    category,
    title,
    previous: { value: from, period: previousPeriod },
    current: { value: to, period: currentPeriod },
    delta,
    percentChange,
    deltaMode: deltaMode || 'ratio',
    unit,
    direction: directionOf(delta),
    currentYear: currentYear || null,
    route,
    source: publisherOf(sourceId),
    sourceUrl: sourceUrlOf(sourceId),
    sourceId,
    traceMetric: traceMetric || null,
    traceExtras: traceExtras || null,
    comparability: 'comparable',
  }
}

function fromProduction(production) {
  const points = (production?.bnsSeries || [])
    .filter((row) => finiteNumber(row.value) != null && Number.isFinite(row.year))
    .slice()
    .sort((a, b) => a.year - b.year)
  if (points.length < 2) return []
  const previous = points[points.length - 2]
  const current = points[points.length - 1]
  const extra = {
    route: '/production',
    seriesKey: 'bns_industry_annual',
    measureKind: 'actual',
    periodKind: 'calendar_year',
    periodWindow: 'annual',
    geographyKey: 'national',
    methodology: 'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.',
  }
  const pair = comparablePair(
    { id: `bns-industry-${previous.year}`, value: previous.value, unit: previous.unit || 'млн т', year: previous.year, sourceId: previous.sourceId },
    { id: `bns-industry-${current.year}`, value: current.value, unit: current.unit || 'млн т', year: current.year, sourceId: current.sourceId },
    { ...extra, year: previous.year, sourceId: previous.sourceId, id: `bns-industry-${previous.year}` },
    { ...extra, year: current.year, sourceId: current.sourceId, id: `bns-industry-${current.year}` },
  )
  if (!pair) return []
  const sourceId = current.sourceId || previous.sourceId
  return [
    makeChange({
      id: `bns-production-${previous.year}-${current.year}`,
      metricKey: current.year === 2025 ? 'bnsIndustrial2025' : `bns-industry-${current.year}`,
      category: 'production',
      title: 'Промышленная добыча угля',
      previousValue: previous.value,
      currentValue: current.value,
      previousPeriod: String(previous.year),
      currentPeriod: String(current.year),
      unit: current.unit || 'млн т',
      currentYear: current.year,
      route: '/production',
      sourceId,
      traceMetric: {
        id: current.year === 2025 ? 'bnsIndustrial2025' : `bns-industry-${current.year}`,
        value: current.value,
        unit: current.unit || 'млн т',
        period: `${current.year} год`,
        sourceId,
        year: current.year,
      },
      traceExtras: {
        profileKey: 'bnsIndustrial',
        route: '/production',
        label: 'Добыча угля — данные БНС',
      },
    }),
  ].filter(Boolean)
}

function ytdPeriodLabel(period) {
  const year = period?.year
  if (!year) return null
  return `янв–июл ${year}`
}

function fromExportYtd(exportYtd) {
  if (!exportYtd?.ok) return []
  const current = exportYtd.currentPeriod
  const previous = exportYtd.previousPeriod
  if (!current || !previous) return []
  if (current.is_full_year || previous.is_full_year) return []
  if (current.is_full_year !== previous.is_full_year) return []
  if (current.measure_kind !== previous.measure_kind) return []

  const prevVol = finiteNumber(exportYtd.previousNational?.netWeightTonnes)
  const currVol = finiteNumber(exportYtd.currentNational?.netWeightTonnes)
  const prevUsd = finiteNumber(exportYtd.previousNational?.tradeValueUsd)
  const currUsd = finiteNumber(exportYtd.currentNational?.tradeValueUsd)
  const sourceId = 'bnsTradeYtd2026'
  const windowKey = YTD_WINDOW
  const extraBase = {
    route: '/exports',
    measureKind: 'actual',
    periodKind: 'ytd_jan_jul',
    periodWindow: windowKey,
    geographyKey: 'national',
    sourceId,
  }

  const items = []
  if (prevVol != null && currVol != null) {
    const pair = comparablePair(
      { id: 'export-ytd-prev-volume', value: prevVol, unit: 'т', year: previous.year },
      { id: 'export-ytd-curr-volume', value: currVol, unit: 'т', year: current.year },
      { ...extraBase, seriesKey: 'hs2701_ytd_volume', year: previous.year },
      { ...extraBase, seriesKey: 'hs2701_ytd_volume', year: current.year },
    )
    if (pair) {
      items.push(
        makeChange({
          id: `export-ytd-volume-${previous.year}-${current.year}`,
          metricKey: 'export-ytd-2026-volume',
          category: 'export',
          title: 'Объём экспорта каменного угля',
          previousValue: prevVol,
          currentValue: currVol,
          previousPeriod: ytdPeriodLabel(previous),
          currentPeriod: ytdPeriodLabel(current),
          unit: 'т',
          currentYear: current.year,
          route: '/exports',
          sourceId,
          traceMetric: {
            id: 'export-ytd-2026-volume',
            value: currVol / 1e6,
            display: formatTonnes(currVol, 3).text,
            unit: formatTonnes(currVol, 3).unit,
            period: ytdPeriodLabel(current),
            sourceId,
          },
          traceExtras: { profileKey: 'hsYtdVolume', route: '/exports' },
        }),
      )
    }
  }

  if (prevUsd != null && currUsd != null) {
    const pair = comparablePair(
      { id: 'export-ytd-prev-value', value: prevUsd, unit: 'USD', year: previous.year },
      { id: 'export-ytd-curr-value', value: currUsd, unit: 'USD', year: current.year },
      { ...extraBase, seriesKey: 'hs2701_ytd_value', year: previous.year },
      { ...extraBase, seriesKey: 'hs2701_ytd_value', year: current.year },
    )
    if (pair) {
      items.push(
        makeChange({
          id: `export-ytd-value-${previous.year}-${current.year}`,
          metricKey: 'export-ytd-2026-value',
          category: 'export',
          title: 'Стоимость экспорта каменного угля',
          previousValue: prevUsd,
          currentValue: currUsd,
          previousPeriod: ytdPeriodLabel(previous),
          currentPeriod: ytdPeriodLabel(current),
          unit: 'USD',
          currentYear: current.year,
          route: '/exports',
          sourceId,
          traceMetric: {
            id: 'export-ytd-2026-value',
            value: currUsd / 1e6,
            display: formatUsdAmount(currUsd, 1).text,
            unit: formatUsdAmount(currUsd, 1).unit,
            period: ytdPeriodLabel(current),
            sourceId,
          },
          traceExtras: { profileKey: 'hsYtdValue', route: '/exports' },
        }),
      )
    }
  }

  const partners = (exportYtd.countries || [])
    .filter((row) => finiteNumber(row.currentTonnes) != null && finiteNumber(row.previousTonnes) != null)
    .map((row) => ({
      ...row,
      absDelta: Math.abs(row.currentTonnes - row.previousTonnes),
    }))
    .sort((a, b) => b.absDelta - a.absDelta || String(a.partnerCode).localeCompare(String(b.partnerCode)))
    .slice(0, MAX_PARTNER_CHANGES)

  for (const row of partners) {
    const name = countryNameRu(row.partnerCode, row.partnerCountry)
    const pair = comparablePair(
      { id: `export-ytd-partner-prev-${row.partnerCode}`, value: row.previousTonnes, unit: 'т', year: previous.year },
      { id: `export-ytd-partner-curr-${row.partnerCode}`, value: row.currentTonnes, unit: 'т', year: current.year },
      { ...extraBase, seriesKey: `hs2701_ytd_volume:${row.partnerCode}`, year: previous.year, entity: name },
      { ...extraBase, seriesKey: `hs2701_ytd_volume:${row.partnerCode}`, year: current.year, entity: name },
    )
    if (!pair) continue
    items.push(
      makeChange({
        id: `export-ytd-partner-${row.partnerCode}-${previous.year}-${current.year}`,
        metricKey: `export-ytd-partner-${row.partnerCode}`,
        category: 'export',
        title: `Экспорт: ${name}`,
        previousValue: row.previousTonnes,
        currentValue: row.currentTonnes,
        previousPeriod: ytdPeriodLabel(previous),
        currentPeriod: ytdPeriodLabel(current),
        unit: 'т',
        currentYear: current.year,
        route: '/exports',
        sourceId,
      }),
    )
  }

  return items.filter(Boolean)
}

function fromConcentration(concentration) {
  const rows = concentration?.items || []
  const items = []
  for (const row of rows) {
    const values = (row.values || [])
      .filter((point) => finiteNumber(point.value) != null && Number.isFinite(point.year))
      .slice()
      .sort((a, b) => a.year - b.year)
    if (values.length < 2) continue
    const previous = values[values.length - 2]
    const current = values[values.length - 1]
    const extra = {
      route: '/concentration',
      seriesKey: `azrk_share_${row.segmentId || row.id}`,
      measureKind: 'actual',
      periodKind: 'calendar_year',
      periodWindow: 'annual',
      geographyKey: 'national',
      methodology: row.scope || row.methodology,
      sourceId: row.sourceId,
    }
    const pair = comparablePair(
      { id: `${row.id}-${previous.year}`, value: previous.value, unit: row.unit || '%', year: previous.year, sourceId: row.sourceId },
      { id: `${row.id}-${current.year}`, value: current.value, unit: row.unit || '%', year: current.year, sourceId: row.sourceId },
      { ...extra, year: previous.year, id: `${row.id}-${previous.year}` },
      { ...extra, year: current.year, id: `${row.id}-${current.year}` },
    )
    if (!pair) continue
    items.push(
      makeChange({
        id: `concentration-${row.id}-${previous.year}-${current.year}`,
        metricKey: row.id,
        category: 'concentration',
        title: row.segment || row.label || 'Концентрация сегмента',
        previousValue: previous.value,
        currentValue: current.value,
        previousPeriod: String(previous.year),
        currentPeriod: String(current.year),
        unit: 'п.п.',
        deltaMode: 'percentage_points',
        currentYear: current.year,
        route: '/concentration',
        sourceId: row.sourceId,
      }),
    )
  }
  return items.filter(Boolean)
}

function sortChanges(items) {
  return items.slice().sort((a, b) => {
    const yearDelta = (b.currentYear || 0) - (a.currentYear || 0)
    if (yearDelta !== 0) return yearDelta
    const catDelta = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (catDelta !== 0) return catDelta
    return String(a.title).localeCompare(String(b.title), 'ru')
  })
}

export function detectMarketChanges({ production, exportYtd, concentration } = {}) {
  return sortChanges([
    ...fromProduction(production),
    ...fromExportYtd(exportYtd),
    ...fromConcentration(concentration),
  ])
}

export function formatChangeValue(change, which) {
  const point = which === 'previous' ? change.previous : change.current
  if (!point || finiteNumber(point.value) == null) return null
  if (change.unit === 'т') {
    const formatted = formatTonnes(point.value, 3)
    return `${formatted.text} ${formatted.unit}`.trim()
  }
  if (change.unit === 'USD') {
    const formatted = formatUsdAmount(point.value, 1)
    return `${formatted.text} ${formatted.unit}`.trim()
  }
  if (change.deltaMode === 'percentage_points') {
    return `${formatNumber(point.value, 1)}%`
  }
  return `${formatNumber(point.value)} ${change.unit || ''}`.trim()
}

export function formatChangeDelta(change) {
  const delta = finiteNumber(change.delta)
  if (delta == null) return null
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const abs = Math.abs(delta)
  if (change.deltaMode === 'percentage_points') {
    return `${sign}${formatNumber(abs, 1)} п.п.`
  }
  const pct = finiteNumber(change.percentChange)
  if (pct == null) return null
  return `${sign}${formatNumber(Math.abs(pct), 2)}%`
}

export function changeCategoriesPresent(changes) {
  return CHANGE_CATEGORIES.filter((item) => (changes || []).some((change) => change.category === item.id))
}
