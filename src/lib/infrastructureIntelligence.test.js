import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { formatQualifiedNumber } from './formatCore.js'
import { sources } from '../data/sources.js'
import { MEASURE_KIND, PERIOD_KIND, SCOPE, officialMetric } from './scenarioEvidence.js'
import { calculateM2, calculateM3, calculateM4 } from './scenarioLab/calculations.js'
import { PRODUCTION_COMPARISON } from './scenarioLab/productionSlice.js'
import {
  FORBIDDEN_INFRA_COPY,
  INFRA_CLASS,
  INFRA_NODE_TYPE,
  INFRASTRUCTURE_FIXTURE,
  NATIONAL_INFRA_EXCLUSIONS,
  assembleInfrastructure,
  hasExposedInfrastructureCalculation,
  isSolidConnector,
  listInfrastructureProducers,
  mapLiveInfrastructure,
  snapshotInfrastructureHandoff,
} from './infrastructureIntelligence/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '20260928180000_infrastructure_intelligence.sql'),
  'utf8',
)

const seed = readFileSync(join(root, 'supabase', 'seed_infrastructure_intelligence.sql'), 'utf8')

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
  })
  assert.ok(bound, 'official operand must bind')
  return {
    ...bound,
    companyId: partial.companyId ?? null,
    assetId: partial.assetId ?? null,
    entityKey: partial.entityKey ?? null,
  }
}

const bogatyrEntity = {
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
  ...bogatyrEntity,
})
const bogPlan = official({
  id: 'bog-plan-2026',
  value: 45.2,
  year: 2026,
  measureKind: MEASURE_KIND.PLAN,
  ...bogatyrEntity,
})
const bogTarget = official({
  id: 'bog-target-2032',
  value: 56.5,
  year: 2032,
  unit: 'млн т в год',
  measureKind: MEASURE_KIND.TARGET,
  ...bogatyrEntity,
})
const bogCapacity = official({
  id: 'bog-cap',
  value: 42,
  year: null,
  unit: 'млн т в год',
  measureKind: MEASURE_KIND.CAPACITY,
  periodKind: PERIOD_KIND.HORIZON,
  ...bogatyrEntity,
})

function handoffFromLab(comparisonId, run) {
  assert.equal(run.ok, true, run.error?.message)
  return snapshotInfrastructureHandoff({
    producerId: 'bogatyr',
    comparisonId,
    modelResult: run.result,
    operands: {
      actual: bogActual,
      plan: bogPlan,
      target: bogTarget,
      capacity: bogCapacity,
    },
    limitations: run.result.limitations || [],
  })
}

function flattenText(graph) {
  return JSON.stringify(graph)
}

