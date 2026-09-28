import { EVIDENCE_CLASS, MEASURE_KIND, PERIOD_KIND, SCOPE, yearFromPublished } from '../scenarioEvidence.js'
import { bindOfficialOperand } from './evidence.js'
import { calculateM1 } from './calculations.js'
import { validateDemandShare } from './assumptions.js'
import { ANALYSIS_ID, evaluateAnalysisReadiness, evaluateAllReadiness } from './readiness.js'
import { compareModelResults } from './compare.js'

export const LAB_CONTOUR_BOGATYR = Object.freeze({
  id: 'bogatyr',
  companyId: 'bogatyr-komir',
  assetId: 'bogatyr-company',
  label: 'ТОО «Богатырь Комир»',
  role: 'Аналитический контур допущения',
})

export const SLIDER_STEP_PERCENT = 0.1

export const LAB_QUESTION_ID = 'incrementalDemand'

export const DEFAULT_DEMAND_LAB_UI = Object.freeze({
  questionId: LAB_QUESTION_ID,
  percent: '',
  percentA: '',
  percentB: '',
  compareOpen: false,
  productionComparison: 'planStep',
  productionProducerId: 'bogatyr',
})

export const READINESS_DRAWER_IDS = Object.freeze([
  ANALYSIS_ID.DEMAND_SCENARIO,
  ANALYSIS_ID.LOGISTICS,
  ANALYSIS_ID.NETBACK,
  ANALYSIS_ID.INVESTMENT,
])

function yearOfOutlookMetric(row) {
  const direct = yearFromPublished(row)
  if (direct != null) return direct
  const period = Number.parseInt(String(row?.period || ''), 10)
  return Number.isFinite(period) ? period : null
}

/** Bind published incremental-demand marker. No business-value fallback. */
export function bindIncrementalDemandOfficial(outlook) {
  const row = outlook?.industryOutlook?.additionalDemand
  if (!row) return null
  return bindOfficialOperand(row, {
    id: row.id || 'incremental-demand',
    label: row.label || 'Дополнительный спрос на энергетический уголь',
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.PLAN,
    periodKind: PERIOD_KIND.HORIZON,
    year: yearOfOutlookMetric(row),
    qualifier: row.value_qualifier || row.qualifier,
    approx: Boolean(row.approx || row.value_qualifier === 'about' || row.qualifier === 'about'),
  })
}

function bindAnchor(row, extras) {
  if (!row) return null
  return bindOfficialOperand(row, {
    ...extras,
    year: extras.year ?? yearOfOutlookMetric(row),
    qualifier: row.value_qualifier || row.qualifier,
  })
}

/** Official producer anchors for juxtaposition only — no arithmetic. */
export function bindBogatyrContext(outlook) {
  const bog = outlook?.bogatyrCase
  if (!bog) return { actual: null, plan: null, target: null, capacity: null }
  const ids = { companyId: LAB_CONTOUR_BOGATYR.companyId, assetId: LAB_CONTOUR_BOGATYR.assetId, scope: SCOPE.COMPANY }
  return {
    actual: bindAnchor(bog.actual, { ...ids, measureKind: MEASURE_KIND.ACTUAL, entityKey: 'bogatyr-production' }),
    plan: bindAnchor(bog.plan, { ...ids, measureKind: MEASURE_KIND.PLAN, entityKey: 'bogatyr-production' }),
    target: bindAnchor(bog.target, { ...ids, measureKind: MEASURE_KIND.TARGET, entityKey: 'bogatyr-production' }),
    capacity: bindAnchor(bog.capacity, { ...ids, measureKind: MEASURE_KIND.CAPACITY, entityKey: 'bogatyr-production' }),
  }
}

/**
 * UI percent string (0…100) → L0 share (0…1).
 * Empty is not zero. Out-of-range is not clamped.
 */
