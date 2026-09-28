import { EVIDENCE_CLASS, MEASURE_KIND, PERIOD_KIND, SCOPE, yearFromPublished } from '../scenarioEvidence.js'
import { bindOfficialOperand } from './evidence.js'
import { calculateM2, calculateM3, calculateM4 } from './calculations.js'
import { ANALYSIS_ID, evaluateAnalysisReadiness } from './readiness.js'
import { LAB_CONTOUR_BOGATYR } from './demandSlice.js'

export const LAB_QUESTION_IDS = Object.freeze({
  INCREMENTAL_DEMAND: 'incrementalDemand',
  PRODUCTION_SCENARIO: 'productionScenario',
})

export const PRODUCTION_COMPARISON = Object.freeze({
  PLAN_STEP: 'planStep',
  TARGET_GAP: 'targetGap',
  CAPACITY_REF: 'capacityRef',
})

export const PRODUCTION_UI = Object.freeze({
  capacityDifference: 'Разница к заявленной мощности',
  capacityConceptNote:
    'Заявленная мощность и фактическая добыча — разные концепты и могут происходить из разных публикаций.',
  planStep: 'Шаг плана',
  targetGap: 'Разность цели',
  connectionCaption: 'Соединение официальных якорей для чтения. Не прогноз.',
})

const FORBIDDEN_MODEL_YEARS = Object.freeze([2027, 2028, 2029, 2030, 2031])

const FORBIDDEN_COPY = Object.freeze([
  /провал плана/i,
  /невыполнен/i,
  /decline forecast/i,
  /underperformance/i,
  /plan failure/i,
  /\bCAGR\b/i,
  /spare capacity/i,
  /unused capacity/i,
  /available capacity/i,
  /резервн(ая|ой) мощност/i,
  /свободн(ая|ой) мощност/i,
  /неиспользованн(ая|ой) мощност/i,
])

export const LAB_CONTOUR_SHUBARKOL = Object.freeze({
  id: 'shubarkol',
  companyId: 'shubarkol-komir',
  assetId: 'shubarkol-company',
  label: 'АО «Шубарколь Комир»',
  selectorLabel: 'Шубарколь',
  entityKey: 'shubarkol-production',
  outlookKey: 'producerCase',
})

export const LAB_CONTOUR_KARAZHYRA = Object.freeze({
  id: 'karazhyra',
  companyId: 'karazhyra',
  assetId: 'karazhyra-deposit',
  label: 'АО «Каражыра»',
  selectorLabel: 'Каражыра',
  entityKey: 'karazhyra-production',
  outlookKey: 'karazhyraCase',
})

export const LAB_CONTOUR_MAIKUBEN = Object.freeze({
  id: 'maikuben',
  companyId: 'maikuben-west',
  assetId: 'maikuben-pit',
  label: 'АО «Майкубен-Вест»',
  selectorLabel: 'Майкубен-Вест',
  entityKey: 'maikuben-production',
  outlookKey: 'maikubenCase',
})

const CANONICAL_ACTUAL_MIN_YEAR = 2024
const MAX_PLAN_ACTUAL_GAP_YEARS = 2

/** Registry of producer cases. Describes binding keys — not a second numeric source of truth. */
export const PRODUCTION_PRODUCERS = Object.freeze([
  {
    id: LAB_CONTOUR_BOGATYR.id,
    label: LAB_CONTOUR_BOGATYR.label,
    selectorLabel: 'Богатырь Комир',
    companyId: LAB_CONTOUR_BOGATYR.companyId,
    assetId: LAB_CONTOUR_BOGATYR.assetId,
    entityKey: 'bogatyr-production',
    outlookKey: 'bogatyrCase',
  },
  {
    id: LAB_CONTOUR_SHUBARKOL.id,
    label: LAB_CONTOUR_SHUBARKOL.label,
    selectorLabel: LAB_CONTOUR_SHUBARKOL.selectorLabel,
    companyId: LAB_CONTOUR_SHUBARKOL.companyId,
    assetId: LAB_CONTOUR_SHUBARKOL.assetId,
    entityKey: LAB_CONTOUR_SHUBARKOL.entityKey,
    outlookKey: LAB_CONTOUR_SHUBARKOL.outlookKey,
  },
  {
    id: LAB_CONTOUR_KARAZHYRA.id,
    label: LAB_CONTOUR_KARAZHYRA.label,
    selectorLabel: LAB_CONTOUR_KARAZHYRA.selectorLabel,
    companyId: LAB_CONTOUR_KARAZHYRA.companyId,
    assetId: LAB_CONTOUR_KARAZHYRA.assetId,
    entityKey: LAB_CONTOUR_KARAZHYRA.entityKey,
    outlookKey: LAB_CONTOUR_KARAZHYRA.outlookKey,
  },
  {
    id: LAB_CONTOUR_MAIKUBEN.id,
    label: LAB_CONTOUR_MAIKUBEN.label,
    selectorLabel: LAB_CONTOUR_MAIKUBEN.selectorLabel,
    companyId: LAB_CONTOUR_MAIKUBEN.companyId,
    assetId: LAB_CONTOUR_MAIKUBEN.assetId,
    entityKey: LAB_CONTOUR_MAIKUBEN.entityKey,
    outlookKey: LAB_CONTOUR_MAIKUBEN.outlookKey,
  },
])

