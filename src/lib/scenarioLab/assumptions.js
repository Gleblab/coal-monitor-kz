import { EVIDENCE_CLASS, finiteNumber } from './evidence.js'

export const ASSUMPTION_ID = Object.freeze({
  DEMAND_SHARE: 'demandShare',
  EXPORT_DELTA: 'exportDeltaPercent',
  EXPANSION_KIND: 'expansionKind',
})

export const EXPANSION_KIND = Object.freeze({
  PLAN_STEP: 'planStep',
  TARGET_GAP: 'targetGap',
})

/** Share of incremental demand: closed interval [0, 1]. */
export const SHARE_MIN = 0
export const SHARE_MAX = 1

/** Export volume shock as a fraction of FY volume. V*(1+d) must stay non-negative. */
export const EXPORT_DELTA_MIN = -1
export const EXPORT_DELTA_MAX = 1

export function assumptionValue(id, value, extras = {}) {
  return {
    evidenceClass: EVIDENCE_CLASS.ASSUMPTION,
    id,
    value,
    unit: extras.unit || null,
    label: extras.label || id,
    provenance: extras.provenance || 'user',
  }
}

export function validateDemandShare(value) {
  const n = finiteNumber(value)
  if (n == null) {
    return {
      ok: false,
      error: {
        code: 'SHARE_REQUIRED',
        field: ASSUMPTION_ID.DEMAND_SHARE,
        message: 'Доля s не задана. Нуль не подставляется автоматически.',
      },
    }
  }
  if (n < SHARE_MIN || n > SHARE_MAX) {
    return {
      ok: false,
      error: {
        code: 'SHARE_OUT_OF_RANGE',
        field: ASSUMPTION_ID.DEMAND_SHARE,
        message: `Доля s должна быть в диапазоне ${SHARE_MIN}…${SHARE_MAX}. Значение не ограничивается молча.`,
      },
    }
  }
  return { ok: true, assumption: assumptionValue(ASSUMPTION_ID.DEMAND_SHARE, n, { unit: 'share', label: 'Доля дополнительного спроса' }) }
}

export function validateExportDelta(value) {
  const n = finiteNumber(value)
  if (n == null) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_DELTA_REQUIRED',
        field: ASSUMPTION_ID.EXPORT_DELTA,
        message: 'Δ экспорта не задана.',
      },
    }
  }
  if (n < EXPORT_DELTA_MIN || n > EXPORT_DELTA_MAX) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_DELTA_OUT_OF_RANGE',
        field: ASSUMPTION_ID.EXPORT_DELTA,
        message: `Δ экспорта должна быть в диапазоне ${EXPORT_DELTA_MIN}…${EXPORT_DELTA_MAX} (доля, не процентные пункты вне этого интервала). Значение не ограничивается молча.`,
      },
    }
  }
  return {
    ok: true,
    assumption: assumptionValue(ASSUMPTION_ID.EXPORT_DELTA, n, { unit: 'fraction', label: 'Изменение национального экспорта HS 2701' }),
  }
}

export function validateExpansionKind(value) {
  if (value !== EXPANSION_KIND.PLAN_STEP && value !== EXPANSION_KIND.TARGET_GAP) {
    return {
      ok: false,
      error: {
        code: 'EXPANSION_KIND_REQUIRED',
        field: ASSUMPTION_ID.EXPANSION_KIND,
        message: 'Нужно явно выбрать planStep или targetGap. Базис не выбирается молча.',
      },
    }
  }
  return {
    ok: true,
    assumption: assumptionValue(ASSUMPTION_ID.EXPANSION_KIND, value, { label: 'Источник Δ производителя для relativeMagnitude' }),
  }
}
