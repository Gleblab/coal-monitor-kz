import { EVIDENCE_CLASS, finiteNumber } from './evidence.js'

function officialFingerprint(result) {
  const official = (result?.operands || []).filter((item) => item.evidenceClass === EVIDENCE_CLASS.OFFICIAL)
  return official
    .map((item) => [item.role, item.sourceId, item.value, item.year, item.scope, item.measureKind].join(':'))
    .sort()
    .join('|')
}

function assumptionFingerprint(result) {
  return (result?.operands || [])
    .filter((item) => item.evidenceClass === EVIDENCE_CLASS.ASSUMPTION)
    .map((item) => `${item.id}:${item.value}`)
    .sort()
    .join('|')
}

export function compareModelResults(resultA, resultB) {
  if (!resultA || !resultB) {
    return {
      ok: false,
      error: { code: 'MISSING_RESULT', message: 'Для сравнения нужны два MODEL-результата.' },
    }
  }
  if (resultA.evidenceClass !== EVIDENCE_CLASS.MODEL || resultB.evidenceClass !== EVIDENCE_CLASS.MODEL) {
    return {
      ok: false,
      error: { code: 'NOT_MODEL', message: 'Сравниваются только MODEL-результаты, не OFFICIAL.' },
    }
  }
  if (resultA.calculationId !== resultB.calculationId) {
    return {
      ok: false,
      error: { code: 'CALC_MISMATCH', message: 'Тип расчёта A и B не совпадает.' },
    }
  }
  if (resultA.scope !== resultB.scope) {
    return {
      ok: false,
      error: { code: 'SCOPE_MISMATCH', message: 'Охват сценариев A и B несовместим.' },
    }
  }
  if (officialFingerprint(resultA) !== officialFingerprint(resultB)) {
    return {
      ok: false,
      error: { code: 'BASELINE_MISMATCH', message: 'Официальный базис A и B различается.' },
    }
  }
  if (assumptionFingerprint(resultA) === assumptionFingerprint(resultB)) {
    return {
      ok: false,
      error: { code: 'ASSUMPTIONS_IDENTICAL', message: 'A/B требует различных допущений при том же базисе.' },
    }
  }
  const va = finiteNumber(resultA.value)
  const vb = finiteNumber(resultB.value)
  const unitsMatch = resultA.unit === resultB.unit
  const difference = va != null && vb != null && unitsMatch ? vb - va : null
  return {
    ok: true,
    error: null,
    comparison: {
      calculationId: resultA.calculationId,
      officialBaseline: (resultA.operands || []).filter((item) => item.evidenceClass === EVIDENCE_CLASS.OFFICIAL),
      assumptionsA: (resultA.operands || []).filter((item) => item.evidenceClass === EVIDENCE_CLASS.ASSUMPTION),
      assumptionsB: (resultB.operands || []).filter((item) => item.evidenceClass === EVIDENCE_CLASS.ASSUMPTION),
      modelA: { id: resultA.id, value: resultA.value, unit: resultA.unit, qualifier: resultA.qualifier, approx: resultA.approx },
      modelB: { id: resultB.id, value: resultB.value, unit: resultB.unit, qualifier: resultB.qualifier, approx: resultB.approx },
      difference,
      differenceUnit: unitsMatch ? resultA.unit : null,
      limitations: [
        'Сравнение показывает следствие разных допущений, не победителя.',
        ...(resultA.limitations || []),
      ],
      verdict: null,
    },
  }
}

export function compareScenarios(scenarioA, scenarioB, calculationId) {
  const a = scenarioA?.results?.[calculationId]
  const b = scenarioB?.results?.[calculationId]
  if (!a || !b) {
    return {
      ok: false,
      error: { code: 'MISSING_CALC', message: `Нет MODEL-результата ${calculationId} в одном из сценариев.` },
    }
  }
  return compareModelResults(a, b)
}
