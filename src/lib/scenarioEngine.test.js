import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { COMPARABILITY, VIEW_MODE, EVIDENCE_CLASS, MEASURE_KIND, SCOPE, NODE_STATUS } from './scenarioEvidence.js'
import {
  bindOfficial,
  bindScenario,
  compareOfficialMetrics,
  modelDelta,
  assertOfficialTraceability,
  assertModelTransparency,
} from './scenarioEngine.js'
import { pickRailPrimary, mapExportTotalsToMetrics } from './scenarioRail.js'

function metric(partial) {
  return {
    id: partial.id,
    label: partial.label,
    value: partial.value,
    unit: partial.unit,
    period: String(partial.year ?? ''),
    year: partial.year,
    status: partial.status,
    sourceId: partial.sourceId,
    measure_kind: partial.measureKind,
    value_qualifier: partial.qualifier || 'exact',
    approx: false,
    note: partial.note || null,
    indicator_kind: partial.indicatorKind || null,
  }
}

function fixtureOutlook() {
  return {
    trajectory: {
      actualExtraction: metric({
        id: 'min-actual-2025',
        label: 'Добыча Минэнерго',
        value: 112.8,
        unit: 'млн т',
        year: 2025,
        status: 'ФАКТ',
        sourceId: 'minenergo2025',
        measureKind: 'actual',
      }),
      plannedExtraction: metric({
        id: 'min-plan-2026',
        label: 'План добычи Минэнерго',
        value: 117,
        unit: 'млн т',
        year: 2026,
        status: 'ПЛАН',
        sourceId: 'minenergo2025',
        measureKind: 'plan',
      }),
    },
    bogatyrCase: {
      actual: metric({
        id: 'bog-actual',
        label: 'Добыча Богатырь',
        value: 42.7,
        unit: 'млн т',
        year: 2024,
        status: 'ФАКТ',
        sourceId: 'bogatyrKomir',
        measureKind: 'actual',
      }),
      plan: metric({
        id: 'bog-plan',
        label: 'План Богатырь',
        value: 40,
        unit: 'млн т',
        year: 2026,
        status: 'ПЛАН',
        sourceId: 'minenergoShubarkol2026',
        measureKind: 'plan',
      }),
      target: metric({
        id: 'bog-target',
        label: 'Цель Богатырь',
        value: 50,
        unit: 'млн т',
        year: 2032,
        status: 'ЦЕЛЕВОЙ ПОКАЗАТЕЛЬ',
        sourceId: 'bogatyrKomir',
        measureKind: 'target',
      }),
      capacity: metric({
        id: 'bog-capacity',
        label: 'Мощность Богатырь',
        value: 42,
        unit: 'млн т',
        year: null,
        status: 'Данные предприятия',
        sourceId: 'bogatyrKomir',
        measureKind: 'capacity',
        indicatorKind: 'capacity',
      }),
    },
    industryOutlook: {
      additionalDemand: metric({
        id: 'demand-2030',
        label: 'Дополнительный спрос',
        value: 12,
        unit: 'млн т',
        year: 2030,
        status: 'ПЛАН',
        sourceId: 'primeMinisterCoalGen',
        measureKind: 'plan',
        qualifier: 'about',
      }),
      energyNeed: metric({
        id: 'need-2032',
        label: 'Потребность',
        value: 8,
        unit: 'млн т',
        year: 2032,
        status: 'ОЖИДАНИЕ',
        sourceId: 'primeMinisterCoalGen',
        measureKind: 'expected',
        qualifier: 'more_than',
      }),
      gondolas: metric({
        id: 'gondolas',
        label: 'полувагоны',
        value: 1700,
        unit: 'ед. в сутки',
        year: 2026,
        status: 'ПЛАН',
        sourceId: 'primeMinisterCoalGen',
        measureKind: 'plan',
      }),
      railMeasure: { name: 'Железнодорожная логистика', sourceId: 'primeMinisterCoalGen' },
    },
    nationalProject: {
      indicators: [
        metric({
          id: 'gen-capacity',
          label: 'Мощность угольной генерации',
          value: 7.8,
          unit: 'ГВт',
          year: 2030,
          status: 'ПЛАН',
          sourceId: 'primeMinisterCoalGen',
          measureKind: 'capacity',
          indicatorKind: 'capacity',
        }),
      ],
    },
    producerCase: { unpublishedGeography: true },
  }
}