function yearOfOutlookMetric(row) {
  const direct = yearFromPublished(row)
  if (direct != null) return direct
  const period = Number.parseInt(String(row?.period || ''), 10)
  return Number.isFinite(period) ? period : null
}

function observationCompanyCode(row) {
  return row?.company_code || row?.company?.code || row?.companyId || null
}

function observationAssetCode(row) {
  return row?.coal_asset_code || row?.coal_asset?.code || row?.assetId || null
}

/** Entity identity: company/asset on the observation must match the selected producer. */
export function observationBelongsToProducer(row, producer) {
  if (!row || !producer) return false
  const company = observationCompanyCode(row)
  const asset = observationAssetCode(row)
  if (!company && !asset) return false
  if (company && company !== producer.companyId) return false
  if (asset && producer.assetId && asset !== producer.assetId) return false
  return true
}

function stampProducer(metric, producer) {
  if (!metric) return null
  return {
    ...metric,
    companyId: producer.companyId,
    assetId: producer.assetId,
    entityKey: producer.entityKey,
    scope: metric.scope || SCOPE.COMPANY,
  }
}

function bindAnchor(row, producer, extras) {
  if (!row) return null
  if (!observationBelongsToProducer(row, producer)) return null
  const bound = bindOfficialOperand(row, {
    ...extras,
    year: extras.year ?? yearOfOutlookMetric(row),
    qualifier: row.value_qualifier || row.qualifier,
    approx: Boolean(row.approx || row.value_qualifier === 'about' || row.qualifier === 'about'),
  })
  return stampProducer(bound, producer)
}

function producerDef(producerId) {
  return PRODUCTION_PRODUCERS.find((item) => item.id === producerId) || null
}

