export const READINESS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  BLOCKED: 'BLOCKED',
})

export const ANALYSIS_ID = Object.freeze({
  PRODUCTION_SCENARIO: 'productionScenario',
  DEMAND_SCENARIO: 'demandScenario',
  NATIONAL_EXPORT: 'nationalExportSensitivity',
  REGIONAL_EXPORT: 'regionalExportSensitivity',
  PRODUCER_EXPORT: 'producerExportSensitivity',
  LOGISTICS: 'logisticsEconomics',
  NETBACK: 'netback',
  INVESTMENT: 'investmentEconomics',
})

/**
 * Required-input definitions. Names only — no business values.
 */
export const ANALYSIS_REQUIREMENTS = Object.freeze({
  [ANALYSIS_ID.PRODUCTION_SCENARIO]: {
    official: ['producerActual', 'producerPlan', 'producerTarget', 'producerCapacity'],
    assumptions: [],
    optionalOfficial: ['producerPlan', 'producerTarget', 'producerCapacity'],
    requiredOfficialCore: ['producerActual'],
    runnableIf: ['producerActual'],
  },
  [ANALYSIS_ID.DEMAND_SCENARIO]: {
    official: ['incrementalDemand'],
    assumptions: ['demandShare'],
    requiredOfficialCore: ['incrementalDemand'],
    runnableIf: ['incrementalDemand', 'demandShare'],
  },
  [ANALYSIS_ID.NATIONAL_EXPORT]: {
    official: ['nationalExportFyHs2701'],
    assumptions: ['exportDeltaPercent'],
    requiredOfficialCore: ['nationalExportFyHs2701'],
    runnableIf: ['nationalExportFyHs2701', 'exportDeltaPercent'],
  },
  [ANALYSIS_ID.REGIONAL_EXPORT]: {
    official: ['regionalExportFyHs2701'],
    assumptions: ['exportDeltaPercent'],
    requiredOfficialCore: ['regionalExportFyHs2701'],
    runnableIf: ['regionalExportFyHs2701', 'exportDeltaPercent'],
  },
  [ANALYSIS_ID.PRODUCER_EXPORT]: {
    official: ['producerExportFyHs2701'],
    assumptions: ['exportDeltaPercent'],
    requiredOfficialCore: ['producerExportFyHs2701'],
    runnableIf: ['producerExportFyHs2701', 'exportDeltaPercent'],
  },
  [ANALYSIS_ID.LOGISTICS]: {
    official: ['routeDistance', 'tariff', 'loadingPoint', 'tonnesToWagonMethodology'],
    assumptions: [],
    requiredOfficialCore: ['routeDistance', 'tariff', 'loadingPoint', 'tonnesToWagonMethodology'],
    runnableIf: ['routeDistance', 'tariff', 'loadingPoint', 'tonnesToWagonMethodology'],
  },
  [ANALYSIS_ID.NETBACK]: {
    official: ['salePrice', 'transportCost', 'handlingCost'],
    assumptions: [],
    optionalOfficial: ['fxRate'],
    requiredOfficialCore: ['salePrice', 'transportCost', 'handlingCost'],
    runnableIf: ['salePrice', 'transportCost', 'handlingCost'],
  },
  [ANALYSIS_ID.INVESTMENT]: {
    official: ['capexSchedule', 'opex', 'taxInputs'],
    assumptions: ['discountRate'],
    requiredOfficialCore: ['capexSchedule', 'opex', 'taxInputs'],
    runnableIf: ['capexSchedule', 'opex', 'taxInputs', 'discountRate'],
  },
})

function present(inventory, key) {
  const item = inventory[key]
  if (item == null) return false
  if (typeof item === 'object' && item.value == null && !item.text && item.evidenceClass !== 'assumption') {
    return false
  }
  if (typeof item === 'number') return Number.isFinite(item)
  return true
}

