import { getSource } from '../data/catalog'
import { formatNumber } from './format'

export const COMPARISON_LIMIT = 4

export const COMPARISON_STATUS = {
  COMPARABLE: 'COMPARABLE',
  DIFFERENT_UNITS: 'DIFFERENT_UNITS',
  FACT_VS_PLAN: 'FACT_VS_PLAN',
  DIFFERENT_PERIODS: 'DIFFERENT_PERIODS',
  DIFFERENT_METHODOLOGY: 'DIFFERENT_METHODOLOGY',
  DIFFERENT_GEOGRAPHY: 'DIFFERENT_GEOGRAPHY',
  INCOMPLETE: 'INCOMPLETE',
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function normalizeUnit(unit) {
  return String(unit || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace('тенге', '₸')
    .trim()
}

export function geographyKeyFromMetric(item, extras = {}) {
  const raw = String(extras.geographyKey || item?.coverage || item?.geographyKey || 'national').toLowerCase()
  if (raw === 'republic' || raw === 'all' || raw === 'kazakhstan' || raw === 'national') return 'national'
  return raw
}

export function yearFromMetric(item) {
  if (typeof item?.year === 'number' && Number.isFinite(item.year)) return item.year
  const match = String(item?.period || '').match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : null
}

export function measureKindFromMetric(item) {
  if (item?.measureKind) return item.measureKind
  if (item?.measure_kind) return item.measure_kind
  const status = String(item?.status || '').toLowerCase()
  if (status.includes('план')) return 'plan'
  if (status.includes('ожидан')) return 'expected'
  if (status.includes('целев')) return 'target'
  return 'actual'
}

export function statusLabel(kind) {
  if (kind === 'plan') return 'План'
  if (kind === 'expected') return 'Ожидание'
  if (kind === 'target') return 'Целевой показатель'
  return 'Факт'
}

function inferSeriesKey(item) {
  if (item?.seriesKey) return item.seriesKey
  const id = String(item?.id || '')
  const sourceId = String(item?.sourceId || '')
  if (id.startsWith('bns-industry-') || id === 'bnsIndustrial2025' || id === 'bns-2025') {
    return 'bns_industry_annual'
  }
  if (sourceId === 'bnsIndustryCoalProduction') return 'bns_industry_annual'
  if (id === 'production2025' || id === 'minenergoExtraction2025') return 'minenergo_industry_total'
  if (id === 'export2025' || id === 'exportFlow') return 'minenergo_export'
  if (id === 'domestic2025' || id === 'domesticFlow') return 'minenergo_domestic'
  if (id === 'plan2026' || String(item?.label || '').toLowerCase().includes('план добычи')) {
    return 'minenergo_industry_plan'
  }
  return sourceId || id || 'unknown'
}

function resolveSource(sourceId, extras = {}) {
  const remote = extras.sourceRecord || null
  const local = sourceId ? getSource(sourceId) : null
  const picked = remote || local
  if (!picked && !extras.publisher && !extras.sourceUrl) {
    return sourceId ? { id: sourceId } : null
  }
  return {
    id: sourceId,
    organization: extras.publisher || picked?.organization || null,
    publication: extras.publication || picked?.publication || null,
    url: extras.sourceUrl || picked?.url || null,
    notes: extras.methodology || picked?.notes || null,
  }
}

export function toComparisonItem(metric, extras = {}) {
  if (!metric) return null
  const value = finiteNumber(metric.value)
  if (value == null) return null
  const sourceId = extras.sourceId || metric.sourceId || null
  const source = resolveSource(sourceId, extras)
  const measureKind = extras.measureKind || measureKindFromMetric(metric)
  const year = extras.year ?? yearFromMetric(metric)
  const id = extras.id || metric.id
  if (!id) return null
  return {
    id,
    label: extras.label || metric.label || metric.title || 'Показатель',
    value,
    display: metric.display || formatNumber(value),
    unit: metric.unit || extras.unit || null,
    period: metric.period || (year != null ? String(year) : null),
    year,
    geography:
      extras.geography ||
      (geographyKeyFromMetric(metric, extras) === 'national' ? 'Казахстан' : metric.geography) ||
      'Казахстан',
    geographyKey: geographyKeyFromMetric(metric, extras),
    measureKind,
    statusLabel: statusLabel(measureKind),
    methodology: extras.methodology || metric.methodology || metric.note || source?.notes || null,
    seriesKey: extras.seriesKey || inferSeriesKey({ ...metric, id, sourceId }),
    sourceId,
    publisher: source?.organization || extras.publisher || null,
    publication: source?.publication || extras.publication || null,
    sourceUrl: source?.url || extras.sourceUrl || null,
    route: extras.route || metric.route || null,
    entity: extras.entity || metric.entityLabel || null,
    periodKind: extras.periodKind || null,
    periodWindow: extras.periodWindow || null,
  }
}

function differenceForPair(left, right) {
  const a = finiteNumber(left.value)
  const b = finiteNumber(right.value)
  if (a == null || b == null || a === 0) return { abs: null, pct: null, from: left, to: right }
  const ordered = (left.year || 0) <= (right.year || 0) ? [left, right] : [right, left]
  const from = finiteNumber(ordered[0].value)
  const to = finiteNumber(ordered[1].value)
  if (from == null || to == null || from === 0) return { abs: null, pct: null, from: ordered[0], to: ordered[1] }
  return {
    abs: to - from,
    pct: (to / from - 1) * 100,
    from: ordered[0],
    to: ordered[1],
  }
}

export function evaluateComparison(items) {
  const list = (items || []).filter(Boolean)
  if (list.length < 2) {
    return {
      status: COMPARISON_STATUS.INCOMPLETE,
      comparable: false,
      message: 'Добавьте ещё один показатель, чтобы сравнить период, единицу и методологию.',
      difference: null,
    }
  }

  const units = new Set(list.map((item) => normalizeUnit(item.unit)))
  if (units.size > 1) {
    return {
      status: COMPARISON_STATUS.DIFFERENT_UNITS,
      comparable: false,
      message: 'Разные единицы измерения — прямое числовое сравнение невозможно.',
      difference: null,
    }
  }

  const geos = new Set(list.map((item) => item.geographyKey || 'national'))
  if (geos.size > 1) {
    return {
      status: COMPARISON_STATUS.DIFFERENT_GEOGRAPHY,
      comparable: false,
      message: 'Показатели относятся к разной географии.',
      difference: null,
    }
  }

  const kinds = new Set(list.map((item) => item.measureKind))
  const hasFact = kinds.has('actual')
  const hasPlanLike = kinds.has('plan') || kinds.has('expected') || kinds.has('target')
  if (hasFact && hasPlanLike) {
    return {
      status: COMPARISON_STATUS.FACT_VS_PLAN,
      comparable: false,
      message:
        'Факт и план показаны отдельно. Разница не является выполнением плана, если периоды не совпадают.',
      difference: null,
    }
  }

  const series = new Set(list.map((item) => item.seriesKey))
  const years = list.map((item) => item.year)
  const uniqueYears = [...new Set(years.filter((year) => typeof year === 'number'))]

  const periodKinds = list.map((item) => item.periodKind).filter(Boolean)
  if (periodKinds.length === list.length && new Set(periodKinds).size > 1) {
    return {
      status: COMPARISON_STATUS.DIFFERENT_PERIODS,
      comparable: false,
      message: 'Показатели относятся к разным типам периода.',
      difference: null,
    }
  }

  const periodWindows = list.map((item) => item.periodWindow).filter(Boolean)
  if (periodWindows.length === list.length && new Set(periodWindows).size > 1) {
    return {
      status: COMPARISON_STATUS.DIFFERENT_PERIODS,
      comparable: false,
      message: 'Показатели относятся к разным временным окнам.',
      difference: null,
    }
  }

  if (series.size > 1) {
    const sameYear = uniqueYears.length === 1
    const coalVolume = [...units][0] === 'млн т'
    const message =
      sameYear && coalVolume
        ? `Оба показателя относятся к добыче угля за ${uniqueYears[0]} год, но рассчитаны по разным методологиям. Поэтому напрямую сравнивать их значения некорректно.`
        : 'Показатели сформированы по разным методологиям и не образуют один статистический ряд.'
    return {
      status: COMPARISON_STATUS.DIFFERENT_METHODOLOGY,
      comparable: false,
      message,
      difference: null,
    }
  }

  if (uniqueYears.length > 1 && list.some((item) => item.measureKind !== 'actual')) {
    return {
      status: COMPARISON_STATUS.DIFFERENT_PERIODS,
      comparable: false,
      message: 'Показатели относятся к разным периодам.',
      difference: null,
    }
  }

  if (uniqueYears.length > 1 && list.every((item) => item.measureKind === 'actual')) {
    if (list.length !== 2) {
      return {
        status: COMPARISON_STATUS.COMPARABLE,
        comparable: true,
        message: 'Показатели методологически сопоставимы. Числовое изменение показывается для пары значений.',
        difference: null,
      }
    }
    const delta = differenceForPair(list[0], list[1])
    return {
      status: COMPARISON_STATUS.COMPARABLE,
      comparable: true,
      message: 'Показатели методологически сопоставимы.',
      difference: delta,
    }
  }

  if (uniqueYears.length > 1) {
    return {
      status: COMPARISON_STATUS.DIFFERENT_PERIODS,
      comparable: false,
      message: 'Показатели относятся к разным периодам.',
      difference: null,
    }
  }

  return {
    status: COMPARISON_STATUS.COMPARABLE,
    comparable: true,
    message: 'Показатели методологически сопоставимы.',
    difference: null,
  }
}
