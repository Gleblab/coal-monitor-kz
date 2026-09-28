import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { formatQualifiedNumber } from './formatCore.js'
import { EVIDENCE_CLASS, MEASURE_KIND, PERIOD_KIND, SCOPE, officialMetric } from './scenarioEvidence.js'
import {
  ANALYSIS_ID,
  ASSUMPTION_ID,
  CALCULATION_ID,
  EXPANSION_KIND,
  READINESS,
  bindOfficialOperand,
  bindIncrementalDemandOfficial,
  buildScenario,
  calculateM1,
  calculateM2,
  calculateM3,
  calculateM4,
  calculateM5,
  calculateM6,
  compareScenarios,
  demandReadinessTeasers,
  demandReadinessDrawer,
  evaluateAnalysisReadiness,
  evaluateDemandAb,
  evaluateDemandLab,
  parsePercentToShare,
  allocationFromM1,
  modelCanvasState,
  SLIDER_STEP_PERCENT,
  DEFAULT_DEMAND_LAB_UI,
} from './scenarioLab/index.js'
import {
  bindProductionProducer,
  listProductionProducers,
  officialProductionYears,
  evaluateProductionLab,
  productionCopyBundle,
  productionCopyIsSafe,
  withQuestionId,
  PRODUCTION_COMPARISON,
  PRODUCTION_UI,
  LAB_QUESTION_IDS,
  observationBelongsToProducer,
  buildOfficialAnchorTrack,
  productionCapabilities,
  PRODUCTION_PRODUCERS,
} from './scenarioLab/productionSlice.js'

function official(partial) {
  const bound = officialMetric({
    id: partial.id,
    label: partial.label || partial.id,
    value: partial.value,
    unit: partial.unit,
    sourceId: partial.sourceId,
    measureKind: partial.measureKind,
    periodKind: partial.periodKind || PERIOD_KIND.FY,
    year: partial.year,
    scope: partial.scope,
    qualifier: partial.qualifier || 'exact',
    approx: partial.approx ?? partial.qualifier === 'about',
  })
  assert.ok(bound, 'official operand must bind')
  return {
    ...bound,
    companyId: partial.companyId ?? null,
    assetId: partial.assetId ?? null,
    entityKey: partial.entityKey ?? null,
    hsCode: partial.hsCode,
    isFullYear: partial.isFullYear,
    methodologyScope: partial.methodologyScope,
  }
}

const demand20 = official({
  id: 'demand-2030',
  label: 'Дополнительный спрос на энергетический уголь',
  value: 20,
  unit: 'млн т в год',
  year: 2030,
  sourceId: 'pavlodarGenerationDemand2030',
  measureKind: MEASURE_KIND.PLAN,
  periodKind: PERIOD_KIND.HORIZON,
  scope: SCOPE.NATIONAL,
  qualifier: 'about',
})

const bogatyr = {
  companyId: 'bogatyr-komir',
  assetId: 'bogatyr-company',
  entityKey: 'bogatyr-production',
  scope: SCOPE.COMPANY,
  unit: 'млн т',
  sourceId: 'bogatyrKomir',
}

const bogActual = official({
  id: 'bog-actual-2025',
  value: 45.3,
  year: 2025,
  measureKind: MEASURE_KIND.ACTUAL,
  ...bogatyr,
})

const bogPlan = official({
  id: 'bog-plan-2026',
  value: 45.2,
  year: 2026,
  measureKind: MEASURE_KIND.PLAN,
  ...bogatyr,
})

const bogTarget = official({
  id: 'bog-target-2032',
  value: 56.5,
  year: 2032,
  measureKind: MEASURE_KIND.TARGET,
  ...bogatyr,
})

const bogCapacity = official({
  id: 'bog-cap',
  value: 42,
  year: null,
  unit: 'млн т в год',
  measureKind: MEASURE_KIND.CAPACITY,
  periodKind: PERIOD_KIND.HORIZON,
  ...bogatyr,
})

const ministryPlan = official({
  id: 'min-plan-2026',
  value: 128.9,
  unit: 'млн т',
  year: 2026,
  sourceId: 'minenergo2025',
  measureKind: MEASURE_KIND.PLAN,
  scope: SCOPE.NATIONAL,
  entityKey: 'kz-minenergo-production',
})

const exportFy = official({
  id: 'hs-2025',
  value: 10_000_000,
  unit: 'т',
  year: 2025,
  sourceId: 'hs2701comtrade',
  measureKind: MEASURE_KIND.ACTUAL,
  periodKind: PERIOD_KIND.FY,
  scope: SCOPE.TRADE_NATIONAL,
  hsCode: '2701',
  isFullYear: true,
})

