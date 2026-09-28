/** Analytical reading mode — not an economic forecast scenario. */
export const VIEW_MODE = Object.freeze({
  VERIFIED: 'verified',
  PLANNED: 'planned',
  CONSTRAINTS: 'constraints',
})

export const EVIDENCE_CLASS = Object.freeze({
  OFFICIAL: 'official',
  MODEL: 'model',
  ASSUMPTION: 'assumption',
})

export const MEASURE_KIND = Object.freeze({
  ACTUAL: 'actual',
  PLAN: 'plan',
  TARGET: 'target',
  CAPACITY: 'capacity',
  EXPECTED: 'expected',
})

export const PERIOD_KIND = Object.freeze({
  FY: 'fy',
  YTD: 'ytd',
  HORIZON: 'horizon',
})

export const SCOPE = Object.freeze({
  NATIONAL: 'national',
  REGIONAL: 'regional',
  COMPANY: 'company',
  ASSET: 'asset',
  TRADE_NATIONAL: 'trade-national',
})

export const NODE_STATUS = Object.freeze({
  READY: 'ready',
  MISSING: 'missing',
  UNSUPPORTED_SCOPE: 'unsupported_scope',
  PLAN_WITHOUT_FACT: 'plan_without_fact',
})

/** Same codes as `MONITOR_STATUS` in targetMonitor.js — keep aligned. */
export const COMPARABILITY = Object.freeze({
  COMPARABLE: 'COMPARABLE',
  PARTIAL_PERIOD: 'PARTIAL_PERIOD',
  PREVIOUS_PERIOD: 'PREVIOUS_PERIOD',
  EXPECTED_2026: 'EXPECTED_2026',
  NON_COMPARABLE: 'NON_COMPARABLE',
  NO_FACT: 'NO_FACT',
})

export const VIEW_MODE_LABEL = Object.freeze({
  verified: 'Подтверждённый контур',
  planned: 'Плановый контур',
  constraints: 'Контур ограничений',
})

const PLAN_LIKE = new Set([MEASURE_KIND.PLAN, MEASURE_KIND.TARGET, MEASURE_KIND.EXPECTED])

export function isViewMode(value) {
  return value === VIEW_MODE.VERIFIED || value === VIEW_MODE.PLANNED || value === VIEW_MODE.CONSTRAINTS
}

export function isPlanLike(measureKind) {
  return PLAN_LIKE.has(measureKind)
}

export function isActualLike(measureKind) {
  return measureKind === MEASURE_KIND.ACTUAL
}

export function normalizeViewMode(value) {
  return isViewMode(value) ? value : VIEW_MODE.VERIFIED
}

/**
 * verified: actuals are primary; plan/target/expected/capacity are context only.
 * planned / constraints: all official measure kinds may be primary (still labeled).
 */
export function metricRoleInView(viewMode, measureKind) {
  const mode = normalizeViewMode(viewMode)
  if (mode === VIEW_MODE.VERIFIED) {
    if (isActualLike(measureKind)) return 'primary'
    return 'context'
  }
  return 'primary'
}