function classifyProduction(inventory, spec) {
  const availableInputs = spec.official.filter((key) => present(inventory, key))
  const missingInputs = spec.official.filter((key) => !present(inventory, key))
  const hasActual = present(inventory, 'producerActual')
  const hasAnyAnchor =
    present(inventory, 'producerPlan') || present(inventory, 'producerTarget') || present(inventory, 'producerCapacity')
  let status = READINESS.BLOCKED
  if (hasActual && hasAnyAnchor && missingInputs.length === 0) status = READINESS.READY
  else if (hasAnyAnchor && !hasActual) status = READINESS.PARTIAL
  else if (hasActual && hasAnyAnchor) status = READINESS.PARTIAL
  else status = READINESS.BLOCKED
  const blockers = []
  if (!hasActual && hasAnyAnchor) blockers.push('Нет совместимого FY-факта для расчёта шага плана / цели.')
  if (!hasActual && !hasAnyAnchor) blockers.push('Нет официальных производственных операндов производителя.')
  return { status, availableInputs, missingInputs, blockers }
}

export function evaluateAnalysisReadiness(analysisId, inventory = {}) {
  const spec = ANALYSIS_REQUIREMENTS[analysisId]
  if (!spec) {
    return {
      analysisId,
      status: READINESS.BLOCKED,
      availableInputs: [],
      missingInputs: [],
      assumptionInputs: [],
      blockers: [`Неизвестный анализ: ${analysisId}`],
    }
  }

  if (analysisId === ANALYSIS_ID.PRODUCTION_SCENARIO) {
    const production = classifyProduction(inventory, spec)
    return {
      analysisId,
      status: production.status,
      availableInputs: production.availableInputs,
      missingInputs: production.missingInputs,
      assumptionInputs: spec.assumptions.filter((key) => present(inventory, key)),
      blockers: production.blockers,
    }
  }

  const availableInputs = spec.official.filter((key) => present(inventory, key))
  const missingInputs = spec.official.filter((key) => !present(inventory, key))
  const assumptionInputs = spec.assumptions.filter((key) => present(inventory, key))
  const missingAssumptions = spec.assumptions.filter((key) => !present(inventory, key))
  const coreMissing = spec.requiredOfficialCore.filter((key) => !present(inventory, key))

  let status = READINESS.READY
  const blockers = []
  if (coreMissing.length) {
    status = READINESS.BLOCKED
    blockers.push(...coreMissing.map((key) => `Отсутствует официальный вход: ${key}`))
  } else if (missingAssumptions.length) {
    status = READINESS.PARTIAL
    blockers.push(...missingAssumptions.map((key) => `Нужно явное допущение: ${key}`))
  } else if (missingInputs.length) {
    status = READINESS.PARTIAL
  }

  return {
    analysisId,
    status,
    availableInputs,
    missingInputs,
    assumptionInputs,
    blockers,
  }
}

export function evaluateAllReadiness(inventory = {}) {
  const byAnalysis = {}
  for (const id of Object.values(ANALYSIS_ID)) {
    byAnalysis[id] = evaluateAnalysisReadiness(id, inventory)
  }
  return byAnalysis
}

export function inventoryFromOfficialAndAssumptions(official = {}, assumptions = {}) {
  return {
    incrementalDemand: official.incrementalDemand,
    producerActual: official.producerActual,
    producerPlan: official.producerPlan,
    producerTarget: official.producerTarget,
    producerCapacity: official.producerCapacity,
    nationalExportFyHs2701: official.nationalExportFy,
    regionalExportFyHs2701: official.regionalExportFy,
    producerExportFyHs2701: official.producerExportFy,
    routeDistance: official.routeDistance,
    tariff: official.tariff,
    loadingPoint: official.loadingPoint,
    tonnesToWagonMethodology: official.tonnesToWagonMethodology,
    salePrice: official.salePrice,
    transportCost: official.transportCost,
    handlingCost: official.handlingCost,
    fxRate: official.fxRate,
    capexSchedule: official.capexSchedule,
    opex: official.opex,
    taxInputs: official.taxInputs,
    demandShare: assumptions.demandShare,
    exportDeltaPercent: assumptions.exportDeltaPercent,
    discountRate: assumptions.discountRate,
  }
}