const bnsActual = metric({
  id: 'bns-2025',
  label: 'Добыча БНС',
  value: 111.4,
  unit: 'млн т',
  year: 2025,
  status: 'ФАКТ',
  sourceId: 'bnsIndustryCoalProduction',
  measureKind: 'actual',
})

function nodeById(bundle, id) {
  return bundle.nodes.find((item) => item.id === id)
}

function allOfficial(bundle) {
  return bundle.nodes.flatMap((node) => [...node.officialMetrics, ...node.contextMetrics])
}

function allModel(bundle) {
  return bundle.nodes.flatMap((node) => node.modelMetrics)
}

describe('Phase 1A scenario binder', () => {
  it('A ministry 2025 actual vs 2026 plan follows targetMonitor rules', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      outlook: fixtureOutlook(),
    })
    const model = nodeById(bundle, 'production').modelMetrics.find((item) => item.id === 'ministry-plan-vs-actual')
    assert.ok(model)
    assert.equal(model.comparability.status, COMPARABILITY.PREVIOUS_PERIOD)
    assert.equal(model.comparability.comparable, false)
    assert.equal(model.value, null)
    assert.match(nodeById(bundle, 'production').statement, /сопоставимый факт 2026 отсутствует/)
  })

  it('B Ministry vs BNS is NON_COMPARABLE', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.VERIFIED,
      horizon: 2026,
      outlook: fixtureOutlook(),
      bnsActual,
    })
    const model = nodeById(bundle, 'production').modelMetrics.find((item) => item.id === 'ministry-vs-bns')
    assert.equal(model.comparability.status, COMPARABILITY.NON_COMPARABLE)
    assert.equal(model.value, null)
  })

  it('C Bogatyr capacity is never production', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      assetId: 'bogatyr-company',
      companyId: 'bogatyr-komir',
      regionId: 'pavlodar',
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    const capacity = [...production.officialMetrics, ...production.contextMetrics].find((item) => item.measureKind === MEASURE_KIND.CAPACITY)
    assert.ok(capacity)
    assert.notEqual(capacity.measureKind, MEASURE_KIND.ACTUAL)
    const forbidden = production.modelMetrics.find((item) => item.id === 'capacity-vs-production')
    assert.equal(forbidden.comparability.status, COMPARABILITY.NON_COMPARABLE)
    assert.equal(forbidden.value, null)
  })

  it('D national 2026 plan is not Bogatyr plan', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      assetId: 'bogatyr-company',
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    const official = [...production.officialMetrics, ...production.contextMetrics]
    assert.ok(official.every((item) => item.scope !== SCOPE.NATIONAL))
    const inherit = production.modelMetrics.find((item) => item.id === 'national-plan-as-bogatyr')
    assert.equal(inherit.comparability.status, COMPARABILITY.NON_COMPARABLE)
    assert.equal(inherit.value, null)
  })

  it('E 2030 demand is never added to 2032 requirement', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2030,
      outlook: fixtureOutlook(),
    })
    const model = nodeById(bundle, 'energyDemand').modelMetrics.find((item) => item.id === 'demand-2030-plus-2032')
    assert.equal(model.comparability.status, COMPARABILITY.NON_COMPARABLE)
    assert.equal(model.value, null)
  })

  it('F YTD export is never treated as FY', () => {
    const ytdRow = {
      ...metric({
        id: 'exp-ytd',
        label: 'Экспорт YTD',
        value: 10,
        unit: 'млн т',
        year: 2026,
        status: 'ФАКТ',
        sourceId: 'minenergo2025',
        measureKind: 'actual',
      }),
      is_full_year: false,
      period_type: 'ytd',
    }
    const fyRow = {
      ...metric({
        id: 'exp-fy',
        label: 'Экспорт FY',
        value: 20,
        unit: 'млн т',
        year: 2025,
        status: 'ФАКТ',
        sourceId: 'minenergo2025',
        measureKind: 'actual',
      }),
      is_full_year: true,
      period_type: 'year',
    }
    const bundle = bindScenario({
      viewMode: VIEW_MODE.VERIFIED,
      horizon: 2026,
      outlook: fixtureOutlook(),
      exportMetrics: [ytdRow, fyRow],
    })
    const exports = nodeById(bundle, 'exports')
    const ytdItem = [...exports.officialMetrics, ...exports.contextMetrics].find((item) => item.id === 'exp-ytd')
    const fyItem = [...exports.officialMetrics, ...exports.contextMetrics].find((item) => item.id === 'exp-fy')
    assert.equal(ytdItem.periodKind, 'ytd')
    assert.equal(fyItem.periodKind, 'fy')
    const comparability = compareOfficialMetrics(ytdItem, fyItem)
    assert.equal(comparability.status, COMPARABILITY.PARTIAL_PERIOD)
    const model = exports.modelMetrics.find((item) => item.id === 'export-ytd-vs-fy')
    assert.ok(model)
    assert.equal(model.value, null)
    assert.notEqual(model.comparability.status, COMPARABILITY.COMPARABLE)
  })

  it('G wagon/day is never wagon fleet', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.CONSTRAINTS,
      horizon: 2026,
      outlook: fixtureOutlook(),
    })
    const rail = nodeById(bundle, 'railLogistics')
    assert.match(rail.statement, /не парк вагонов/)
    const model = rail.modelMetrics.find((item) => item.id === 'wagon-day-as-fleet')
    assert.equal(model.comparability.status, COMPARABILITY.NON_COMPARABLE)
  })

  it('H missing regional evidence is explicit, not zero', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.VERIFIED,
      horizon: 2026,
      regionId: 'pavlodar',
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    assert.equal(production.status, NODE_STATUS.MISSING)
    assert.match(production.statement, /отсутствует подтверждённый региональный ряд|Нет подтверждённых данных/)
    assert.equal(production.officialMetrics.length, 0)
    assert.ok(production.officialMetrics.every((item) => item.value !== 0))
    const energy = nodeById(bundle, 'energyDemand')
    assert.equal(energy.status, NODE_STATUS.MISSING)
    assert.doesNotMatch(JSON.stringify(energy.officialMetrics), /"value":0/)
  })

  it('I every OFFICIAL metric has sourceId', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      assetId: 'bogatyr-company',
      regionId: 'pavlodar',
      outlook: fixtureOutlook(),
      bnsActual,
      exportMetrics: [
        metric({
          id: 'exp-fy',
          value: 20,
          unit: 'млн т',
          year: 2025,
          status: 'ФАКТ',
          sourceId: 'minenergo2025',
          measureKind: 'actual',
        }),
      ],
    })
    assert.equal(assertOfficialTraceability(allOfficial(bundle)), true)
    assert.ok(allOfficial(bundle).length > 0)
  })

  it('J every MODEL metric has formula, operands, comparability', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2030,
      outlook: fixtureOutlook(),
      bnsActual,
      assetId: 'bogatyr-company',
    })
    const models = allModel(bundle)
    assert.ok(models.length > 0)
    assert.equal(assertModelTransparency(models), true)
  })

  it('view modes do not rescale official values', () => {
    const outlook = fixtureOutlook()
    const verified = bindScenario({ viewMode: VIEW_MODE.VERIFIED, horizon: 2026, outlook })
    const planned = bindScenario({ viewMode: VIEW_MODE.PLANNED, horizon: 2026, outlook })
    const constraints = bindScenario({ viewMode: VIEW_MODE.CONSTRAINTS, horizon: 2026, outlook })
    const planVerified = [...nodeById(verified, 'production').officialMetrics, ...nodeById(verified, 'production').contextMetrics].find(
      (item) => item.measureKind === MEASURE_KIND.PLAN,
    )
    const planPlanned = [...nodeById(planned, 'production').officialMetrics, ...nodeById(planned, 'production').contextMetrics].find(
      (item) => item.measureKind === MEASURE_KIND.PLAN,
    )
    const planConstraints = [...nodeById(constraints, 'production').officialMetrics, ...nodeById(constraints, 'production').contextMetrics].find(
      (item) => item.measureKind === MEASURE_KIND.PLAN,
    )
    assert.equal(planVerified.value, planPlanned.value)
    assert.equal(planPlanned.value, planConstraints.value)
    assert.equal(planVerified.evidenceClass, EVIDENCE_CLASS.OFFICIAL)
    assert.ok(nodeById(verified, 'production').officialMetrics.every((item) => item.measureKind === MEASURE_KIND.ACTUAL))
    assert.ok(nodeById(verified, 'production').contextMetrics.some((item) => item.measureKind === MEASURE_KIND.PLAN))
    assert.ok(nodeById(planned, 'production').officialMetrics.some((item) => item.measureKind === MEASURE_KIND.PLAN))
  })

  it('modelDelta refuses FY vs YTD', () => {
    const plan = bindOfficial(
      metric({
        id: 'p',
        value: 10,
        unit: 'млн т',
        year: 2026,
        sourceId: 'minenergo2025',
        measureKind: 'plan',
        status: 'ПЛАН',
      }),
      { scope: SCOPE.NATIONAL, periodKind: 'fy', measureKind: 'plan' },
    )
    const ytd = bindOfficial(
      metric({
        id: 'a',
        value: 4,
        unit: 'млн т',
        year: 2026,
        sourceId: 'minenergo2025',
        measureKind: 'actual',
        status: 'ФАКТ',
      }),
      { scope: SCOPE.NATIONAL, periodKind: 'ytd', measureKind: 'actual' },
    )
    const result = modelDelta(plan, ytd, {
      entityKey: 'kz-minenergo-production',
      methodologyKey: 'minenergo2025',
    })
    assert.equal(result.comparability.status, COMPARABILITY.PARTIAL_PERIOD)
    assert.equal(result.value, null)
  })

  it('officialMetric without sourceId is rejected', () => {
    assert.equal(
      bindOfficial({
        id: 'x',
        value: 1,
        unit: 'млн т',
        sourceId: null,
        measure_kind: 'actual',
      }),
      null,
    )
  })

  it('U2 rail: Kazakhstan 2026 verified does not show 2025 actual as 2026 primary', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.VERIFIED,
      horizon: 2026,
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    const primary = pickRailPrimary(production, { viewMode: VIEW_MODE.VERIFIED, horizon: 2026 })
    assert.equal(primary, null)
  })

  it('U2 rail: Kazakhstan 2026 planned shows national plan, not as regional', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    const primary = pickRailPrimary(production, { viewMode: VIEW_MODE.PLANNED, horizon: 2026 })
    assert.equal(primary.scope, SCOPE.NATIONAL)
    assert.equal(primary.measureKind, MEASURE_KIND.PLAN)
    assert.equal(primary.year, 2026)
    assert.notEqual(primary.value, 0)
  })

  it('U2 rail: 2026 energy demand does not use generation counts as primary', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      outlook: fixtureOutlook(),
    })
    const energy = nodeById(bundle, 'energyDemand')
    const primary = pickRailPrimary(energy, { viewMode: VIEW_MODE.PLANNED, horizon: 2026 })
    assert.equal(primary, null)
  })

  it('U2 rail: 2030 demand is not added to 2032 and is the 2030 primary', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2030,
      outlook: fixtureOutlook(),
    })
    const energy = nodeById(bundle, 'energyDemand')
    const primary = pickRailPrimary(energy, { viewMode: VIEW_MODE.PLANNED, horizon: 2030 })
    assert.equal(primary.year, 2030)
    const sum = energy.modelMetrics.find((item) => item.id === 'demand-2030-plus-2032')
    assert.equal(sum.value, null)
  })

  it('U2 rail: 2032 requirement is not the 2030 demand', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2032,
      outlook: fixtureOutlook(),
    })
    const energy = nodeById(bundle, 'energyDemand')
    const primary = pickRailPrimary(energy, { viewMode: VIEW_MODE.PLANNED, horizon: 2032 })
    assert.equal(primary.year, 2032)
    assert.notEqual(primary.id, 'demand-2030')
  })

  it('U2 rail: Pavlodar without regional production is missing, not zero', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      regionId: 'pavlodar',
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    assert.equal(production.status, NODE_STATUS.MISSING)
    const primary = pickRailPrimary(production, { viewMode: VIEW_MODE.PLANNED, horizon: 2026 })
    assert.equal(primary, null)
    assert.equal(production.officialMetrics.length, 0)
  })

  it('U2 rail: Bogatyr 2026 plan is not national 117', () => {
    const outlook = fixtureOutlook()
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2026,
      regionId: 'pavlodar',
      assetId: 'bogatyr-company',
      companyId: 'bogatyr-komir',
      outlook,
    })
    const production = nodeById(bundle, 'production')
    const primary = pickRailPrimary(production, { viewMode: VIEW_MODE.PLANNED, horizon: 2026 })
    assert.ok(primary)
    assert.equal(primary.scope, SCOPE.COMPANY)
    assert.equal(primary.value, outlook.bogatyrCase.plan.value)
    assert.notEqual(primary.value, outlook.trajectory.plannedExtraction.value)
    const all = [...production.officialMetrics, ...production.contextMetrics]
    assert.ok(all.every((item) => item.scope !== SCOPE.NATIONAL || item.id !== 'min-plan-2026'))
  })

  it('U2 rail: Bogatyr 2030 rail does not inherit national wagon/day', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2030,
      regionId: 'pavlodar',
      assetId: 'bogatyr-company',
      outlook: fixtureOutlook(),
    })
    const rail = nodeById(bundle, 'railLogistics')
    const primary = pickRailPrimary(rail, { viewMode: VIEW_MODE.PLANNED, horizon: 2030 })
    assert.equal(primary, null)
    assert.equal(rail.status, NODE_STATUS.MISSING)
  })

  it('U2 rail: Bogatyr 2030 has no carried-forward 2026 plan', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.PLANNED,
      horizon: 2030,
      assetId: 'bogatyr-company',
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    const primary = pickRailPrimary(production, { viewMode: VIEW_MODE.PLANNED, horizon: 2030 })
    assert.equal(primary, null)
  })

  it('U2 rail: Bogatyr constraints do not inherit national 5.3 GW', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.CONSTRAINTS,
      horizon: 2032,
      regionId: 'pavlodar',
      assetId: 'bogatyr-company',
      outlook: fixtureOutlook(),
    })
    const constraints = nodeById(bundle, 'constraints')
    const primary = pickRailPrimary(constraints, { viewMode: VIEW_MODE.CONSTRAINTS, horizon: 2032 })
    assert.equal(primary, null)
    assert.ok(!constraints.officialMetrics.some((item) => item.id === 'national-capacity-new'))
  })

  it('U2 rail: Bogatyr 2032 constraints do not treat capacity as production', () => {
    const bundle = bindScenario({
      viewMode: VIEW_MODE.CONSTRAINTS,
      horizon: 2032,
      assetId: 'bogatyr-company',
      outlook: fixtureOutlook(),
    })
    const production = nodeById(bundle, 'production')
    const primary = pickRailPrimary(production, { viewMode: VIEW_MODE.CONSTRAINTS, horizon: 2032 })
    assert.equal(primary.measureKind, MEASURE_KIND.TARGET)
    assert.notEqual(primary.measureKind, MEASURE_KIND.CAPACITY)
    const cap = production.modelMetrics.find((item) => item.id === 'capacity-vs-production')
    assert.equal(cap.comparability.status, COMPARABILITY.NON_COMPARABLE)
  })

  it('mapExportTotalsToMetrics drops YTD and sourceless rows', () => {
    const mapped = mapExportTotalsToMetrics({
      ok: true,
      items: [
        {
          netWeightTonnes: 100,
          sourceId: 'hs2701',
          period: { id: 'fy-2025', year: 2025, label: '2025', is_full_year: true },
        },
        {
          netWeightTonnes: 40,
          sourceId: 'hs2701',
          period: { id: 'ytd', year: 2026, label: 'YTD', is_full_year: false },
        },
        {
          netWeightTonnes: 10,
          sourceId: null,
          period: { id: 'fy-2024', year: 2024, label: '2024', is_full_year: true },
        },
      ],
    })
    assert.equal(mapped.length, 1)
    assert.equal(mapped[0].year, 2025)
    assert.equal(mapped[0].is_full_year, true)
  })
})
