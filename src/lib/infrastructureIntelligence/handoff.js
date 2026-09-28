import { INFRA_CONTEXT_VERSION, infraProducerById } from './registry.js'

export const INFRA_HANDOFF_COMPARISON = Object.freeze({
  PLAN_STEP: 'planStep',
  TARGET_GAP: 'targetGap',
  CAPACITY_REF: 'capacityRef',
})

export function snapshotInfrastructureHandoff({
  producerId,
  comparisonId = null,
  modelResult = null,
  operands = null,
  limitations = [],
  focus = 'chain',
} = {}) {
  const producer = infraProducerById(producerId)
  const snap = Object.freeze({
    contextVersion: INFRA_CONTEXT_VERSION,
    producerId: producer.id,
    comparisonId,
    modelResult: modelResult
      ? Object.freeze({
          value: modelResult.value,
          unit: modelResult.unit,
          label: modelResult.label || null,
          formula: modelResult.formula || null,
          comparability: snapshotComparability(modelResult.comparability),
        })
      : null,
    operands: operands
      ? Object.freeze({
          actual: snapshotOperand(operands.actual),
          plan: snapshotOperand(operands.plan),
          target: snapshotOperand(operands.target),
          capacity: snapshotOperand(operands.capacity),
        })
      : null,
    limitations: Object.freeze([...(limitations || [])]),
    focus: focus === 'gaps' ? 'gaps' : 'chain',
  })
  return Object.freeze({
    ...snap,
    display: describeInfrastructureHandoff(snap),
  })
}

function snapshotComparability(comparability) {
  if (!comparability) return null
  if (typeof comparability === 'string') {
    return Object.freeze({ status: comparability, comparable: comparability !== 'NON_COMPARABLE', reason: null })
  }
  return Object.freeze({
    status: comparability.status || null,
    comparable: comparability.comparable,
    reason: comparability.reason || null,
  })
}

function snapshotOperand(metric) {
  if (!metric || typeof metric.value !== 'number') return null
  return Object.freeze({
    value: metric.value,
    unit: metric.unit || null,
    year: metric.year ?? null,
    label: metric.label || null,
    sourceId: metric.sourceId || null,
    measureKind: metric.measureKind || null,
  })
}

export function describeInfrastructureHandoff(handoff) {
  if (!handoff?.modelResult || typeof handoff.modelResult.value !== 'number') return null
  const producer = infraProducerById(handoff.producerId)
  const op = handoff.operands || {}
  const comparisonId = handoff.comparisonId
  const result = handoff.modelResult
  const comparability = result.comparability
  const status = typeof comparability === 'string' ? comparability : comparability?.status || null

  let horizonLine = ''
  if (comparisonId === INFRA_HANDOFF_COMPARISON.PLAN_STEP && op.actual?.year != null && op.plan?.year != null) {
    horizonLine = `${op.actual.year} факт → ${op.plan.year} план`
  } else if (
    comparisonId === INFRA_HANDOFF_COMPARISON.TARGET_GAP &&
    op.actual?.year != null &&
    op.target?.year != null
  ) {
    horizonLine = `${op.actual.year} факт → ${op.target.year} цель`
  } else if (comparisonId === INFRA_HANDOFF_COMPARISON.CAPACITY_REF) {
    horizonLine =
      op.actual?.year != null ? `${op.actual.year} факт ↔ заявленная мощность` : 'факт ↔ заявленная мощность'
  }

  return Object.freeze({
    comparisonId,
    producerLabel: producer.selectorLabel,
    horizonLine,
    resultValue: result.value,
    resultUnit: result.unit,
    resultLabel: result.label || null,
    comparabilityStatus: status,
    comparabilityReason: typeof comparability === 'object' ? comparability?.reason || null : null,
    limitations: Object.freeze([...(handoff.limitations || [])]),
    infrastructureGate: 'Инфраструктурная сопоставимость не подтверждена',
  })
}

export function parseInfrastructureSearch(search) {
  const params = new URLSearchParams(search || '')
  const producerId = params.get('producer')
  const focus = params.get('focus') === 'gaps' ? 'gaps' : 'chain'
  return { producerId, focus }
}

export function infrastructureSearch({ producerId, focus = 'chain' }) {
  const params = new URLSearchParams()
  if (producerId) params.set('producer', producerId)
  if (focus === 'gaps') params.set('focus', 'gaps')
  const query = params.toString()
  return query ? `/outlook/infrastructure?${query}` : '/outlook/infrastructure'
}

export function isValidHandoff(context) {
  return Boolean(context && context.contextVersion === INFRA_CONTEXT_VERSION && context.producerId)
}