export function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function normalizeUnit(unit) {
  return String(unit || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace('тенге', '₸')
    .trim()
}

export function yearFromPublished(item) {
  const fromYear = finiteNumber(item?.year)
  if (fromYear != null) return fromYear
  const match = String(item?.period || '').match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : null
}

export function measureKindFromPublished(item) {
  if (item?.measureKind) return item.measureKind
  if (item?.measure_kind) return item.measure_kind
  const status = String(item?.status || '').toLowerCase()
  if (status.includes('план')) return MEASURE_KIND.PLAN
  if (status.includes('ожидан')) return MEASURE_KIND.EXPECTED
  if (status.includes('целев')) return MEASURE_KIND.TARGET
  if (status.includes('мощност') || item?.indicator_kind === 'capacity') return MEASURE_KIND.CAPACITY
  return MEASURE_KIND.ACTUAL
}

/**
 * Pair evaluation aligned with `evaluateTargetFact` in targetMonitor.js.
 */
export function evaluateAnalyticalPair(target, fact) {
  const empty = {
    comparable: false,
    periodRelation: null,
    difference: null,
    differencePct: null,
    completion: null,
    gap: null,
  }

  if (!target || finiteNumber(target.value) == null) {
    return {
      ...empty,
      status: COMPARABILITY.NO_FACT,
      reason: 'Нет подтверждённой цели в текущем наборе данных.',
    }
  }

  if (!fact || finiteNumber(fact.value) == null) {
    return {
      ...empty,
      status: COMPARABILITY.NO_FACT,
      periodRelation: 'none',
      reason: 'Подтверждённый факт исполнения: нет данных.',
    }
  }

  const unitOk = Boolean(target.unit && fact.unit && normalizeUnit(target.unit) === normalizeUnit(fact.unit))
  const entityOk = Boolean(target.entityKey && target.entityKey === fact.entityKey)
  const methodOk = Boolean(target.methodologyKey && target.methodologyKey === fact.methodologyKey)
  const geoOk = Boolean(target.geographyKey && target.geographyKey === fact.geographyKey)

  if (!unitOk || !entityOk || !methodOk || !geoOk) {
    return {
      ...empty,
      status: COMPARABILITY.NON_COMPARABLE,
      periodRelation: 'incompatible',
      reason: 'Прямое сравнение недоступно: различаются методология, сущность, география или единица.',
    }
  }

  const targetYear = finiteNumber(target.year)
  const factYear = finiteNumber(fact.year)

  if (targetYear != null && factYear === targetYear && fact.periodKind === 'ytd' && target.periodKind === 'fy') {
    return {
      ...empty,
      status: COMPARABILITY.PARTIAL_PERIOD,
      periodRelation: 'ytd_vs_fy',
      reason: 'Есть факт неполного периода при цели на полный год. FY completion не рассчитывается и не экстраполируется.',
    }
  }

  if (
    targetYear != null &&
    factYear === targetYear &&
    fact.periodKind === 'fy' &&
    target.periodKind === 'fy' &&
    fact.measureKind === 'actual'
  ) {
    if (target.value === 0) {
      return {
        ...empty,
        status: COMPARABILITY.NON_COMPARABLE,
        periodRelation: 'same_period',
        reason: 'Нельзя рассчитать выполнение: значение цели равно нулю.',
      }
    }
    const gap = fact.value - target.value
    return {
      comparable: true,
      status: COMPARABILITY.COMPARABLE,
      periodRelation: 'same_period',
      difference: gap,
      differencePct: (fact.value / target.value - 1) * 100,
      completion: (fact.value / target.value) * 100,
      gap,
      reason: 'Сопоставимый факт за период цели.',
    }
  }

  if (targetYear != null && factYear != null && factYear < targetYear && fact.measureKind === 'actual') {
    if (fact.value === 0) {
      return {
        ...empty,
        status: target.measureKind === 'expected' ? COMPARABILITY.EXPECTED_2026 : COMPARABILITY.PREVIOUS_PERIOD,
        periodRelation: 'previous_period',
        reason: 'Есть факт предыдущего периода, но baseline difference не считается от нуля как отсутствующего значения.',
      }
    }
    return {
      comparable: false,
      status: target.measureKind === 'expected' ? COMPARABILITY.EXPECTED_2026 : COMPARABILITY.PREVIOUS_PERIOD,
      periodRelation: 'previous_period',
      difference: null,
      differencePct: null,
      completion: null,
      gap: null,
      reason: 'Есть факт предыдущего периода. Это не выполнение цели и не progress.',
    }
  }

  return {
    ...empty,
    status: COMPARABILITY.NO_FACT,
    periodRelation: 'none',
    reason: 'Подтверждённый факт для периода цели отсутствует.',
  }
}

export function sourceRef(sourceId) {
  if (!sourceId || String(sourceId).trim() === '') return null
  return { sourceId: String(sourceId) }
}

/**
 * OFFICIAL metric. Returns null if value or sourceId is missing.
 * Official ≠ actual: measureKind stays plan/capacity/target when that is what was published.
 */
export function officialMetric(input) {
  const value = finiteNumber(input?.value)
  const sourceId = input?.sourceId
  if (value == null || !sourceId) return null
  return {
    evidenceClass: EVIDENCE_CLASS.OFFICIAL,
    id: input.id || null,
    label: input.label || 'Показатель',
    value,
    unit: input.unit || null,
    measureKind: input.measureKind || MEASURE_KIND.ACTUAL,
    periodKind: input.periodKind || PERIOD_KIND.FY,
    year: finiteNumber(input.year),
    periodLabel: input.periodLabel || (input.year != null ? String(input.year) : null),
    scope: input.scope || SCOPE.NATIONAL,
    qualifier: input.qualifier || (input.approx ? 'about' : 'exact'),
    approx: Boolean(input.approx),
    note: input.note || null,
    sourceId,
    source_id: input.source_id || null,
  }
}

/**
 * MODEL metric. Naked derived numbers are rejected.
 */
export function modelMetric(input) {
  const value = input?.value == null ? null : finiteNumber(input.value)
  if (!input?.formula || !Array.isArray(input.operands) || input.operands.length === 0) return null
  if (!input.comparability) return null
  return {
    evidenceClass: EVIDENCE_CLASS.MODEL,
    id: input.id || null,
    label: input.label || 'Расчёт',
    value,
    unit: input.unit || null,
    formula: input.formula,
    operands: input.operands,
    comparability: input.comparability,
    explanation: input.explanation || null,
    measureKind: input.measureKind || null,
    scope: input.scope || null,
  }
}

export function assumptionEntry(input) {
  if (!input?.id || !input?.text) return null
  return {
    evidenceClass: EVIDENCE_CLASS.ASSUMPTION,
    id: input.id,
    text: input.text,
  }
}

export function emptyNode(id, title) {
  return {
    id,
    title,
    evidenceClass: EVIDENCE_CLASS.OFFICIAL,
    statement: 'Нет подтверждённых данных.',
    officialMetrics: [],
    contextMetrics: [],
    modelMetrics: [],
    assumptions: [],
    limitations: [],
    sources: [],
    status: NODE_STATUS.MISSING,
    readingNote:
      'Последовательность узлов — аналитическое чтение. Она не означает доказанную причинно-следственную связь.',
  }
}

export function collectSources(metrics) {
  const ids = []
  for (const item of metrics) {
    if (item?.sourceId && !ids.includes(item.sourceId)) ids.push(item.sourceId)
  }
  return ids.map((sourceId) => ({ sourceId }))
}

export function partitionOfficial(viewMode, metrics) {
  const officialMetrics = []
  const contextMetrics = []
  for (const item of metrics) {
    if (!item) continue
    if (metricRoleInView(viewMode, item.measureKind) === 'primary') officialMetrics.push(item)
    else contextMetrics.push(item)
  }
  return { officialMetrics, contextMetrics }
}