export function parsePercentToShare(raw) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (text === '' || text === '.') {
    return { ok: false, empty: true, share: null, error: null }
  }
  const percent = Number(text)
  if (!Number.isFinite(percent)) {
    return {
      ok: false,
      empty: false,
      share: null,
      error: { code: 'SHARE_NOT_NUMERIC', message: 'Доля задаётся числом процентов.' },
    }
  }
  const checked = validateDemandShare(percent / 100)
  if (!checked.ok) {
    return { ok: false, empty: false, share: null, error: checked.error }
  }
  return { ok: true, empty: false, share: checked.assumption.value, error: null }
}

export function shareToPercentInput(share) {
  if (typeof share !== 'number' || !Number.isFinite(share)) return ''
  const percent = share * 100
  const rounded = Math.round(percent * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

/**
 * Allocation scale for visualization. Fill share comes from L0 M1 operands, not UI arithmetic.
 */
export function allocationFromM1(official, model) {
  if (!official || typeof official.value !== 'number') return null
  if (!model || typeof model.value !== 'number') {
    return {
      officialValue: official.value,
      modelValue: null,
      share: null,
      fillPercent: 0,
      unit: official.unit,
      qualifier: official.qualifier,
      approx: official.approx,
      formula: null,
    }
  }
  const shareOp = (model.operands || []).find(
    (item) => item.evidenceClass === EVIDENCE_CLASS.ASSUMPTION || item.id === 'demandShare',
  )
  const share = typeof shareOp?.value === 'number' ? shareOp.value : null
  return {
    officialValue: official.value,
    modelValue: model.value,
    share,
    fillPercent: share == null ? 0 : share * 100,
    unit: model.unit || official.unit,
    qualifier: model.qualifier,
    approx: model.approx,
    formula: model.formula,
  }
}

export function modelCanvasState(lab) {
  if (!lab || lab.awaitingAssumption || !lab.model) {
    return { showModel: false, hideZero: true }
  }
  return { showModel: true, hideZero: true }
}

export function demandReadinessDrawer(official, percentText) {
  const parsed = parsePercentToShare(percentText)
  const inventory = {
    incrementalDemand: official || undefined,
    demandShare: parsed.ok ? parsed.share : undefined,
  }
  const all = evaluateAllReadiness(inventory)
  return READINESS_DRAWER_IDS.map((id) => all[id])
}

export function evaluateDemandLab({ official, percentText }) {
  const parsed = parsePercentToShare(percentText)
  const demandShare = parsed.ok ? parsed.share : undefined
  const readiness = evaluateAnalysisReadiness(ANALYSIS_ID.DEMAND_SCENARIO, {
    incrementalDemand: official || undefined,
    demandShare,
  })

  if (!official) {
    return {
      official: null,
      model: null,
      parsed,
      readiness,
      blockedBaseline: true,
      awaitingAssumption: false,
      error: { code: 'MISSING_OFFICIAL', message: 'Официальный исходный показатель недоступен.' },
    }
  }

  if (parsed.empty) {
    return {
      official,
      model: null,
      parsed,
      readiness,
      blockedBaseline: false,
      awaitingAssumption: true,
      error: null,
    }
  }

  if (!parsed.ok) {
    return {
      official,
      model: null,
      parsed,
      readiness,
      blockedBaseline: false,
      awaitingAssumption: false,
      error: parsed.error,
    }
  }

  const run = calculateM1(official, parsed.share)
  return {
    official,
    model: run.ok ? run.result : null,
    parsed,
    readiness,
    blockedBaseline: false,
    awaitingAssumption: false,
    error: run.error,
  }
}

export function evaluateDemandAb({ official, percentA, percentB }) {
  const a = evaluateDemandLab({ official, percentText: percentA })
  const b = evaluateDemandLab({ official, percentText: percentB })
  if (!a.model || !b.model) {
    return { a, b, comparison: null }
  }
  return { a, b, comparison: compareModelResults(a.model, b.model) }
}

export function demandReadinessTeasers(official, percentText) {
  return demandReadinessDrawer(official, percentText).filter((item) => item.analysisId !== ANALYSIS_ID.DEMAND_SCENARIO)
}
