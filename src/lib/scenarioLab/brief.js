import { EVIDENCE_CLASS } from './evidence.js'
import { CALCULATION_ID } from './evidence.js'
import { ASSUMPTION_ID } from './assumptions.js'

function formatQty(value, qualifier, approx) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const prefix = qualifier === 'about' || approx ? '≈ ' : qualifier === 'more_than' ? '> ' : ''
  return `${prefix}${value}`
}

function qty(metric) {
  if (!metric || metric.value == null) return '—'
  const number = formatQty(metric.value, metric.qualifier, metric.approx)
  return metric.unit ? `${number} ${metric.unit}` : number
}

function pctShare(value) {
  if (typeof value !== 'number') return '—'
  return `${Math.round(value * 1000) / 10}%`.replace('.', ',')
}

function officialLines(official = {}) {
  const lines = []
  const keys = [
    ['incrementalDemand', 'Ориентир дополнительного спроса'],
    ['producerActual', 'Факт производителя'],
    ['producerPlan', 'План производителя'],
    ['producerTarget', 'Цель производителя'],
    ['producerCapacity', 'Именованная мощность'],
    ['nationalExportFy', 'Национальный экспорт HS 2701 (FY)'],
  ]
  for (const [key, label] of keys) {
    const item = official[key]
    if (!item) continue
    lines.push({
      key,
      label,
      text: `${label}: ${qty(item)} · ${item.measureKind || ''} · ${item.year ?? 'без года'} · sourceId ${item.sourceId}`,
      sourceId: item.sourceId,
      evidenceClass: EVIDENCE_CLASS.OFFICIAL,
    })
  }
  return lines
}

function assumptionLines(assumptions = {}) {
  const lines = []
  if (assumptions.demandShare != null) {
    lines.push({
      key: ASSUMPTION_ID.DEMAND_SHARE,
      evidenceClass: EVIDENCE_CLASS.ASSUMPTION,
      text: `Доля дополнительного спроса s = ${pctShare(assumptions.demandShare)} (пользовательское допущение).`,
    })
  }
  if (assumptions.exportDeltaPercent != null) {
    lines.push({
      key: ASSUMPTION_ID.EXPORT_DELTA,
      evidenceClass: EVIDENCE_CLASS.ASSUMPTION,
      text: `Δ национального экспорта HS 2701 = ${assumptions.exportDeltaPercent} (доля; пользовательское допущение).`,
    })
  }
  if (assumptions.expansionKind) {
    lines.push({
      key: ASSUMPTION_ID.EXPANSION_KIND,
      evidenceClass: EVIDENCE_CLASS.ASSUMPTION,
      text: `Для relativeMagnitude выбран якорь Δ: ${assumptions.expansionKind}.`,
    })
  }
  return lines
}

function modelLines(results = {}) {
  const lines = []
  const m1 = results[CALCULATION_ID.M1]
  if (m1) {
    const shareOp = m1.operands.find((item) => item.id === ASSUMPTION_ID.DEMAND_SHARE)
    const demandOp = m1.operands.find((item) => item.role === 'O_20')
    lines.push({
      calculationId: CALCULATION_ID.M1,
      evidenceClass: EVIDENCE_CLASS.MODEL,
      text: `При допущении ${pctShare(shareOp?.value)} от опубликованного ориентира ${qty(demandOp)} модельный дополнительный объём составляет ${qty(m1)}.`,
    })
  }
  const m2 = results[CALCULATION_ID.M2]
  if (m2) {
    const plan = m2.operands.find((item) => item.role === 'plan')
    const actual = m2.operands.find((item) => item.role === 'actual')
    lines.push({
      calculationId: CALCULATION_ID.M2,
      evidenceClass: EVIDENCE_CLASS.MODEL,
      text: `План ${plan?.year}: ${qty(plan)}; факт ${actual?.year}: ${qty(actual)}; модельная разность ${qty(m2)}. Это не исполнение плана.`,
    })
  }
  const m3 = results[CALCULATION_ID.M3]
  if (m3) {
    lines.push({
      calculationId: CALCULATION_ID.M3,
      evidenceClass: EVIDENCE_CLASS.MODEL,
      text: `Разность опубликованной цели и выбранного факта составляет ${qty(m3)}. Это не CAGR и не гарантированное расширение.`,
    })
  }
  const m4 = results[CALCULATION_ID.M4]
  if (m4) {
    lines.push({
      calculationId: CALCULATION_ID.M4,
      evidenceClass: EVIDENCE_CLASS.MODEL,
      text: `Разность именованной мощности и факта составляет ${qty(m4)}. Это не доступная мощность.`,
    })
  }
  const m5 = results[CALCULATION_ID.M5]
  if (m5) {
    lines.push({
      calculationId: CALCULATION_ID.M5,
      evidenceClass: EVIDENCE_CLASS.MODEL,
      text: `Относительная величина Δ производителя к ориентиру спроса 2030 равна ${qty(m5)}. Это не доля спроса.`,
    })
  }
  const m6 = results[CALCULATION_ID.M6]
  if (m6) {
    lines.push({
      calculationId: CALCULATION_ID.M6,
      evidenceClass: EVIDENCE_CLASS.MODEL,
      text: `Сценарий национального экспорта HS 2701 (FY ${m6.year}) составляет ${qty(m6)}. Не экспорт региона или производителя.`,
    })
  }
  return lines
}

const STATIC_UNSUPPORTED = [
  'Расчёт не подтверждает, что выбранный производитель фактически получит этот объём.',
  'Национальный ориентир спроса не является спросом Павлодара или добычей актива.',
  'Именованная мощность не трактуется как доступный резерв добычи.',
  'Экспортный сценарий не распределяет HS 2701 по регионам или компаниям.',
  'Промежуточные годы между официальными якорями в L0 не интерполируются.',
]

export function buildDecisionBrief({ official, assumptions, results, readiness, limitations = [] }) {
  const missingInputs = []
  for (const item of Object.values(readiness || {})) {
    for (const key of item.missingInputs || []) {
      if (!missingInputs.includes(key)) missingInputs.push(key)
    }
  }
  const knownConstraints = [
    ...(limitations || []),
    ...Object.values(results || {}).flatMap((item) => item.limitations || []),
  ].filter((text, index, all) => text && all.indexOf(text) === index)

  const supportedConclusions = modelLines(results)
  const unsupportedConclusions = STATIC_UNSUPPORTED.map((text) => ({ text, evidenceClass: 'limitation' }))

  return {
    officialBaseline: officialLines(official),
    userAssumptions: assumptionLines(assumptions),
    modelResults: supportedConclusions,
    knownConstraints: knownConstraints.map((text) => ({ text })),
    missingInputs: missingInputs.map((key) => ({ key })),
    supportedConclusions,
    unsupportedConclusions,
  }
}
