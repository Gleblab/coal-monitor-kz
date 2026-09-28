import { MEASURE_KIND, NODE_STATUS, VIEW_MODE } from './scenarioEvidence.js'

export const RAIL_NODE_TITLES = Object.freeze({
  production: 'Добыча',
  energyDemand: 'Спрос энергетики',
  exports: 'Экспорт',
  railLogistics: 'Ж/д нагрузка',
  constraints: 'Ограничения',
})

export const RAIL_CAPTION = 'Порядок чтения контура · не причинно-следственная модель'

export const MEASURE_KIND_LABEL = Object.freeze({
  actual: 'ФАКТ',
  plan: 'ПЛАН',
  target: 'ЦЕЛЬ',
  expected: 'ОЖИДАНИЕ',
  capacity: 'МОЩНОСТЬ',
})

function isCoalTonnageUnit(unit) {
  const n = String(unit || '').toLowerCase()
  return n.includes('т') && !n.includes('вт')
}

function usableOfficial(node) {
  const rows = node?.officialMetrics || []
  if (node?.id === 'production') {
    return rows.filter((item) => item.measureKind !== MEASURE_KIND.CAPACITY)
  }
  if (node?.id === 'energyDemand') {
    return rows.filter((item) => {
      if (item.measureKind === MEASURE_KIND.PLAN || item.measureKind === MEASURE_KIND.EXPECTED) {
        return isCoalTonnageUnit(item.unit)
      }
      return false
    })
  }
  return rows
}

export function metricYear(metric) {
  if (!metric) return null
  if (typeof metric.year === 'number' && Number.isFinite(metric.year)) return metric.year
  const match = String(metric.periodLabel || metric.period || '').match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : null
}

export function metricMatchesHorizon(metric, horizon, nodeId) {
  if (!metric) return false
  const year = metricYear(metric)
  if (year == null) {
    if (nodeId === 'constraints') return true
    return false
  }
  return year === Number(horizon)
}

/**
 * Presentation pick only — does not invent or rescale values.
 * Does not carry a nearest-year number into another horizon.
 */
export function pickRailPrimary(node, { viewMode, horizon } = {}) {
  const usable = usableOfficial(node)
  const atHorizon = usable.filter((item) => metricMatchesHorizon(item, horizon, node?.id))
  if (!atHorizon.length) return null

  if (viewMode === VIEW_MODE.VERIFIED) {
    return atHorizon.find((item) => item.measureKind === MEASURE_KIND.ACTUAL) || null
  }

  const planish = atHorizon.find((item) =>
    [MEASURE_KIND.PLAN, MEASURE_KIND.TARGET, MEASURE_KIND.EXPECTED].includes(item.measureKind),
  )
  return planish || atHorizon[0]
}

export function railKindLabel(metric) {
  if (!metric) return null
  if (metric.periodKind === 'ytd') return 'НЕПОЛНЫЙ ПЕРИОД'
  return MEASURE_KIND_LABEL[metric.measureKind] || null
}

export function railEmptyLabel(node) {
  if (node?.status === NODE_STATUS.UNSUPPORTED_SCOPE) return 'Срез не поддерживается'
  return 'Нет подтверждённых данных'
}

export function mapExportTotalsToMetrics(payload) {
  if (!payload?.ok || !Array.isArray(payload.items)) return []
  return payload.items
    .filter((item) => item.netWeightTonnes != null && item.sourceId && item.period?.is_full_year !== false)
    .map((item) => ({
      id: `export-${item.period.id}`,
      label: 'Экспорт угля (HS 2701)',
      value: item.netWeightTonnes,
      unit: 'т',
      year: item.period.year,
      period: item.period.label,
      sourceId: item.sourceId,
      measure_kind: 'actual',
      is_full_year: true,
      period_type: 'year',
      note: item.notes || 'Национальный внешнеторговый контур. Не структура экспорта региона или актива.',
    }))
}