describe('Infrastructure Intelligence', () => {
  it('A. Bogatyr verified links exist; gap begins after last verified stage', () => {
    const graph = assembleInfrastructure('bogatyr')
    assert.equal(graph.verifiedCount, 5)
    assert.equal(graph.lastVerified.id, 'bogatyr-ekibastuz')
    assert.equal(graph.gapNode.id, 'bogatyr-gap')
    assert.equal(graph.links.length, 4)
    assert.ok(graph.links.every((link) => link.solid && link.materialFlow))
    assert.ok(!graph.links.some((link) => link.toId === 'bogatyr-gap'))
    assert.ok(!graph.links.some((link) => link.toId === 'bogatyr-astana-trial'))
  })

  it('B. Shubarkol has current operational observations but no border/terminal link', () => {
    const graph = assembleInfrastructure('shubarkol')
    const current = graph.observations.filter((item) => item.classification === INFRA_CLASS.QUANTITATIVE_VERIFIED)
    assert.ok(current.some((item) => item.id === 'shubarkol-wagons-shift' && item.value === 472))
    assert.ok(current.some((item) => item.id === 'shubarkol-export-jun-2025' && item.value === 841000))
    assert.equal(graph.gapNode.id, 'shubarkol-gap')
    assert.ok(!graph.links.some((link) => /border|terminal|рынок/i.test(link.toId)))
    assert.ok(!graph.nodes.some((node) => node.nodeType === 'border_crossing' || node.nodeType === 'terminal'))
  })

  it('C. Karazhyra 350 and 280 remain independent; no 70-wagon bottleneck', () => {
    const graph = assembleInfrastructure('karazhyra')
    const request = graph.observations.find((item) => item.id === 'karazhyra-request-350')
    const average = graph.observations.find((item) => item.id === 'karazhyra-average-280')
    assert.equal(request.value, 350)
    assert.equal(average.value, 280)
    const derived = graph.observations.filter((item) => item.value === 70 || /bottleneck|дефицит/i.test(item.label || ''))
    assert.equal(derived.length, 0)
    const text = flattenText(graph)
    for (const pattern of FORBIDDEN_INFRA_COPY) {
      if (pattern.source.includes('70')) {
        assert.equal(pattern.test(text), false, String(pattern))
      }
    }
    assert.equal(hasExposedInfrastructureCalculation(graph.capabilities), false)
    const panel = graph.panelFor('karazhyra-degelen')
    assert.match(panel.howToRead, /два независимых/)
    assert.match(panel.cannotConclude, /не заявленная пропускная способность/i)
    assert.doesNotMatch(panel.howToRead, /70/)
  })

  it('D. Maikuben historical/project observations never become current', () => {
    const graph = assembleInfrastructure('maikuben')
    const historical = graph.observations.filter((item) => item.classification === INFRA_CLASS.HISTORICAL)
    assert.ok(historical.some((item) => item.value === 40 && item.unit === 'км'))
    assert.ok(historical.some((item) => item.value === 2.5))
    assert.ok(historical.every((item) => item.current === false))
    const currentNumeric = graph.nodes
      .filter((node) => !node.isGap)
      .flatMap((node) => node.currentObservations || [])
    assert.equal(currentNumeric.length, 0)
    assert.ok(graph.gapNode)
    const market = graph.contextNodes.find((node) => node.id === 'maikuben-market-context')
    assert.equal(market.classification, INFRA_CLASS.CONTEXT_ONLY)
    assert.ok(!graph.links.some((link) => link.toId === 'maikuben-market-context'))
  })

  it('E. No producer receives another producer infrastructure evidence', () => {
    const ids = ['bogatyr', 'shubarkol', 'karazhyra', 'maikuben']
    for (const id of ids) {
      const graph = assembleInfrastructure(id)
      assert.ok(graph.nodes.every((node) => node.producerId === id))
      assert.ok(graph.links.every((link) => link.producerId === id))
      assert.ok(graph.observations.every((item) => item.producerId === id))
    }
  })

  it('F. National 600 / 951 / 586 never become producer infrastructure operands', () => {
    const producers = listInfrastructureProducers()
    assert.equal(producers.length, 4)
    for (const producer of producers) {
      const graph = assembleInfrastructure(producer.id)
      for (const banned of NATIONAL_INFRA_EXCLUSIONS) {
        assert.ok(!graph.observations.some((item) => item.value === banned.value))
      }
    }
  })

  it('G. No infrastructure calculation capability is exposed today', () => {
    const graph = assembleInfrastructure('bogatyr')
    assert.equal(graph.capabilities.calculationsEnabled, false)
    assert.deepEqual(graph.capabilities.exposedCalculations, [])
    assert.equal(graph.capabilities.canCompareScenarioToInfrastructure, false)
    assert.equal(hasExposedInfrastructureCalculation(graph.capabilities), false)
  })

  it('H. Data gap correctly stops material-flow connector', () => {
    for (const id of ['bogatyr', 'shubarkol', 'karazhyra', 'maikuben']) {
      const graph = assembleInfrastructure(id)
      assert.ok(graph.gapNode)
      assert.equal(graph.gapNode.nodeType, INFRA_NODE_TYPE.DATA_GAP)
      assert.ok(!graph.links.some((link) => link.toId === graph.gapNode.id && link.solid))
      assert.ok(!graph.links.some((link) => link.materialFlow && link.to?.isGap))
      assert.equal(isSolidConnector(INFRA_CLASS.DATA_GAP), false)
    }
  })

  it('I. Scenario context is display-only and not recomputed', () => {
    const handoff = snapshotInfrastructureHandoff({
      producerId: 'bogatyr',
      comparisonId: 'targetGap',
      modelResult: { value: 11.2, unit: 'млн т/год', formula: 'target − actual' },
      operands: {
        actual: { value: 45.3, unit: 'млн т', year: 2025, sourceId: 'minenergoShubarkol2026' },
        target: { value: 56.5, unit: 'млн т', year: 2032 },
      },
    })
    const graph = assembleInfrastructure('bogatyr', undefined, handoff)
    assert.equal(graph.scenarioContext.modelResult.value, 11.2)
    assert.equal(graph.scenarioContext.operands.actual.value, 45.3)
    assert.equal(graph.comparabilityNote, 'Инфраструктурная сопоставимость не подтверждена')
    assert.equal(graph.capabilities.canCompareScenarioToInfrastructure, false)
    assert.equal(graph.provenanceFor('bogatyr-loading').separated, true)
    assert.equal(graph.handoffDisplay.horizonLine, '2025 факт → 2032 цель')
    assert.equal(graph.handoffDisplay.resultValue, 11.2)
    assert.equal(graph.handoffDisplay.resultValue, handoff.modelResult.value)
  })

  it('handoff A. Fact → Plan uses 2025 факт → 2026 план and M2 result', () => {
    const run = calculateM2(bogPlan, bogActual)
    const handoff = handoffFromLab(PRODUCTION_COMPARISON.PLAN_STEP, run)
    const graph = assembleInfrastructure('bogatyr', undefined, handoff)
    const display = graph.handoffDisplay
    assert.equal(display.comparisonId, PRODUCTION_COMPARISON.PLAN_STEP)
    assert.equal(display.horizonLine, '2025 факт → 2026 план')
    assert.equal(display.resultValue, run.result.value)
    assert.equal(display.resultValue, handoff.modelResult.value)
    assert.equal(formatQualifiedNumber(display.resultValue), formatQualifiedNumber(-0.1))
    assert.doesNotMatch(display.horizonLine, /2032/)
    assert.doesNotMatch(display.horizonLine, /цель/)
    assert.equal(graph.scenarioContext.modelResult.value, run.result.value)
  })

  it('handoff B. Fact → Target uses 2025 факт → 2032 цель and M3 result', () => {
    const run = calculateM3(bogTarget, bogActual)
    const handoff = handoffFromLab(PRODUCTION_COMPARISON.TARGET_GAP, run)
    const graph = assembleInfrastructure('bogatyr', undefined, handoff)
    const display = graph.handoffDisplay
    assert.equal(display.comparisonId, PRODUCTION_COMPARISON.TARGET_GAP)
    assert.equal(display.horizonLine, '2025 факт → 2032 цель')
    assert.equal(display.resultValue, run.result.value)
    assert.equal(display.resultValue, handoff.modelResult.value)
    assert.equal(formatQualifiedNumber(display.resultValue), formatQualifiedNumber(11.2))
    assert.doesNotMatch(display.horizonLine, /2026/)
    assert.doesNotMatch(display.horizonLine, /план/)
  })

  it('handoff C. Fact ↔ Named Capacity preserves M4 label, result, limitations, NON_COMPARABLE', () => {
    const run = calculateM4(bogCapacity, bogActual)
    const handoff = handoffFromLab(PRODUCTION_COMPARISON.CAPACITY_REF, run)
    const graph = assembleInfrastructure('bogatyr', undefined, handoff)
    const display = graph.handoffDisplay
    assert.equal(display.comparisonId, PRODUCTION_COMPARISON.CAPACITY_REF)
    assert.equal(display.horizonLine, '2025 факт ↔ заявленная мощность')
    assert.equal(display.resultValue, run.result.value)
    assert.equal(display.resultValue, handoff.modelResult.value)
    assert.equal(formatQualifiedNumber(display.resultValue), formatQualifiedNumber(-3.3))
    assert.equal(display.resultLabel, run.result.label)
    assert.equal(display.comparabilityStatus, 'NON_COMPARABLE')
    assert.ok(display.limitations.length > 0)
    assert.equal(display.limitations[0], run.result.limitations[0])
    assert.equal(graph.scenarioContext.modelResult.value, handoff.modelResult.value)
    assert.equal(graph.capabilities.canCompareScenarioToInfrastructure, false)
  })

  it('company slug aliases resolve to producer ids', () => {
    const graph = assembleInfrastructure('maikuben-west')
    assert.equal(graph.producer.id, 'maikuben')
    assert.equal(graph.nodes[0].producerId, 'maikuben')
  })

  it('J. Source provenance resolves', () => {
    const graph = assembleInfrastructure('karazhyra')
    const panel = graph.panelFor('karazhyra-degelen')
    assert.ok(panel.sources.length > 0)
    assert.ok(sources.ktzKarazhyraDegelen2025)
    assert.ok(sources.bogatyrCpt)
    const provenance = graph.provenanceFor('karazhyra-degelen')
    assert.ok(provenance.branches.some((branch) => branch.kind === 'claim'))
  })

  it('schema remains a three-table extension with RLS', () => {
    assert.match(migration, /CREATE TABLE public.infrastructure_nodes/)
    assert.match(migration, /CREATE TABLE public.infrastructure_links/)
    assert.match(migration, /CREATE TABLE public.infrastructure_observations/)
    assert.match(migration, /infrastructure_nodes_public_read/)
    assert.match(migration, /is_verified = true AND is_published = true/)
    assert.match(migration, /infrastructure_observations_subject_xor/)
  })

  it('seed is idempotent on id and represents the fixture graph', () => {
    assert.match(seed, /ON CONFLICT \(id\) DO UPDATE/)
    assert.equal((seed.match(/ON CONFLICT \(id\) DO UPDATE/g) || []).length >= 4, true)
    for (const node of INFRASTRUCTURE_FIXTURE.nodes) {
      assert.ok(seed.includes(`'${node.id}'`), node.id)
    }
    for (const link of INFRASTRUCTURE_FIXTURE.links) {
      assert.ok(seed.includes(`'${link.id}'`), link.id)
      assert.ok(!link.toId.endsWith('-gap'))
    }
    for (const item of INFRASTRUCTURE_FIXTURE.observations) {
      assert.ok(seed.includes(`'${item.id}'`), item.id)
    }
    assert.doesNotMatch(seed, /,\s*70,/)
    assert.match(seed, /Infrastructure seed must not include national 600\/951\/586/)
    const historical = INFRASTRUCTURE_FIXTURE.observations.filter((item) => item.classification === INFRA_CLASS.HISTORICAL)
    assert.ok(historical.length >= 3)
    for (const item of historical) {
      const idx = seed.indexOf(`'${item.id}'`)
      assert.ok(idx >= 0)
      assert.match(seed.slice(idx, idx + 900), /HISTORICAL/)
    }
  })

  it('live mapper converts UUID rows to graph codes and source codes', () => {
    const degelenId = '55555555-5555-4555-8555-555555550023'
    const source = {
      id: '11111111-1111-4111-8111-111111111039',
      code: 'ktzKarazhyraDegelen2025',
      organization: 'АО «НК «Қазақстан темір жолы»',
      publication_title: 'Мониторинг погрузки угля: станция Дегелен / АО «Каражыра»',
      url: 'https://railways.kz/example',
    }
    const mapped = mapLiveInfrastructure({
      nodes: [
        {
          id: degelenId,
          code: 'karazhyra-degelen',
          node_type: 'rail_station',
          display_name: 'Ж/Д. Дегелен',
          category_label: 'Ж/Д',
          company_id: '33333333-3333-4333-8333-333333333003',
          chain_order: 4,
          source_id: source.id,
          evidence_classification: INFRA_CLASS.QUANTITATIVE_VERIFIED,
          sources: source,
          notes: 'Станция национальной сети.',
          limitations: 'Не мощность терминала.',
        },
        {
          id: '55555555-5555-4555-8555-555555550025',
          code: 'karazhyra-gap',
          node_type: 'data_gap',
          display_name: 'Граница / терминал / рынок',
          category_label: 'ПРОБЕЛ',
          company_id: '33333333-3333-4333-8333-333333333003',
          chain_order: 6,
          source_id: null,
          evidence_classification: INFRA_CLASS.DATA_GAP,
          notes: 'Дальнейшая связь не подтверждена.',
          limitations: 'Нет наблюдения границы.',
        },
        {
          id: '55555555-5555-4555-8555-555555550004',
          code: 'bogatyr-loading',
          node_type: 'loading',
          display_name: 'Пункт вагонной погрузки',
          category_label: 'ПОГРУЗКА',
          company_id: '33333333-3333-4333-8333-333333333001',
          chain_order: 3,
          source_id: source.id,
          evidence_classification: INFRA_CLASS.QUANTITATIVE_VERIFIED,
          sources: source,
          notes: 'Погрузка.',
          limitations: 'Не текущая мощность.',
        },
      ],
      links: [],
      observations: [
        {
          id: '77777777-7777-4777-8777-777777770021',
          code: 'karazhyra-request-350',
          node_id: degelenId,
          link_id: null,
          value: '350.000000',
          unit: 'ваг./сут.',
          value_qualifier: 'exact',
          official_label: 'Заявка на погрузку',
          measure_kind: 'wagon_rate',
          period_type: 'day',
          period_label: 'мониторинг 2025',
          evidence_classification: INFRA_CLASS.QUANTITATIVE_VERIFIED,
          evidence_statement: 'Заявка 350 ваг./сут.',
          limitations: 'Не заявленная пропускная способность.',
          source_id: source.id,
          sources: source,
        },
        {
          id: '77777777-7777-4777-8777-777777770022',
          code: 'karazhyra-average-280',
          node_id: degelenId,
          link_id: null,
          value: 280,
          unit: 'ваг./сут.',
          value_qualifier: 'exact',
          official_label: 'Средняя погрузка',
          measure_kind: 'wagon_rate',
          period_type: 'day',
          period_label: 'мониторинг 2025',
          evidence_classification: INFRA_CLASS.QUANTITATIVE_VERIFIED,
          evidence_statement: 'Средняя погрузка 280 ваг./сут.',
          limitations: 'Не дефицит и не bottleneck.',
          source_id: source.id,
          sources: source,
        },
        {
          id: '77777777-7777-4777-8777-777777770004',
          code: 'bogatyr-loading-complex-historical',
          node_id: '55555555-5555-4555-8555-555555550004',
          value: 14,
          unit: 'млн т/год',
          official_label: 'Историческая производительность',
          measure_kind: 'project_capacity',
          period_type: 'historical',
          period_label: 'реконструкция 2001–2004',
          evidence_classification: INFRA_CLASS.HISTORICAL,
          evidence_statement: '14 млн т/год.',
          limitations: 'Не текущая мощность.',
          source_id: source.id,
          sources: source,
        },
      ],
    })
    const graph = assembleInfrastructure('karazhyra', mapped)
    assert.equal(graph.nodes[0].id, 'karazhyra-degelen')
    assert.equal(graph.observations.find((item) => item.id === 'karazhyra-request-350').value, 350)
    assert.equal(graph.observations.find((item) => item.id === 'karazhyra-average-280').value, 280)
    assert.equal(graph.observations.find((item) => item.id === 'bogatyr-loading-complex-historical'), undefined)
    const historical = mapped.observations.find((item) => item.id === 'bogatyr-loading-complex-historical')
    assert.equal(historical.current, false)
    assert.equal(historical.classification, INFRA_CLASS.HISTORICAL)
    const panel = graph.panelFor('karazhyra-degelen')
    assert.equal(panel.sources[0].id, 'ktzKarazhyraDegelen2025')
    assert.ok(!graph.links.some((link) => link.toId === 'karazhyra-gap'))
    assert.equal(hasExposedInfrastructureCalculation(graph.capabilities), false)
  })

  it('production live service does not silently fall back to the fixture', () => {
    const service = readFileSync(join(root, 'src', 'services', 'infrastructureService.js'), 'utf8')
    const page = readFileSync(join(root, 'src', 'pages', 'InfrastructureIntelligencePage.jsx'), 'utf8')
    assert.doesNotMatch(service, /INFRASTRUCTURE_FIXTURE/)
    assert.match(service, /infrastructure_nodes/)
    assert.match(service, /infrastructure_links/)
    assert.match(service, /infrastructure_observations/)
    assert.match(page, /loadInfrastructureGraph/)
    assert.match(page, /LoadErrorState/)
    assert.doesNotMatch(page, /assembleInfrastructure\(/)
  })
})