function asMetricList(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function historicalYearsPhrase(items) {
  const years = [...new Set((items || []).map((item) => item.year).filter((year) => year != null))]
  if (!years.length) return ''
  const joined = years.join(', ')
  return years.length > 1 ? `${joined} годы` : `${joined} год`
}

export function actualComparableToPlan(actual, plan) {
  if (!actual || !plan || actual.year == null || plan.year == null) return false
  if (actual.year < CANONICAL_ACTUAL_MIN_YEAR) return false
  return plan.year - actual.year <= MAX_PLAN_ACTUAL_GAP_YEARS
}

/**
 * Bind verified official production anchors. Does not invent years or values.
 * Uses canonical preferred latest actual when present; documents vintage vs monitoring actual.
 * Actuals older than 2024 are retained as historical and are not used as the comparison baseline.
 */
export function bindProductionProducer(outlook, producerId = LAB_CONTOUR_BOGATYR.id) {
  const producer = producerDef(producerId)
  if (!producer) {
    return emptyBinding(producerId)
  }
  const row = outlook?.[producer.outlookKey]
  if (!row) return emptyBinding(producer.id, producer)

  const ids = {
    companyId: producer.companyId,
    assetId: producer.assetId,
    scope: SCOPE.COMPANY,
    entityKey: producer.entityKey,
  }

  const documentedActual = bindAnchor(row.actual, producer, {
    ...ids,
    measureKind: MEASURE_KIND.ACTUAL,
    periodKind: PERIOD_KIND.FY,
  })
  const latestActual = bindAnchor(row.actualLatest, producer, {
    ...ids,
    measureKind: MEASURE_KIND.ACTUAL,
    periodKind: PERIOD_KIND.FY,
  })
  const historicalActuals = asMetricList(row.actualHistorical)
    .map((item) =>
      bindAnchor(item, producer, {
        ...ids,
        measureKind: MEASURE_KIND.ACTUAL,
        periodKind: PERIOD_KIND.FY,
      }),
    )
    .filter(Boolean)

  let actual = latestActual || documentedActual
  let vintageNote = null
  if (latestActual && documentedActual && latestActual.year !== documentedActual.year) {
    vintageNote = `Канонический факт производственного сценария — ${latestActual.year}. Ряд мониторинга «Добыча ${documentedActual.year}» остаётся отдельным и не подменяется молча.`
  }

  if (actual && actual.year != null && actual.year < CANONICAL_ACTUAL_MIN_YEAR) {
    if (!historicalActuals.some((item) => item.year === actual.year && item.value === actual.value)) {
      historicalActuals.unshift(actual)
    }
    actual = null
    vintageNote =
      'Опубликованный факт относится к более раннему периоду и не используется как текущий сопоставимый базовый показатель.'
  }

  historicalActuals.sort((a, b) => (b.year || 0) - (a.year || 0))

  const plan = bindAnchor(row.plan, producer, { ...ids, measureKind: MEASURE_KIND.PLAN, periodKind: PERIOD_KIND.FY })
  const target = bindAnchor(row.target, producer, { ...ids, measureKind: MEASURE_KIND.TARGET, periodKind: PERIOD_KIND.FY })
  const capacity = bindAnchor(row.capacity, producer, {
    ...ids,
    measureKind: MEASURE_KIND.CAPACITY,
    periodKind: PERIOD_KIND.HORIZON,
  })

  if (!actual && historicalActuals.length) {
    vintageNote = plan
      ? `Доступен опубликованный факт за ${historicalYearsPhrase(historicalActuals)}, однако он не используется как текущий сопоставимый базовый показатель для плана ${plan.year} года.`
      : `Доступен опубликованный факт за ${historicalYearsPhrase(historicalActuals)}, однако он не используется как текущий сопоставимый базовый показатель.`
  }

  return {
    producerId: producer.id,
    label: producer.label,
    selectorLabel: producer.selectorLabel || producer.label,
    outlookKey: producer.outlookKey,
    companyId: producer.companyId,
    status: null,
    actual,
    plan,
    target,
    capacity,
    vintageNote,
    documentedActual,
    historicalActuals,
  }
}

function emptyBinding(producerId, producer = null) {
  return {
    producerId,
    label: producer?.label || producerId,
    selectorLabel: producer?.selectorLabel || producer?.label || producerId,
    outlookKey: producer?.outlookKey || null,
    companyId: producer?.companyId || null,
    status: null,
    actual: null,
    plan: null,
    target: null,
    capacity: null,
    vintageNote: null,
    documentedActual: null,
    historicalActuals: [],
  }
}

function producerCompleteness(binding) {
  const hasActual = Boolean(binding.actual)
  const hasHistorical = Boolean(binding.historicalActuals?.length)
  const hasPlan = Boolean(binding.plan)
  const hasTarget = Boolean(binding.target)
  const hasCapacity = Boolean(binding.capacity)
  if (hasActual && hasPlan && hasTarget && hasCapacity) return 'READY'
  if (hasActual || hasHistorical || hasPlan || hasTarget || hasCapacity) return 'PARTIAL'
  return 'UNAVAILABLE'
}

export function productionCapabilities(binding) {
  const canCompareActualToPlan = actualComparableToPlan(binding?.actual, binding?.plan)
  const canCompareActualToTarget = Boolean(binding?.actual && binding?.target && binding.actual.year >= CANONICAL_ACTUAL_MIN_YEAR)
  const canCompareActualToCapacity = Boolean(binding?.actual && binding?.capacity && binding.actual.year >= CANONICAL_ACTUAL_MIN_YEAR)
  const flags = [canCompareActualToPlan, canCompareActualToTarget, canCompareActualToCapacity]
  return {
    canCompareActualToPlan,
    canCompareActualToTarget,
    canCompareActualToCapacity,
    availableCount: flags.filter(Boolean).length,
  }
}

export function productionCoverage(binding) {
  return {
    actual: Boolean(binding?.actual),
    actualHistorical: Boolean(binding?.historicalActuals?.length),
    plan: Boolean(binding?.plan),
    target: Boolean(binding?.target),
    capacity: Boolean(binding?.capacity),
  }
}

export function comparisonUnavailableReason(comparison, binding) {
  const actual = Boolean(binding?.actual)
  const plan = Boolean(binding?.plan)
  const target = Boolean(binding?.target)
  const capacity = Boolean(binding?.capacity)
  if (comparison === PRODUCTION_COMPARISON.PLAN_STEP) {
    if (!actual) {
      const historic = binding?.historicalActuals || []
      if (historic.length && plan) {
        return `Доступен опубликованный факт за ${historicalYearsPhrase(historic)}, однако он не используется как текущий сопоставимый базовый показатель для плана ${binding.plan.year} года.`
      }
      if (historic.length) {
        return `Доступен опубликованный факт за ${historicalYearsPhrase(historic)}, однако он не используется как текущий сопоставимый базовый показатель.`
      }
      return 'Для расчёта требуется подтверждённый фактический показатель производства.'
    }
    if (!plan) {
      return 'Для расчёта требуется опубликованный план производства.'
    }
    if (!actualComparableToPlan(binding.actual, binding.plan)) {
      return `Фактический показатель ${binding.actual.year} года не используется как сопоставимая база для плана ${binding.plan.year} года.`
    }
  }
  if (comparison === PRODUCTION_COMPARISON.TARGET_GAP) {
    if (!actual) {
      return 'Для расчёта требуется подтверждённый фактический показатель производства.'
    }
    if (!target) {
      return 'Для расчёта требуется опубликованная долгосрочная цель производства.'
    }
  }
  if (comparison === PRODUCTION_COMPARISON.CAPACITY_REF) {
    if (!actual) {
      return 'Для расчёта требуется подтверждённый фактический показатель производства.'
    }
    if (!capacity) {
      return 'Для расчёта требуется опубликованная заявленная мощность.'
    }
  }
  return null
}

export function producerCoverageCopy(binding) {
  const caps = productionCapabilities(binding)
  const coverage = productionCoverage(binding)
  const hasAny = coverage.actual || coverage.actualHistorical || coverage.plan || coverage.target || coverage.capacity
  if (caps.availableCount >= 3) {
    return { line: 'Доступны 3 сравнения', detail: null }
  }
  if (caps.availableCount === 2) {
    return { line: 'Доступны 2 сравнения', detail: null }
  }
  if (caps.availableCount === 1) {
    return { line: 'Доступно 1 сравнение', detail: null }
  }
  if (hasAny) {
    return {
      line: 'Доступны отдельные опубликованные показатели',
      detail: 'Полное сравнение пока недоступно',
    }
  }
  return { line: 'Нет подтверждённых производственных показателей', detail: null }
}

/**
 * Expose producers with at least one verified observation.
 * Partial coverage is allowed. Empty cases are not listed.
 */
export function listProductionProducers(outlook) {
  return PRODUCTION_PRODUCERS.map((def) => {
    const binding = bindProductionProducer(outlook, def.id)
    const status = producerCompleteness(binding)
    const coverage = productionCoverage(binding)
    const hasAny = coverage.actual || coverage.actualHistorical || coverage.plan || coverage.target || coverage.capacity
    return { ...def, status, binding, expose: hasAny }
  }).filter((item) => item.expose)
}

export function officialProductionYears(binding) {
  if (!binding) return []
  return [binding.actual, binding.plan, binding.target]
    .filter(Boolean)
    .map((item) => item.year)
    .filter((year) => year != null)
}

export function buildOfficialAnchorTrack(binding) {
  const nodes = [
    { role: 'actual', measureKind: MEASURE_KIND.ACTUAL, metric: binding?.actual || null },
    { role: 'plan', measureKind: MEASURE_KIND.PLAN, metric: binding?.plan || null },
    { role: 'target', measureKind: MEASURE_KIND.TARGET, metric: binding?.target || null },
  ].filter((node) => node.metric)

  const years = nodes.map((node) => node.metric.year).filter((year) => year != null)
  const min = years.length ? Math.min(...years) : null
  const max = years.length ? Math.max(...years) : null
  const timeScale = min != null && max != null && max !== min

  const points = nodes.map((node, index) => {
    const year = node.metric.year
    let position = years.length <= 1 ? 50 : (index / Math.max(nodes.length - 1, 1)) * 100
    if (timeScale && year != null) {
      const inset = 10
      position = inset + ((year - min) / (max - min)) * (100 - inset * 2)
    }
    return {
      role: node.role,
      measureKind: node.measureKind,
      year,
      value: node.metric.value,
      unit: node.metric.unit,
      sourceId: node.metric.sourceId,
      position,
      onTimeline: true,
    }
  })

  const datedCount = points.filter((point) => point.year != null).length
  const connect = datedCount >= 2

  return {
    kind: 'official_anchors',
    timeScale,
    connection: connect ? 'anchor_readability' : 'none',
    connectionCaption: connect ? PRODUCTION_UI.connectionCaption : null,
    years,
    interpolatedYears: [],
    forbiddenYearsPresent: years.some((year) => FORBIDDEN_MODEL_YEARS.includes(year)),
    points,
    capacity: binding?.capacity
      ? {
          value: binding.capacity.value,
          unit: binding.capacity.unit,
          sourceId: binding.capacity.sourceId,
          year: binding.capacity.year,
          onTimeline: false,
          measureKind: MEASURE_KIND.CAPACITY,
        }
      : null,
  }
}

function runOrMissing(run) {
  if (run.ok) return { model: run.result, error: null }
  return { model: null, error: run.error || { code: 'UNAVAILABLE', message: 'Расчёт недоступен.' } }
}

/**
 * Evaluate M2/M3/M4 via L0 only. Missing operand → unavailable, never zero.
 */
export function evaluateProductionLab({ binding, comparison = PRODUCTION_COMPARISON.PLAN_STEP }) {
  const inventory = {
    producerActual: binding?.actual || undefined,
    producerPlan: binding?.plan || undefined,
    producerTarget: binding?.target || undefined,
    producerCapacity: binding?.capacity || undefined,
  }
  const readiness = evaluateAnalysisReadiness(ANALYSIS_ID.PRODUCTION_SCENARIO, inventory)
  const capabilities = productionCapabilities(binding)
  const coverage = productionCoverage(binding)

  const planStep = capabilities.canCompareActualToPlan
    ? runOrMissing(calculateM2(binding.plan, binding.actual))
    : {
        model: null,
        error: {
          code: 'COMPARISON_UNAVAILABLE',
          message: comparisonUnavailableReason(PRODUCTION_COMPARISON.PLAN_STEP, binding),
        },
      }
  const targetGap = capabilities.canCompareActualToTarget
    ? runOrMissing(calculateM3(binding.target, binding.actual))
    : {
        model: null,
        error: {
          code: 'COMPARISON_UNAVAILABLE',
          message: comparisonUnavailableReason(PRODUCTION_COMPARISON.TARGET_GAP, binding),
        },
      }
  const capacityRef = capabilities.canCompareActualToCapacity
    ? runOrMissing(calculateM4(binding.capacity, binding.actual))
    : {
        model: null,
        error: {
          code: 'COMPARISON_UNAVAILABLE',
          message: comparisonUnavailableReason(PRODUCTION_COMPARISON.CAPACITY_REF, binding),
        },
      }

  const byId = {
    [PRODUCTION_COMPARISON.PLAN_STEP]: planStep,
    [PRODUCTION_COMPARISON.TARGET_GAP]: targetGap,
    [PRODUCTION_COMPARISON.CAPACITY_REF]: capacityRef,
  }
  const active = byId[comparison] || planStep
  const track = buildOfficialAnchorTrack(binding)

  return {
    binding,
    comparison,
    model: active.model,
    error: active.error,
    models: {
      planStep: planStep.model,
      targetGap: targetGap.model,
      capacityRef: capacityRef.model,
    },
    errors: {
      planStep: planStep.error,
      targetGap: targetGap.error,
      capacityRef: capacityRef.error,
    },
    readiness,
    capabilities,
    coverage,
    coverageCopy: producerCoverageCopy(binding),
    track,
    unavailable: !active.model,
  }
}

export function highlightedRoles(comparison) {
  if (comparison === PRODUCTION_COMPARISON.TARGET_GAP) return ['actual', 'target']
  if (comparison === PRODUCTION_COMPARISON.CAPACITY_REF) return ['actual', 'capacity']
  return ['actual', 'plan']
}

export function productionCopyBundle(lab) {
  const model = lab?.model
  const texts = [
    model?.interpretation,
    model?.label,
    ...(model?.limitations || []),
    PRODUCTION_UI.capacityDifference,
    PRODUCTION_UI.capacityConceptNote,
    PRODUCTION_UI.planStep,
    PRODUCTION_UI.targetGap,
  ].filter(Boolean)
  return texts
}

export function productionCopyIsSafe(texts) {
  const blob = (Array.isArray(texts) ? texts : [texts]).join(' ')
  return !FORBIDDEN_COPY.some((pattern) => pattern.test(blob))
}

export function withQuestionId(ui, questionId) {
  return { ...ui, questionId }
}

export function switchProductionComparison(ui, productionComparison) {
  return { ...ui, productionComparison }
}