function almost(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`)
}

function assertModel(result) {
  assert.equal(result.evidenceClass, EVIDENCE_CLASS.MODEL)
  assert.ok(Array.isArray(result.operands) && result.operands.length > 0)
}

describe('Scenario Lab L0', () => {
  it('1. M1: 20 Mt about × 30% → approximately 6 Mt', () => {
    const { ok, result } = calculateM1(demand20, 0.3)
    assert.equal(ok, true)
    assertModel(result)
    almost(result.value, 6)
    assert.equal(result.approx, true)
    assert.equal(result.qualifier, 'about')
    assert.equal(result.formula, 'Q_inc = O_20 × s')
  })

  it('2. M1: 0% → 0 Mt MODEL, valid', () => {
    const { ok, result } = calculateM1(demand20, 0)
    assert.equal(ok, true)
    assert.equal(result.value, 0)
    assert.equal(result.evidenceClass, EVIDENCE_CLASS.MODEL)
  })

  it('3. M1: share > 100% → validation error', () => {
    const { ok, error, result } = calculateM1(demand20, 1.01)
    assert.equal(ok, false)
    assert.equal(result, null)
    assert.equal(error.code, 'SHARE_OUT_OF_RANGE')
  })

  it('4. M2 Bogatyr compatible plan/actual', () => {
    const { ok, result } = calculateM2(bogPlan, bogActual)
    assert.equal(ok, true)
    almost(result.value, -0.1)
    assert.equal(result.operands[0].year, 2026)
    assert.equal(result.operands[1].year, 2025)
    assert.ok(result.interpretation.includes('2026'))
    assert.ok(result.interpretation.includes('2025'))
    assert.ok(!/срыв плана|completion/i.test(result.interpretation))
  })

  it('5. M2 Ministry national vs Bogatyr → incompatible', () => {
    const { ok, error, result } = calculateM2(ministryPlan, bogActual)
    assert.equal(ok, false)
    assert.equal(result, null)
    assert.ok(error.code === 'ENTITY_MISMATCH' || error.code === 'SCOPE_MISMATCH')
  })

  it('6. M3 Bogatyr 2032 target vs compatible actual', () => {
    const { ok, result } = calculateM3(bogTarget, bogActual)
    assert.equal(ok, true)
    almost(result.value, 11.2)
    assert.equal(result.operands[0].year, 2032)
    assert.equal(result.operands[1].year, 2025)
  })

  it('7. M4 capacity vs actual: numeric difference WITH limitation', () => {
    const { ok, result } = calculateM4(bogCapacity, bogActual)
    assert.equal(ok, true)
    almost(result.value, 42 - 45.3)
    assert.ok(result.limitations.length > 0)
    assert.equal(result.comparability.status, 'NON_COMPARABLE')
  })

  it('8. M4 must not produce semantic label "available capacity"', () => {
    const { result } = calculateM4(bogCapacity, bogActual)
    const label = `${result.label} ${result.id}`
    assert.ok(!/available capacity/i.test(label))
    assert.equal(result.label, 'Разность именованной мощности и факта')
  })

  it('9. M5 horizon mismatch explicitly present', () => {
    const { ok, result } = calculateM5(demand20, bogActual, bogTarget, EXPANSION_KIND.TARGET_GAP)
    assert.equal(ok, true)
    assert.equal(result.horizonMismatch.present, true)
    assert.equal(result.horizonMismatch.demandYear, 2030)
    assert.ok(result.horizonMismatch.producerAnchorYears.includes(2025))
    assert.ok(result.horizonMismatch.producerAnchorYears.includes(2032))
    assert.ok(!/coverage|marketShare|demandCoverage/i.test(result.calculationId))
    assert.equal(result.calculationId, CALCULATION_ID.M5)
  })

  it('10. M6 FY HS2701 +10%', () => {
    const { ok, result } = calculateM6(exportFy, 0.1)
    assert.equal(ok, true)
    almost(result.value, 11_000_000)
    assert.equal(result.year, 2025)
    assert.equal(result.operands[0].hsCode, '2701')
  })

  it('11. M6 YTD baseline rejected', () => {
    const ytd = official({
      id: 'hs-ytd',
      value: 4_000_000,
      unit: 'т',
      year: 2026,
      sourceId: 'hs2701comtrade',
      periodKind: PERIOD_KIND.YTD,
      scope: SCOPE.TRADE_NATIONAL,
      hsCode: '2701',
      isFullYear: false,
    })
    const { ok, error } = calculateM6(ytd, 0.1)
    assert.equal(ok, false)
    assert.equal(error.code, 'YTD_REJECTED')
  })

  it('12. M6 regional/producer baseline rejected', () => {
    const regional = official({
      id: 'hs-reg',
      value: 1_000_000,
      unit: 'т',
      year: 2025,
      sourceId: 'hs2701comtrade',
      scope: SCOPE.REGIONAL,
      hsCode: '2701',
      isFullYear: true,
    })
    const producer = official({
      id: 'hs-prod',
      value: 1_000_000,
      unit: 'т',
      year: 2025,
      sourceId: 'hs2701comtrade',
      scope: SCOPE.COMPANY,
      companyId: 'bogatyr-komir',
      hsCode: '2701',
      isFullYear: true,
    })
    assert.equal(calculateM6(regional, 0.1).error.code, 'REGIONAL_EXPORT_REJECTED')
    assert.equal(calculateM6(producer, 0.1).error.code, 'PRODUCER_EXPORT_REJECTED')
  })

  it('13. Scenario A/B demand comparison', () => {
    const a = buildScenario({
      id: 'A',
      official: { incrementalDemand: demand20 },
      assumptions: { demandShare: 0.2 },
      calculations: [CALCULATION_ID.M1],
    })
    const b = buildScenario({
      id: 'B',
      official: { incrementalDemand: demand20 },
      assumptions: { demandShare: 0.35 },
      calculations: [CALCULATION_ID.M1],
    })
    const cmp = compareScenarios(a, b, CALCULATION_ID.M1)
    assert.equal(cmp.ok, true)
    almost(cmp.comparison.difference, 3)
    assert.equal(cmp.comparison.verdict, null)
  })

  it('14. Scenario A/B export comparison', () => {
    const a = buildScenario({
      official: { nationalExportFy: exportFy },
      assumptions: { exportDeltaPercent: -0.05 },
      calculations: [CALCULATION_ID.M6],
    })
    const b = buildScenario({
      official: { nationalExportFy: exportFy },
      assumptions: { exportDeltaPercent: 0.1 },
      calculations: [CALCULATION_ID.M6],
    })
    const cmp = compareScenarios(a, b, CALCULATION_ID.M6)
    assert.equal(cmp.ok, true)
    almost(cmp.comparison.difference, 1_500_000)
  })

  it('15. A/B incompatible scopes rejected', () => {
    const a = buildScenario({
      official: { incrementalDemand: demand20 },
      assumptions: { demandShare: 0.2 },
      calculations: [CALCULATION_ID.M1],
    })
    const demandCopy = { ...demand20, scope: SCOPE.REGIONAL }
    const b = buildScenario({
      official: { incrementalDemand: demandCopy },
      assumptions: { demandShare: 0.35 },
      calculations: [CALCULATION_ID.M1],
    })
    assert.equal(calculateM1(demandCopy, 0.35).ok, false)
    const forcedB = {
      results: {
        [CALCULATION_ID.M1]: {
          ...a.results[CALCULATION_ID.M1],
          scope: SCOPE.REGIONAL,
          operands: a.results[CALCULATION_ID.M1].operands,
        },
      },
    }
    const cmp = compareScenarios(a, forcedB, CALCULATION_ID.M1)
    assert.equal(cmp.ok, false)
    assert.equal(cmp.error.code, 'SCOPE_MISMATCH')
  })

  it('16. Netback readiness BLOCKED with explicit missing inputs', () => {
    const r = evaluateAnalysisReadiness(ANALYSIS_ID.NETBACK, {})
    assert.equal(r.status, READINESS.BLOCKED)
    assert.ok(r.missingInputs.includes('salePrice'))
    assert.ok(r.missingInputs.includes('transportCost'))
    assert.ok(r.missingInputs.includes('handlingCost'))
  })

  it('17. Logistics readiness BLOCKED', () => {
    const r = evaluateAnalysisReadiness(ANALYSIS_ID.LOGISTICS, {})
    assert.equal(r.status, READINESS.BLOCKED)
    assert.ok(r.missingInputs.includes('routeDistance'))
    assert.ok(r.missingInputs.includes('tariff'))
    assert.ok(r.missingInputs.includes('loadingPoint'))
    assert.ok(r.missingInputs.includes('tonnesToWagonMethodology'))
  })

  it('18. Demand readiness PARTIAL before assumption', () => {
    const r = evaluateAnalysisReadiness(ANALYSIS_ID.DEMAND_SCENARIO, { incrementalDemand: demand20 })
    assert.equal(r.status, READINESS.PARTIAL)
    assert.ok(r.blockers.some((text) => text.includes(ASSUMPTION_ID.DEMAND_SHARE)))
  })

  it('19. Demand scenario runnable after valid assumption', () => {
    const r = evaluateAnalysisReadiness(ANALYSIS_ID.DEMAND_SCENARIO, {
      incrementalDemand: demand20,
      demandShare: 0.3,
    })
    assert.equal(r.status, READINESS.READY)
    const scenario = buildScenario({
      official: { incrementalDemand: demand20 },
      assumptions: { demandShare: 0.3 },
      calculations: [CALCULATION_ID.M1],
    })
    assert.ok(scenario.results[CALCULATION_ID.M1])
    almost(scenario.results[CALCULATION_ID.M1].value, 6)
  })

  it('20. Every MODEL result contains operands', () => {
    const scenario = buildScenario({
      contour: { companyId: 'bogatyr-komir', assetId: 'bogatyr-company' },
      official: {
        incrementalDemand: demand20,
        producerActual: bogActual,
        producerPlan: bogPlan,
        producerTarget: bogTarget,
        producerCapacity: bogCapacity,
        nationalExportFy: exportFy,
      },
      assumptions: { demandShare: 0.3, exportDeltaPercent: 0.1, expansionKind: EXPANSION_KIND.TARGET_GAP },
    })
    for (const result of Object.values(scenario.results)) {
      assert.ok(result.operands.length >= 1)
    }
  })

  it('21. Every OFFICIAL operand contains sourceId', () => {
    const { result } = calculateM1(demand20, 0.25)
    for (const op of result.operands.filter((item) => item.evidenceClass === EVIDENCE_CLASS.OFFICIAL)) {
      assert.ok(op.sourceId)
    }
  })

  it('22. No scenario result is classified OFFICIAL', () => {
    const scenario = buildScenario({
      official: { incrementalDemand: demand20, producerActual: bogActual, producerPlan: bogPlan },
      assumptions: { demandShare: 0.1 },
      calculations: [CALCULATION_ID.M1, CALCULATION_ID.M2],
    })
    for (const result of Object.values(scenario.results)) {
      assert.equal(result.evidenceClass, EVIDENCE_CLASS.MODEL)
    }
  })

  it('23. Missing input is never converted to zero', () => {
    const missing = calculateM1(null, 0.3)
    assert.equal(missing.ok, false)
    assert.notEqual(missing.result?.value, 0)
    const noActual = calculateM2(bogPlan, null)
    assert.equal(noActual.ok, false)
    assert.equal(noActual.error.code, 'MISSING_OFFICIAL')
  })

  it('24. No national → regional inheritance', () => {
    const regionalActual = official({
      id: 'pav-actual',
      value: 10,
      unit: 'млн т',
      year: 2025,
      sourceId: 'bnsIndustryCoalProduction',
      measureKind: MEASURE_KIND.ACTUAL,
      scope: SCOPE.REGIONAL,
      companyId: null,
      entityKey: 'pavlodar-production',
    })
    const run = calculateM2(ministryPlan, regionalActual)
    assert.equal(run.ok, false)
  })

  it('25. No national → asset inheritance', () => {
    const run = calculateM2(ministryPlan, bogActual)
    assert.equal(run.ok, false)
    const m1 = calculateM1(demand20, 0.3)
    assert.equal(m1.result.scope, SCOPE.NATIONAL)
    assert.notEqual(m1.result.scope, SCOPE.ASSET)
  })

  it('bindOfficialOperand rejects sourceless rows', () => {
    assert.equal(bindOfficialOperand({ value: 20, unit: 'млн т' }), null)
  })

  it('production READY when Bogatyr operands complete; PARTIAL without actual', () => {
    const ready = evaluateAnalysisReadiness(ANALYSIS_ID.PRODUCTION_SCENARIO, {
      producerActual: bogActual,
      producerPlan: bogPlan,
      producerTarget: bogTarget,
      producerCapacity: bogCapacity,
    })
    assert.equal(ready.status, READINESS.READY)
    const partial = evaluateAnalysisReadiness(ANALYSIS_ID.PRODUCTION_SCENARIO, {
      producerPlan: bogPlan,
      producerCapacity: bogCapacity,
    })
    assert.equal(partial.status, READINESS.PARTIAL)
  })

  it('regional and producer export sensitivity BLOCKED', () => {
    assert.equal(evaluateAnalysisReadiness(ANALYSIS_ID.REGIONAL_EXPORT, {}).status, READINESS.BLOCKED)
    assert.equal(evaluateAnalysisReadiness(ANALYSIS_ID.PRODUCER_EXPORT, {}).status, READINESS.BLOCKED)
    assert.equal(evaluateAnalysisReadiness(ANALYSIS_ID.INVESTMENT, {}).status, READINESS.BLOCKED)
  })

  it('brief is deterministic and references MODEL results', () => {
    const scenario = buildScenario({
      official: { incrementalDemand: demand20 },
      assumptions: { demandShare: 0.3 },
      calculations: [CALCULATION_ID.M1],
    })
    const line = scenario.brief.supportedConclusions.find((item) => item.calculationId === CALCULATION_ID.M1)
    assert.ok(line.text.includes('30%'))
    assert.ok(line.text.includes('≈ 6') || line.text.includes('≈6'))
    assert.ok(scenario.brief.unsupportedConclusions.some((item) => item.text.includes('не подтверждает')))
  })

  it('share is not silently clamped', () => {
    const { error } = calculateM1(demand20, -0.01)
    assert.equal(error.code, 'SHARE_OUT_OF_RANGE')
  })
})

describe('Scenario Lab L1A demand slice', () => {
  const outlookShape = {
    industryOutlook: {
      additionalDemand: {
        id: 'demand-row',
        label: 'дополнительный спрос на энергетический уголь к 2030 году',
        value: 20,
        unit: 'млн т в год',
        period: '2030',
        sourceId: 'pavlodarGenerationDemand2030',
        value_qualifier: 'about',
        approx: true,
      },
    },
  }

  it('1. baseline loaded from outlook shape, not a UI constant', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    assert.equal(official.evidenceClass, EVIDENCE_CLASS.OFFICIAL)
    assert.equal(official.value, 20)
    assert.equal(official.year, 2030)
    assert.equal(official.sourceId, 'pavlodarGenerationDemand2030')
  })

  it('2. assumption update recalculates MODEL via L0', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const a = evaluateDemandLab({ official, percentText: '20' })
    const b = evaluateDemandLab({ official, percentText: '30' })
    almost(a.model.value, 4)
    almost(b.model.value, 6)
    assert.equal(b.model.formula, 'Q_inc = O_20 × s')
  })

  it('3. approximate qualifier preserved', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '30' })
    assert.equal(lab.model.qualifier, 'about')
    assert.equal(lab.model.approx, true)
  })

  it('4. invalid >100 rejected', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '101' })
    assert.equal(lab.model, null)
    assert.equal(lab.error.code, 'SHARE_OUT_OF_RANGE')
    assert.equal(parsePercentToShare('101').ok, false)
  })

  it('5. missing baseline does not become zero', () => {
    assert.equal(bindIncrementalDemandOfficial({}), null)
    const lab = evaluateDemandLab({ official: null, percentText: '30' })
    assert.equal(lab.blockedBaseline, true)
    assert.equal(lab.model, null)
    assert.notEqual(lab.model?.value, 0)
  })

  it('6. A/B uses same official baseline', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const ab = evaluateDemandAb({ official, percentA: '20', percentB: '35' })
    assert.equal(ab.comparison.ok, true)
    const srcA = ab.a.model.operands.find((item) => item.role === 'O_20')
    const srcB = ab.b.model.operands.find((item) => item.role === 'O_20')
    assert.equal(srcA.sourceId, srcB.sourceId)
    assert.equal(srcA.value, srcB.value)
  })

  it('7. A/B result changes with assumption', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const ab = evaluateDemandAb({ official, percentA: '20', percentB: '35' })
    almost(ab.comparison.comparison.difference, 3)
    almost(ab.a.model.value, 4)
    almost(ab.b.model.value, 7)
  })

  it('8. no winner/verdict', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const ab = evaluateDemandAb({ official, percentA: '20', percentB: '35' })
    assert.equal(ab.comparison.comparison.verdict, null)
  })

  it('9. readiness missing inputs visible', () => {
    const teasers = demandReadinessTeasers(null, '')
    const netback = teasers.find((item) => item.analysisId === ANALYSIS_ID.NETBACK)
    assert.equal(netback.status, READINESS.BLOCKED)
    assert.ok(netback.missingInputs.includes('salePrice'))
    assert.ok(netback.missingInputs.includes('transportCost'))
    assert.ok(netback.missingInputs.includes('handlingCost'))
  })

  it('10. no ad hoc arithmetic fallback — different official value is not treated as 20', () => {
    const outlook = {
      industryOutlook: {
        additionalDemand: {
          ...outlookShape.industryOutlook.additionalDemand,
          value: 10,
        },
      },
    }
    const official = bindIncrementalDemandOfficial(outlook)
    const lab = evaluateDemandLab({ official, percentText: '50' })
    almost(lab.model.value, 5)
    assert.notEqual(lab.model.value, 10)
  })

  it('empty percent is not zero MODEL', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '' })
    assert.equal(lab.awaitingAssumption, true)
    assert.equal(lab.model, null)
  })

  it('L1A presentation never shows raw floating-point artifacts', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '68' })
    assert.equal(lab.model.value, 20 * 0.68)
    const shown = formatQualifiedNumber(lab.model.value, lab.model.qualifier, lab.model.approx)
    assert.equal(shown, '≈ 13,6')
    assert.equal(/00000/.test(shown), false)
    const six = formatQualifiedNumber(6.000000000000001, 'about', true)
    assert.equal(six, '≈ 6')
  })

  it('1. 27.35% accepted', () => {
    const parsed = parsePercentToShare('27.35')
    assert.equal(parsed.ok, true)
    almost(parsed.share, 0.2735)
  })

  it('2. comma 27,35 normalized', () => {
    const parsed = parsePercentToShare('27,35')
    assert.equal(parsed.ok, true)
    almost(parsed.share, 0.2735)
  })

  it('3. 27.35% of approximate 20 → approximate 5.47', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '27.35' })
    almost(lab.model.value, 5.47)
    assert.equal(lab.model.approx, true)
    assert.equal(lab.model.qualifier, 'about')
    assert.equal(formatQualifiedNumber(lab.model.value, lab.model.qualifier, lab.model.approx), '≈ 5,47')
  })

  it('4-5. empty assumption → no MODEL and not ≈0', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '' })
    const canvas = modelCanvasState(lab)
    assert.equal(lab.model, null)
    assert.equal(canvas.showModel, false)
    assert.equal(canvas.hideZero, true)
    assert.notEqual(formatQualifiedNumber(0, 'about', true), 'Задайте долю')
  })

  it('6. slider step supports 0.1', () => {
    assert.equal(SLIDER_STEP_PERCENT, 0.1)
    almost(parsePercentToShare('27.3').share, 0.273)
  })

  it('7. 101 rejected (workbench 2.0)', () => {
    assert.equal(parsePercentToShare('101').ok, false)
  })

  it('8. A/B hidden by default', () => {
    assert.equal(DEFAULT_DEMAND_LAB_UI.compareOpen, false)
    assert.equal(DEFAULT_DEMAND_LAB_UI.percent, '')
    assert.equal(DEFAULT_DEMAND_LAB_UI.percentA, '')
    assert.equal(DEFAULT_DEMAND_LAB_UI.percentB, '')
  })

  it('9. A/B uses same official baseline when enabled', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const ab = evaluateDemandAb({ official, percentA: '20', percentB: '35' })
    assert.equal(ab.a.model.operands.find((item) => item.role === 'O_20').value, official.value)
    assert.equal(ab.b.model.operands.find((item) => item.role === 'O_20').value, official.value)
  })

  it('10. allocation visualization uses M1 result, not ad hoc 20 × share', () => {
    const outlook = {
      industryOutlook: {
        additionalDemand: { ...outlookShape.industryOutlook.additionalDemand, value: 10 },
      },
    }
    const official = bindIncrementalDemandOfficial(outlook)
    const lab = evaluateDemandLab({ official, percentText: '27.35' })
    const view = allocationFromM1(official, lab.model)
    almost(view.modelValue, lab.model.value)
    almost(view.fillPercent, lab.parsed.share * 100)
    assert.notEqual(view.modelValue, 20 * 0.2735)
  })

  it('11. no MODEL + producer actual addition in allocation view', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '27.35' })
    const view = allocationFromM1(official, lab.model)
    assert.equal(Object.hasOwn(view, 'sumWithActual'), false)
    assert.notEqual(view.modelValue, 42.68 + 5.47)
  })

  it('12. 27.35 presentation has no raw float artifact', () => {
    const official = bindIncrementalDemandOfficial(outlookShape)
    const lab = evaluateDemandLab({ official, percentText: '27,35' })
    const shown = formatQualifiedNumber(lab.model.value, lab.model.qualifier, lab.model.approx)
    assert.equal(/00000/.test(shown), false)
    assert.equal(shown.includes('5,47'), true)
  })
})

describe('Scenario Lab L1B production', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const productionUi = readFileSync(join(here, '../components/intelligence/ProductionScenarioLab.jsx'), 'utf8')
  const workbenchUi = readFileSync(join(here, '../components/intelligence/CoalIntelligenceWorkbench.jsx'), 'utf8')

  function productionOutlook(bogatyr = {}, producer = {}) {
    return {
      producerCase: {
        plan: {
          value: 8.5,
          period: '2026',
          year: 2026,
          unit: 'млн т',
          sourceId: 'shubarkolKomir',
          measure_kind: 'plan',
          company_code: 'shubarkol-komir',
        },
        capacity: {
          value: 10,
          unit: 'млн т в год',
          sourceId: 'shubarkolKomir',
          measure_kind: 'capacity',
          coal_asset_code: 'shubarkol-company',
        },
        ...producer,
      },
      bogatyrCase: {
        actual: {
          value: 42.68,
          period: '2024',
          year: 2024,
          unit: 'млн т',
          sourceId: 'bogatyrKomir',
          measure_kind: 'actual',
          company_code: 'bogatyr-komir',
          coal_asset_code: 'bogatyr-company',
        },
        actualLatest: {
          value: 45.3,
          period: '2025',
          year: 2025,
          unit: 'млн т',
          sourceId: 'bogatyrKomir',
          measure_kind: 'actual',
          company_code: 'bogatyr-komir',
          coal_asset_code: 'bogatyr-company',
        },
        plan: {
          value: 45.2,
          period: '2026',
          year: 2026,
          unit: 'млн т',
          sourceId: 'bogatyrKomir',
          measure_kind: 'plan',
          company_code: 'bogatyr-komir',
          coal_asset_code: 'bogatyr-company',
        },
        target: {
          value: 56.5,
          period: '2032',
          year: 2032,
          unit: 'млн т в год',
          sourceId: 'bogatyrKomir',
          measure_kind: 'target',
          company_code: 'bogatyr-komir',
          coal_asset_code: 'bogatyr-company',
        },
        capacity: {
          value: 42,
          unit: 'млн т в год',
          sourceId: 'bogatyrKomir',
          measure_kind: 'capacity',
          coal_asset_code: 'bogatyr-company',
        },
        ...bogatyr,
      },
    }
  }

  it('1. Bogatyr official operands bind from repository-shaped outlook', () => {
    const binding = bindProductionProducer(productionOutlook())
    assert.equal(binding.actual.value, 45.3)
    assert.equal(binding.actual.year, 2025)
    assert.equal(binding.plan.value, 45.2)
    assert.equal(binding.target.value, 56.5)
    assert.equal(binding.capacity.value, 42)
    assert.equal(binding.documentedActual.year, 2024)
    assert.match(binding.vintageNote, /2025/)
    assert.match(binding.vintageNote, /2024/)
  })

  it('2. M2 uses actual 2025 + plan 2026', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.PLAN_STEP,
    })
    const plan = lab.model.operands.find((item) => item.role === 'plan')
    const actual = lab.model.operands.find((item) => item.role === 'actual')
    assert.equal(plan.year, 2026)
    assert.equal(plan.value, 45.2)
    assert.equal(actual.year, 2025)
    assert.equal(actual.value, 45.3)
    assert.equal(lab.model.calculationId, CALCULATION_ID.M2)
  })

  it('3. M2 result is -0.1', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.PLAN_STEP,
    })
    almost(lab.model.value, -0.1)
  })

  it('4. M2 does not say plan failure', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.PLAN_STEP,
    })
    assert.match(lab.model.interpretation, /не прогноз/i)
    assert.doesNotMatch(lab.model.interpretation, /срыв плана|провал плана|plan failure|underperformance/i)
    assert.equal(productionCopyIsSafe(lab.model.interpretation), true)
  })

  it('5. M3 target 2032 − actual 2025 = 11.2', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.TARGET_GAP,
    })
    almost(lab.model.value, 11.2)
    assert.equal(lab.model.year, 2032)
    assert.equal(lab.model.operands.find((item) => item.role === 'actual').year, 2025)
    assert.ok(lab.model.limitations.some((text) => /млн т в год/.test(text)))
  })

  it('6. M3 does not create CAGR', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.TARGET_GAP,
    })
    assert.match(lab.model.interpretation, /не CAGR/i)
    assert.doesNotMatch(lab.model.formula, /CAGR/i)
    assert.equal(Object.hasOwn(lab.model, 'cagr'), false)
  })

  it('7. M4 capacity 42 − actual 45.3 = -3.3', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.CAPACITY_REF,
    })
    almost(lab.model.value, -3.3)
    assert.equal(lab.model.calculationId, CALCULATION_ID.M4)
  })

  it('8. M4 never labels available/spare capacity', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.CAPACITY_REF,
    })
    assert.doesNotMatch(PRODUCTION_UI.capacityDifference, /spare|unused|available capacity|свободн|резервн|неиспользованн/i)
    assert.doesNotMatch(lab.model.label, /spare|unused|available/i)
    assert.match(lab.model.interpretation, /не «доступная мощность»/)
    assert.doesNotMatch(productionUi, /spare capacity|unused capacity|available capacity/)
  })

  it('9. capacity and production concepts remain explicitly distinct', () => {
    const lab = evaluateProductionLab({
      binding: bindProductionProducer(productionOutlook()),
      comparison: PRODUCTION_COMPARISON.CAPACITY_REF,
    })
    assert.equal(lab.track.capacity.onTimeline, false)
    assert.match(PRODUCTION_UI.capacityConceptNote, /разные концепты/)
    assert.equal(lab.model.comparability.status, 'NON_COMPARABLE')
  })

  it('10. no React-side arithmetic', () => {
    assert.doesNotMatch(productionUi, /calculateM[234]/)
    assert.doesNotMatch(productionUi, /45\.2\s*[-−]\s*45\.3/)
    assert.doesNotMatch(productionUi, /56\.5\s*[-−]\s*45\.3/)
    assert.doesNotMatch(productionUi, /42\s*[-−]\s*45\.3/)
    assert.match(productionUi, /evaluateProductionLab/)
  })

  it('11. no fake intermediate years', () => {
    const lab = evaluateProductionLab({ binding: bindProductionProducer(productionOutlook()) })
    const years = officialProductionYears(lab.binding)
    assert.deepEqual(years.slice().sort(), [2025, 2026, 2032])
    assert.deepEqual(lab.track.interpolatedYears, [])
    assert.equal(lab.track.forbiddenYearsPresent, false)
    for (const year of [2027, 2028, 2029, 2030, 2031]) {
      assert.equal(years.includes(year), false)
      assert.equal(lab.track.years.includes(year), false)
    }
  })

  it('12. official operands retain sourceId', () => {
    const binding = bindProductionProducer(productionOutlook())
    assert.equal(binding.actual.sourceId, 'bogatyrKomir')
    assert.equal(binding.plan.sourceId, 'bogatyrKomir')
    assert.equal(binding.target.sourceId, 'bogatyrKomir')
    assert.equal(binding.capacity.sourceId, 'bogatyrKomir')
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.PLAN_STEP })
    assert.ok(lab.model.operands.every((item) => item.sourceId))
  })

  it('13. question switching preserves Incremental Demand state', () => {
    const before = { ...DEFAULT_DEMAND_LAB_UI, percent: '27.35', percentA: '20', compareOpen: true }
    const after = withQuestionId(before, LAB_QUESTION_IDS.PRODUCTION_SCENARIO)
    assert.equal(after.questionId, 'productionScenario')
    assert.equal(after.percent, '27.35')
    assert.equal(after.percentA, '20')
    assert.equal(after.compareOpen, true)
    assert.match(workbenchUi, /setQuestionId/)
  })

  it('14. missing operand produces honest unavailable state, not zero', () => {
    const binding = bindProductionProducer(productionOutlook({ plan: null }))
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.PLAN_STEP })
    assert.equal(lab.model, null)
    assert.equal(lab.unavailable, true)
    assert.ok(lab.error)
    assert.notEqual(lab.error.code, null)
    assert.notEqual(lab.models.planStep?.value, 0)
  })

  it('15. Shubarkol is listed with partial evidence and without a verified actual', () => {
    const listed = listProductionProducers(productionOutlook())
    assert.deepEqual(listed.map((item) => item.id), ['bogatyr', 'shubarkol'])
    const shubarkol = listed.find((item) => item.id === 'shubarkol')
    assert.equal(shubarkol.status, 'PARTIAL')
    assert.equal(shubarkol.binding.actual, null)
    assert.equal(shubarkol.binding.plan.value, 8.5)
    assert.equal(shubarkol.binding.capacity.value, 10)
    const copy = productionCopyBundle(
      evaluateProductionLab({
        binding: bindProductionProducer(productionOutlook()),
        comparison: PRODUCTION_COMPARISON.CAPACITY_REF,
      }),
    )
    assert.equal(productionCopyIsSafe(copy.filter((text) => text === PRODUCTION_UI.capacityDifference)), true)
  })

  it('16. Bogatyr capabilities expose all three comparisons from canonical sources', () => {
    const binding = bindProductionProducer(productionOutlook(), 'bogatyr')
    const caps = productionCapabilities(binding)
    assert.equal(caps.canCompareActualToPlan, true)
    assert.equal(caps.canCompareActualToTarget, true)
    assert.equal(caps.canCompareActualToCapacity, true)
    assert.equal(caps.availableCount, 3)
    assert.equal(binding.actual.sourceId, 'bogatyrKomir')
    assert.equal(binding.plan.sourceId, 'bogatyrKomir')
    assert.equal(binding.target.sourceId, 'bogatyrKomir')
    assert.equal(binding.capacity.sourceId, 'bogatyrKomir')
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.PLAN_STEP })
    almost(lab.model.value, -0.1)
    assert.match(lab.coverageCopy.line, /3 сравнения/)
  })

  it('17. missing Shubarkol actual is not zero and actual-dependent comparisons stay unavailable', () => {
    const binding = bindProductionProducer(productionOutlook(), 'shubarkol')
    assert.equal(binding.actual, null)
    assert.notEqual(binding.actual, 0)
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.PLAN_STEP })
    assert.equal(lab.model, null)
    assert.equal(lab.models.planStep, null)
    assert.equal(lab.models.targetGap, null)
    assert.equal(lab.models.capacityRef, null)
    assert.equal(lab.capabilities.availableCount, 0)
    assert.match(lab.error.message, /фактическ/i)
    assert.match(lab.coverageCopy.line, /отдельные опубликованные показатели/)
    assert.notEqual(binding.plan.value, 45.2)
    assert.notEqual(binding.plan.value, 45.3)
    assert.notEqual(binding.capacity.value, 42)
    assert.match(productionUi, /Не найден подтверждённый показатель/)
    assert.match(productionUi, /Почему расчёт недоступен/)
    assert.doesNotMatch(productionUi, /\bL1B\b/)
    assert.doesNotMatch(productionUi, /\bREADY\b/)
  })

  it('18. timeline: one dated anchor has no structural path; two or more may connect without interpolation', () => {
    const partial = buildOfficialAnchorTrack(bindProductionProducer(productionOutlook(), 'shubarkol'))
    assert.equal(partial.points.length, 1)
    assert.equal(partial.connection, 'none')
    assert.equal(partial.capacity.onTimeline, false)
    assert.deepEqual(partial.interpolatedYears, [])
    const full = evaluateProductionLab({ binding: bindProductionProducer(productionOutlook(), 'bogatyr') })
    assert.ok(full.track.points.length >= 2)
    assert.equal(full.track.connection, 'anchor_readability')
    assert.deepEqual(full.track.interpolatedYears, [])
    assert.equal(full.track.years.includes(2027), false)
    assert.match(productionUi, /track\.connection === 'anchor_readability'/)
  })

  it('19. selected producer cannot consume another company observation, even from a shared source name', () => {
    const shubarkolDef = PRODUCTION_PRODUCERS.find((item) => item.id === 'shubarkol')
    const bogatyrDef = PRODUCTION_PRODUCERS.find((item) => item.id === 'bogatyr')
    assert.equal(
      observationBelongsToProducer(
        { value: 45.3, sourceId: 'minenergoShubarkol2026', company_code: 'bogatyr-komir' },
        shubarkolDef,
      ),
      false,
    )
    assert.equal(
      observationBelongsToProducer(
        { value: 45.2, sourceId: 'minenergoShubarkol2026', company_code: 'bogatyr-komir' },
        bogatyrDef,
      ),
      true,
    )
    const leaked = productionOutlook(
      {},
      {
        actual: {
          value: 45.3,
          period: '2025',
          year: 2025,
          unit: 'млн т',
          sourceId: 'bogatyrKomir',
          measure_kind: 'actual',
          company_code: 'bogatyr-komir',
          coal_asset_code: 'bogatyr-company',
        },
      },
    )
    const binding = bindProductionProducer(leaked, 'shubarkol')
    assert.equal(binding.actual, null)
    assert.equal(binding.plan.value, 8.5)
  })

  it('20. Incremental Demand remains a Kazakhstan market baseline and survives a production round-trip', () => {
    const demandUi = readFileSync(join(here, '../components/intelligence/IncrementalDemandLab.jsx'), 'utf8')
    assert.match(demandUi, /Контур анализа/)
    assert.match(demandUi, /Казахстан/)
    assert.match(demandUi, /национальный ориентир дополнительного спроса, не добыча производителя/)
    assert.match(demandUi, /Контекст производителя/)
    assert.doesNotMatch(demandUi, /добыч[аеи].*производител[яь].*20/)
    const official = bindIncrementalDemandOfficial({
      industryOutlook: {
        additionalDemand: {
          value: 20,
          unit: 'млн т в год',
          period: '2030',
          sourceId: 'pavlodarGenerationDemand2030',
          value_qualifier: 'about',
          approx: true,
        },
      },
    })
    const lab = evaluateDemandLab({ official, percentText: '30' })
    almost(lab.model.value, 6)
    assert.equal(official.scope, SCOPE.NATIONAL)
    assert.equal(official.year, 2030)
    const before = { ...DEFAULT_DEMAND_LAB_UI, percent: '27.35', percentA: '20', compareOpen: true }
    const viaProduction = withQuestionId(before, LAB_QUESTION_IDS.PRODUCTION_SCENARIO)
    const back = withQuestionId(viaProduction, LAB_QUESTION_IDS.INCREMENTAL_DEMAND)
    assert.equal(back.percent, '27.35')
    assert.equal(back.percentA, '20')
    assert.equal(back.compareOpen, true)
    assert.equal(back.questionId, LAB_QUESTION_IDS.INCREMENTAL_DEMAND)
  })

  it('21. Shubarkol 2022/2023 actuals stay historical and do not unlock Fact → Plan', () => {
    const outlook = productionOutlook(
      {},
      {
        actualHistorical: [
          {
            value: 13.813,
            period: '2023',
            year: 2023,
            unit: 'млн т',
            sourceId: 'kaseShukAr2023',
            measure_kind: 'actual',
            company_code: 'shubarkol-komir',
            coal_asset_code: 'shubarkol-company',
          },
          {
            value: 12.544,
            period: '2022',
            year: 2022,
            unit: 'млн т',
            sourceId: 'kaseShukAr2023',
            measure_kind: 'actual',
            company_code: 'shubarkol-komir',
            coal_asset_code: 'shubarkol-company',
          },
        ],
      },
    )
    const binding = bindProductionProducer(outlook, 'shubarkol')
    assert.equal(binding.actual, null)
    assert.equal(binding.plan.value, 8.5)
    assert.equal(binding.capacity.value, 10)
    assert.equal(binding.historicalActuals[0].year, 2023)
    assert.equal(binding.historicalActuals[0].value, 13.813)
    assert.equal(binding.historicalActuals[1].value, 12.544)
    assert.equal(binding.historicalActuals[1].measureKind, MEASURE_KIND.ACTUAL)
    assert.equal(binding.historicalActuals[1].sourceId, 'kaseShukAr2023')
    assert.equal(binding.historicalActuals[1].companyId, 'shubarkol-komir')
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.PLAN_STEP })
    assert.equal(lab.model, null)
    assert.equal(lab.capabilities.canCompareActualToPlan, false)
    assert.match(lab.error.message, /2023/)
    assert.match(lab.error.message, /2026/)
    assert.match(lab.error.message, /не используется как текущий сопоставимый/)
    assert.match(productionUi, /исторический показатель/)
    assert.match(productionUi, /Исторический показатель/)
  })

  it('22. Karazhyra binds verified 2024 actual only; comparisons stay unavailable', () => {
    const outlook = {
      ...productionOutlook(),
      karazhyraCase: {
        actual: {
          value: 7.5,
          period: '2024',
          year: 2024,
          unit: 'млн т',
          sourceId: 'kaseKzhrAr',
          measure_kind: 'actual',
          company_code: 'karazhyra',
          coal_asset_code: 'karazhyra-deposit',
        },
        actualLatest: {
          value: 7.5,
          period: '2024',
          year: 2024,
          unit: 'млн т',
          sourceId: 'kaseKzhrAr',
          measure_kind: 'actual',
          company_code: 'karazhyra',
          coal_asset_code: 'karazhyra-deposit',
        },
        actualHistorical: [
          {
            value: 7.9,
            period: '2023',
            year: 2023,
            unit: 'млн т',
            sourceId: 'kaseKzhrAr',
            measure_kind: 'actual',
            company_code: 'karazhyra',
            coal_asset_code: 'karazhyra-deposit',
          },
        ],
        plan: null,
        target: null,
        capacity: null,
      },
    }
    const listed = listProductionProducers(outlook)
    assert.deepEqual(listed.map((item) => item.id), ['bogatyr', 'shubarkol', 'karazhyra'])
    const binding = bindProductionProducer(outlook, 'karazhyra')
    assert.equal(binding.actual.value, 7.5)
    assert.equal(binding.actual.year, 2024)
    assert.equal(binding.actual.unit, 'млн т')
    assert.equal(binding.actual.measureKind, MEASURE_KIND.ACTUAL)
    assert.equal(binding.actual.sourceId, 'kaseKzhrAr')
    assert.equal(binding.actual.companyId, 'karazhyra')
    assert.equal(binding.plan, null)
    assert.equal(binding.target, null)
    assert.equal(binding.capacity, null)
    assert.equal(binding.historicalActuals[0].value, 7.9)
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.PLAN_STEP })
    assert.equal(lab.capabilities.availableCount, 0)
    assert.equal(lab.model, null)
    assert.equal(bindProductionProducer(outlook, 'bogatyr').actual.value, 45.3)
  })

  it('23. Maikuben binds 2024 actual and capacity; 2023 conflict stays historical; 2025 is not silently used', () => {
    const outlook = {
      ...productionOutlook(),
      maikubenCase: {
        actual: {
          value: 2.3,
          period: '2024',
          year: 2024,
          unit: 'млн т',
          sourceId: 'kaseMkbwAr',
          measure_kind: 'actual',
          company_code: 'maikuben-west',
        },
        actualLatest: {
          value: 2.3,
          period: '2024',
          year: 2024,
          unit: 'млн т',
          sourceId: 'kaseMkbwAr',
          measure_kind: 'actual',
          company_code: 'maikuben-west',
        },
        actualHistorical: [
          {
            value: 4.0,
            period: '2023',
            year: 2023,
            unit: 'млн т',
            sourceId: 'kaseMkbwAr',
            measure_kind: 'actual',
            series_role: 'revised',
            company_code: 'maikuben-west',
          },
          {
            value: 3.8,
            period: '2023',
            year: 2023,
            unit: 'млн т',
            sourceId: 'kaseMkbwAr',
            measure_kind: 'actual',
            series_role: 'original',
            company_code: 'maikuben-west',
          },
        ],
        plan: null,
        target: null,
        capacity: {
          value: 5.2,
          unit: 'млн т в год',
          sourceId: 'kaseMkbwAr',
          measure_kind: 'capacity',
          company_code: 'maikuben-west',
          coal_asset_code: 'maikuben-pit',
        },
      },
    }
    const binding = bindProductionProducer(outlook, 'maikuben')
    assert.equal(binding.actual.value, 2.3)
    assert.equal(binding.actual.year, 2024)
    assert.equal(binding.capacity.value, 5.2)
    assert.equal(binding.plan, null)
    assert.equal(binding.target, null)
    assert.ok(binding.historicalActuals.some((item) => item.value === 4.0 && item.year === 2023))
    assert.ok(binding.historicalActuals.some((item) => item.value === 3.8 && item.year === 2023))
    const lab = evaluateProductionLab({ binding, comparison: PRODUCTION_COMPARISON.CAPACITY_REF })
    assert.equal(lab.capabilities.canCompareActualToPlan, false)
    assert.equal(lab.capabilities.canCompareActualToTarget, false)
    assert.equal(lab.capabilities.canCompareActualToCapacity, true)
    almost(lab.model.value, 2.9)
    assert.equal(lab.model.comparability.status, 'NON_COMPARABLE')
    assert.equal(bindProductionProducer(outlook, 'bogatyr').plan.value, 45.2)
    assert.equal(bindProductionProducer(outlook, 'shubarkol').plan.value, 8.5)
  })

  it('24. pre-2024 actualLatest is demoted; national rows cannot bind to a producer', () => {
    const outlook = productionOutlook(
      {},
      {
        actualLatest: {
          value: 12.544,
          period: '2022',
          year: 2022,
          unit: 'млн т',
          sourceId: 'kaseShukAr2023',
          measure_kind: 'actual',
          company_code: 'shubarkol-komir',
          coal_asset_code: 'shubarkol-company',
        },
      },
    )
    const binding = bindProductionProducer(outlook, 'shubarkol')
    assert.equal(binding.actual, null)
    assert.equal(binding.historicalActuals[0].value, 12.544)
    const leakedNational = productionOutlook(
      {},
      {
        plan: {
          value: 128.9,
          period: '2026',
          year: 2026,
          unit: 'млн т',
          sourceId: 'minenergo2025',
          measure_kind: 'plan',
          company_code: null,
        },
      },
    )
    const shubarkol = bindProductionProducer(leakedNational, 'shubarkol')
    assert.equal(shubarkol.plan, null)
    assert.notEqual(shubarkol.capacity.value, 128.9)
    const karazhyraDef = PRODUCTION_PRODUCERS.find((item) => item.id === 'karazhyra')
    assert.equal(
      observationBelongsToProducer(
        { value: 7.5, sourceId: 'kaseKzhrAr', company_code: 'bogatyr-komir' },
        karazhyraDef,
      ),
      false,
    )
  })
})
