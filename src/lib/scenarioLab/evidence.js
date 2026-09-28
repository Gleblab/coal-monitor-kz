import {
  COMPARABILITY,
  EVIDENCE_CLASS,
  MEASURE_KIND,
  PERIOD_KIND,
  SCOPE,
  finiteNumber,
  normalizeUnit,
  officialMetric,
} from '../scenarioEvidence.js'

export const CALCULATION_ID = Object.freeze({
  M1: 'incrementalDemandShare',
  M2: 'planStep',
  M3: 'targetGap',
  M4: 'namedCapacityReference',
  M5: 'relativeMagnitude',
  M6: 'nationalExportShock',
})

export const QUALIFIER = Object.freeze({
  EXACT: 'exact',
  ABOUT: 'about',
  MORE_THAN: 'more_than',
})

function isTonnageUnit(unit) {
  const n = normalizeUnit(unit)
  return n.includes('т') && !n.includes('вт') && !n.includes('сут')
}

export function isOfficialOperand(item) {
  return Boolean(item && item.evidenceClass === EVIDENCE_CLASS.OFFICIAL && item.sourceId)
}

export function requireOfficialOperand(item, role) {
  if (!item) {
    return { ok: false, error: { code: 'MISSING_OFFICIAL', role, message: 'Нет официального операнда.' } }
  }
  if (item.evidenceClass !== EVIDENCE_CLASS.OFFICIAL) {
    return {
      ok: false,
      error: { code: 'NOT_OFFICIAL', role, message: 'Операнд не является OFFICIAL.' },
    }
  }
  if (!item.sourceId) {
    return {
      ok: false,
      error: { code: 'MISSING_SOURCE', role, message: 'OFFICIAL операнд без sourceId отклонён.' },
    }
  }
  if (finiteNumber(item.value) == null) {
    return {
      ok: false,
      error: { code: 'MISSING_VALUE', role, message: 'Официальное значение отсутствует и не подменяется нулём.' },
    }
  }
  return { ok: true, operand: item }
}

/** Bind a published observation. Does not invent values. */
export function bindOfficialOperand(input, extras = {}) {
  return officialMetric({
    ...input,
    ...extras,
    sourceId: extras.sourceId || input?.sourceId,
    measureKind: extras.measureKind || input?.measureKind || input?.measure_kind,
    periodKind: extras.periodKind || input?.periodKind,
    scope: extras.scope || input?.scope,
    qualifier: extras.qualifier || input?.qualifier || input?.value_qualifier,
    approx: Boolean(
      extras.approx ??
        input?.approx ??
        (input?.qualifier === 'about' || input?.value_qualifier === 'about'),
    ),
  })
}

export function inheritUncertainty(official) {
  const qualifier = official?.qualifier || QUALIFIER.EXACT
  const approx = Boolean(official?.approx) || qualifier === QUALIFIER.ABOUT || qualifier === QUALIFIER.MORE_THAN
  return {
    qualifier: approx && qualifier === QUALIFIER.EXACT ? QUALIFIER.ABOUT : qualifier,
    approx,
  }
}

export function sameProducerEntity(left, right) {
  if (!left || !right) return false
  if (left.entityKey && right.entityKey) return left.entityKey === right.entityKey
  const lc = left.companyId || left.company_id || null
  const rc = right.companyId || right.company_id || null
  const la = left.assetId || left.asset_id || null
  const ra = right.assetId || right.asset_id || null
  if (lc && rc && lc === rc) {
    if (la && ra) return la === ra
    if (!la && !ra) return true
    return false
  }
  return false
}

export function sameScope(left, right) {
  return Boolean(left?.scope && right?.scope && left.scope === right.scope)
}

export function assertTonnagePair(left, right, role) {
  if (!isTonnageUnit(left.unit) || !isTonnageUnit(right.unit)) {
    return {
      ok: false,
      error: { code: 'UNIT_MISMATCH', role, message: 'Расчёт доступен только для сопоставимых угольных тонн.' },
    }
  }
  if (normalizeUnit(left.unit) !== normalizeUnit(right.unit)) {
    return {
      ok: false,
      error: { code: 'UNIT_MISMATCH', role, message: 'Единицы операндов не совпадают.' },
    }
  }
  return { ok: true }
}

export function rejectExportBaseline(item) {
  if (!item) return { code: 'MISSING_OFFICIAL', message: 'Нет официального базиса экспорта.' }
  if (item.periodKind === PERIOD_KIND.YTD || item.isFullYear === false || item.is_full_year === false) {
    return { code: 'YTD_REJECTED', message: 'YTD нельзя использовать как базис годового экспортного сценария.' }
  }
  if (item.scope === SCOPE.REGIONAL) {
    return { code: 'REGIONAL_EXPORT_REJECTED', message: 'Национальный экспорт не наследуется на регион.' }
  }
  if (item.scope === SCOPE.COMPANY || item.scope === SCOPE.ASSET) {
    return { code: 'PRODUCER_EXPORT_REJECTED', message: 'Национальный экспорт не наследуется на производителя или актив.' }
  }
  const hs = String(item.hsCode || item.hs_code || '').replace(/\s/g, '')
  if (hs !== '2701') {
    return { code: 'HS_SCOPE', message: 'Базис должен относиться к HS 2701.' }
  }
  if (item.methodologyScope === 'ministry_coal_exports' || item.methodology_scope === 'ministry_coal_exports') {
    return { code: 'MINISTRY_EXPORT_REJECTED', message: 'Ряд Минэнерго (млн т) не является базисом HS 2701.' }
  }
  if (item.scope !== SCOPE.TRADE_NATIONAL && item.scope !== SCOPE.NATIONAL) {
    return { code: 'SCOPE_REJECTED', message: 'Экспортный шок L0 допустим только для национального торгового контура.' }
  }
  if (item.periodKind !== PERIOD_KIND.FY) {
    return { code: 'NOT_FY', message: 'Базис экспорта должен быть полным годом.' }
  }
  return null
}

export function modelResult(input) {
  if (!input?.formula || !Array.isArray(input.operands) || input.operands.length === 0) return null
  const value = input.value == null ? null : finiteNumber(input.value)
  return {
    evidenceClass: EVIDENCE_CLASS.MODEL,
    calculationId: input.calculationId,
    id: input.id || input.calculationId,
    label: input.label,
    value,
    unit: input.unit || null,
    qualifier: input.qualifier || QUALIFIER.EXACT,
    approx: Boolean(input.approx),
    formula: input.formula,
    operands: input.operands,
    interpretation: input.interpretation || null,
    limitations: input.limitations || [],
    scope: input.scope || null,
    year: input.year ?? null,
    periodKind: input.periodKind || null,
    comparability: input.comparability || { status: COMPARABILITY.COMPARABLE, comparable: true },
    horizonMismatch: input.horizonMismatch || null,
  }
}

export function officialSnapshot(item, role) {
  return {
    evidenceClass: EVIDENCE_CLASS.OFFICIAL,
    role,
    id: item.id,
    label: item.label,
    value: item.value,
    unit: item.unit,
    sourceId: item.sourceId,
    measureKind: item.measureKind,
    periodKind: item.periodKind,
    year: item.year,
    periodLabel: item.periodLabel,
    scope: item.scope,
    qualifier: item.qualifier,
    approx: item.approx,
    companyId: item.companyId || null,
    assetId: item.assetId || null,
    entityKey: item.entityKey || null,
    hsCode: item.hsCode || item.hs_code || null,
  }
}

export { EVIDENCE_CLASS, MEASURE_KIND, PERIOD_KIND, SCOPE, COMPARABILITY, finiteNumber, normalizeUnit }
