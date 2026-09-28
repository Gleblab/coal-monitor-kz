import { EVIDENCE_CLASS } from '../scenarioEvidence.js'
import { CALCULATION_ID } from './evidence.js'
import { calculateM1, calculateM2, calculateM3, calculateM4, calculateM5, calculateM6 } from './calculations.js'
import { EXPANSION_KIND } from './assumptions.js'
import { buildDecisionBrief } from './brief.js'
import { evaluateAllReadiness, inventoryFromOfficialAndAssumptions } from './readiness.js'

function pushError(errors, calc, error) {
  if (!error) return
  errors.push({ calculationId: calc, ...error })
}

function expansionPair(official, kind) {
  if (kind === EXPANSION_KIND.PLAN_STEP) {
    return { start: official.producerActual, end: official.producerPlan }
  }
  if (kind === EXPANSION_KIND.TARGET_GAP) {
    return { start: official.producerActual, end: official.producerTarget }
  }
  return { start: null, end: null }
}

/**
 * Deterministic in-memory scenario. Not persisted.
 */
export function buildScenario(input = {}) {
  const official = input.official || {}
  const assumptions = input.assumptions || {}
  const requested = input.calculations || [
    CALCULATION_ID.M1,
    CALCULATION_ID.M2,
    CALCULATION_ID.M3,
    CALCULATION_ID.M4,
    CALCULATION_ID.M5,
    CALCULATION_ID.M6,
  ]

  const results = {}
  const validationErrors = []
  const limitations = []

  if (requested.includes(CALCULATION_ID.M1)) {
    if (assumptions.demandShare == null && !official.incrementalDemand) {
      pushError(validationErrors, CALCULATION_ID.M1, {
        code: 'MISSING_OFFICIAL',
        message: 'Нет официального ориентира спроса; ноль не подставляется.',
      })
    } else if (assumptions.demandShare == null) {
      // readiness PARTIAL — do not invent s
    } else {
      const run = calculateM1(official.incrementalDemand, assumptions.demandShare)
      if (run.ok) results[CALCULATION_ID.M1] = run.result
      else pushError(validationErrors, CALCULATION_ID.M1, run.error)
    }
  }

  if (requested.includes(CALCULATION_ID.M2)) {
    const run = calculateM2(official.producerPlan, official.producerActual)
    if (run.ok) results[CALCULATION_ID.M2] = run.result
    else pushError(validationErrors, CALCULATION_ID.M2, run.error)
  }

  if (requested.includes(CALCULATION_ID.M3)) {
    const run = calculateM3(official.producerTarget, official.producerActual)
    if (run.ok) results[CALCULATION_ID.M3] = run.result
    else pushError(validationErrors, CALCULATION_ID.M3, run.error)
  }

  if (requested.includes(CALCULATION_ID.M4)) {
    const run = calculateM4(official.producerCapacity, official.producerActual)
    if (run.ok) results[CALCULATION_ID.M4] = run.result
    else pushError(validationErrors, CALCULATION_ID.M4, run.error)
  }

  if (requested.includes(CALCULATION_ID.M5)) {
    const pair = expansionPair(official, assumptions.expansionKind)
    const run = calculateM5(official.incrementalDemand, pair.start, pair.end, assumptions.expansionKind)
    if (run.ok) results[CALCULATION_ID.M5] = run.result
    else pushError(validationErrors, CALCULATION_ID.M5, run.error)
  }

  if (requested.includes(CALCULATION_ID.M6)) {
    if (assumptions.exportDeltaPercent == null && official.nationalExportFy) {
      // PARTIAL until delta
    } else {
      const run = calculateM6(official.nationalExportFy, assumptions.exportDeltaPercent)
      if (run.ok) results[CALCULATION_ID.M6] = run.result
      else pushError(validationErrors, CALCULATION_ID.M6, run.error)
    }
  }

  for (const result of Object.values(results)) {
    if (result.evidenceClass !== EVIDENCE_CLASS.MODEL) {
      throw new Error('Scenario Lab invariant: result classified as non-MODEL.')
    }
    limitations.push(...(result.limitations || []))
  }

  const inventory = inventoryFromOfficialAndAssumptions(official, assumptions)
  const readiness = evaluateAllReadiness(inventory)
  const brief = buildDecisionBrief({ official, assumptions, results, readiness, limitations })

  return {
    id: input.id || 'scenario-lab',
    name: input.name || 'Scenario Lab',
    contour: {
      regionId: input.contour?.regionId ?? null,
      companyId: input.contour?.companyId ?? null,
      assetId: input.contour?.assetId ?? null,
    },
    baseline: official,
    assumptions,
    results,
    readiness,
    limitations: [...new Set(limitations)],
    brief,
    validationErrors,
  }
}
