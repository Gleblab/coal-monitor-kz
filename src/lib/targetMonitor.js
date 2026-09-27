import { sources as catalogSources } from '../data/sources'
import { formatNumber, formatQualifiedNumber } from './format'

export const MONITOR_STATUS = {
  COMPARABLE: 'COMPARABLE',
  PARTIAL_PERIOD: 'PARTIAL_PERIOD',
  PREVIOUS_PERIOD: 'PREVIOUS_PERIOD',
  EXPECTED_2026: 'EXPECTED_2026',
  NON_COMPARABLE: 'NON_COMPARABLE',
  NO_FACT: 'NO_FACT',
}

const STATUS_LABEL = {
  COMPARABLE: 'ФАКТ 2026',
  PARTIAL_PERIOD: 'ЧАСТИЧНЫЙ ПЕРИОД',
  PREVIOUS_PERIOD: 'НЕТ ФАКТА 2026',
  EXPECTED_2026: 'ОЖИДАНИЕ 2026',
  NON_COMPARABLE: 'МЕТОДОЛОГИИ РАЗЛИЧАЮТСЯ',
  NO_FACT: 'НЕТ СОПОСТАВИМОГО ФАКТА',
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeUnit(unit) {
  return String(unit || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace('тенге', '₸')
    .trim()
}

function periodKindFromRow(row) {
  const type = String(row?.period_type || row?.measure_kind || '')
  if (type.includes('ytd') || row?.is_full_year === false) return 'ytd'
  if (type === 'year' || type === 'plan_year' || row?.is_full_year === true) return 'fy'
  return 'fy'
}

export function resolveMonitorSource(sourceId, sourceByCode) {
  if (!sourceId) return null
  const remote = sourceByCode?.[sourceId]
  const local = catalogSources[sourceId]
  if (!remote && !local) return null
  return {
    id: sourceId,
    organization: remote?.organization || local?.organization || null,
    publication: remote?.publication || remote?.title || local?.publication || null,
    url: remote?.url || local?.url || null,
  }
}

export function observationFromRow(row, extras = {}) {
  if (!row) return null
  const value = finiteNumber(row.value)
  if (value == null) return null
  const year = extras.year ?? row.year ?? null
  return {
    value,
    unit: extras.unit || row.unit || null,
    year,
    periodKind: extras.periodKind || periodKindFromRow(row),
    periodLabel: extras.periodLabel || (year != null ? String(year) : null),
    measureKind: extras.measureKind || row.measure_kind || extras.statusKind || null,
    entityKey: extras.entityKey || null,
    methodologyKey: extras.methodologyKey || row.source?.code || null,
    geographyKey: extras.geographyKey || 'national',
    geographyLabel: extras.geographyLabel || 'Национальный / республика',
    entityLabel: extras.entityLabel || null,
    sourceId: extras.sourceId || row.source?.code || null,
    sourceUrl: row.source?.url || extras.sourceUrl || null,
    methodologyNote: extras.methodologyNote || row.notes || row.methodology_note || null,
    qualifier: row.value_qualifier || (row.is_approximate ? 'about' : 'exact'),
    approx: Boolean(row.is_approximate || extras.approx),
  }
}

export function evaluateTargetFact(target, fact) {
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
      status: MONITOR_STATUS.NO_FACT,
      reason: 'Нет подтверждённой цели в текущем наборе данных.',
    }
  }

  if (!fact || finiteNumber(fact.value) == null) {
    return {
      ...empty,
      status: MONITOR_STATUS.NO_FACT,
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
      status: MONITOR_STATUS.NON_COMPARABLE,
      periodRelation: 'incompatible',
      reason: 'Прямое сравнение недоступно: различаются методология, сущность, география или единица.',
    }
  }

  const targetYear = finiteNumber(target.year)
  const factYear = finiteNumber(fact.year)

  if (targetYear != null && factYear === targetYear && fact.periodKind === 'ytd' && target.periodKind === 'fy') {
    return {
      ...empty,
      status: MONITOR_STATUS.PARTIAL_PERIOD,
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
        status: MONITOR_STATUS.NON_COMPARABLE,
        periodRelation: 'same_period',
        reason: 'Нельзя рассчитать выполнение: значение цели равно нулю.',
      }
    }
    const gap = fact.value - target.value
    return {
      comparable: true,
      status: MONITOR_STATUS.COMPARABLE,
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
        status: target.measureKind === 'expected' ? MONITOR_STATUS.EXPECTED_2026 : MONITOR_STATUS.PREVIOUS_PERIOD,
        periodRelation: 'previous_period',
        reason: 'Есть факт предыдущего периода, но baseline difference не считается от нуля как отсутствующего значения.',
      }
    }
    return {
      comparable: false,
      status: target.measureKind === 'expected' ? MONITOR_STATUS.EXPECTED_2026 : MONITOR_STATUS.PREVIOUS_PERIOD,
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
    status: MONITOR_STATUS.NO_FACT,
    periodRelation: 'none',
    reason: 'Подтверждённый факт для периода цели отсутствует.',
  }
}

function formatObservation(item) {
  if (!item || finiteNumber(item.value) == null) return null
  return `${formatQualifiedNumber(item.value, item.qualifier, item.approx)} ${item.unit || ''}`.trim()
}

function previousPeriodCaption(target, fact, evaluation) {
  if (evaluation.periodRelation !== 'previous_period' || !fact?.year || !target?.year) return null
  const factText = formatObservation(fact)
  const targetText = formatObservation(target)
  if (!factText || !targetText) return null
  const role = target.measureKind === 'expected' ? 'Ожидание / план' : 'План'
  return `Факт ${fact.year}: ${factText}. ${role} ${target.year}: ${targetText}. Плановый ориентир; выполнение оценивается только по сопоставимому факту ${target.year}.`
}

function comparabilityLabel(evaluation) {
  if (evaluation.status === MONITOR_STATUS.COMPARABLE) return 'сопоставимо'
  if (evaluation.status === MONITOR_STATUS.PARTIAL_PERIOD) {
    return 'Данные за неполный период нельзя напрямую сравнивать с итогом за полный год.'
  }
  if (evaluation.status === MONITOR_STATUS.NON_COMPARABLE) return 'прямое сравнение недоступно'
  if (evaluation.status === MONITOR_STATUS.NO_FACT) return 'нет факта'
  return 'разные периоды'
}

function dataStatusLabel(evaluation, fact) {
  if (evaluation.status === MONITOR_STATUS.PREVIOUS_PERIOD && fact?.year) {
    return `ПОСЛЕДНИЙ ФАКТ: ${fact.year}`
  }
  return STATUS_LABEL[evaluation.status] || evaluation.status
}

function buildItem({ id, direction, target, fact, extras = {} }) {
  if (!target) return null
  const evaluation = evaluateTargetFact(target, fact)
  return {
    id,
    direction,
    target,
    fact,
    evaluation,
    dataStatusLabel: dataStatusLabel(evaluation, fact),
    comparabilityLabel: comparabilityLabel(evaluation),
    targetDisplay: formatObservation(target),
    factDisplay: fact ? formatObservation(fact) : null,
    baselineCaption: previousPeriodCaption(target, fact, evaluation),
    related: extras.related || { to: '/outlook', label: 'Перспективы и развитие' },
    extraFacts: extras.extraFacts || [],
    warning: extras.warning || null,
    filterFlags: {
      hasFact2026: Boolean(fact && fact.year === 2026),
      plansOnly: evaluation.status !== MONITOR_STATUS.COMPARABLE,
      noComparable:
        evaluation.status === MONITOR_STATUS.NO_FACT || evaluation.status === MONITOR_STATUS.NON_COMPARABLE,
    },
  }
}

export function assembleTargetMonitor(input) {
  const items = []
  const ministryTarget = observationFromRow(input.ministryPlan, {
    measureKind: 'plan',
    entityKey: 'kz-minenergo-production',
    methodologyKey: 'minenergo2025',
    geographyKey: 'national',
    geographyLabel: 'Казахстан',
    periodKind: 'fy',
    periodLabel: '2026',
  })
  const ministryFact = observationFromRow(input.ministryActual, {
    measureKind: 'actual',
    entityKey: 'kz-minenergo-production',
    methodologyKey: 'minenergo2025',
    geographyKey: 'national',
    geographyLabel: 'Казахстан',
    periodKind: 'fy',
  })
  const bnsFact = observationFromRow(input.bnsActual2025, {
    measureKind: 'actual',
    entityKey: 'kz-bns-industry-production',
    methodologyKey: 'bnsIndustryCoalProduction',
    geographyKey: 'national',
  })
  items.push(
    buildItem({
      id: 'national-production-2026',
      direction: 'Добыча',
      target: ministryTarget,
      fact: ministryFact,
      extras: {
        related: { to: '/production', label: 'Объёмы и баланс' },
        warning: bnsFact
          ? `В проекте также есть показатель БНС ${formatNumber(bnsFact.value)} ${bnsFact.unit} за ${bnsFact.year}. Он относится к другому статистическому контуру и не используется как факт выполнения плана Минэнерго.`
          : null,
      },
    }),
  )

  const bogatyrTarget = observationFromRow(input.bogatyrPlan, {
    measureKind: 'plan',
    entityKey: 'bogatyr-production',
    methodologyKey: input.bogatyrPlan?.source?.code || 'minenergoShubarkol2026',
    geographyKey: 'company',
    geographyLabel: 'Предприятие',
    entityLabel: 'ТОО «Богатырь Комир»',
    periodKind: 'fy',
  })
  const bogatyrFact = observationFromRow(input.bogatyrActual, {
    measureKind: 'actual',
    entityKey: 'bogatyr-production',
    methodologyKey: input.bogatyrActual?.source?.code || input.bogatyrPlan?.source?.code || 'minenergoShubarkol2026',
    geographyKey: 'company',
    geographyLabel: 'Предприятие',
    entityLabel: 'ТОО «Богатырь Комир»',
    periodKind: 'fy',
  })
  const bogatyr2032 = observationFromRow(input.bogatyrTarget2032, {
    measureKind: 'target',
    entityKey: 'bogatyr-production',
    geographyKey: 'company',
    entityLabel: 'ТОО «Богатырь Комир»',
    periodKind: 'fy',
  })
  items.push(
    buildItem({
      id: 'bogatyr-production-2026',
      direction: 'Богатырь Комир',
      target: bogatyrTarget,
      fact: bogatyrFact,
      extras: {
        extraFacts: bogatyr2032
          ? [{ label: 'Целевой показатель 2032', value: formatObservation(bogatyr2032) }]
          : [],
      },
    }),
  )

  const investTarget = observationFromRow(input.investmentExpectation, {
    measureKind: 'expected',
    entityKey: 'kz-minenergo-investment',
    methodologyKey: 'minenergo2025',
    geographyKey: 'national',
    geographyLabel: 'Казахстан',
    periodKind: 'fy',
    approx: true,
  })
  const investFact = observationFromRow(input.investmentFact, {
    measureKind: 'actual',
    entityKey: 'kz-minenergo-investment',
    methodologyKey: 'minenergo2025',
    geographyKey: 'national',
    geographyLabel: 'Казахстан',
    periodKind: 'fy',
  })
  items.push(
    buildItem({
      id: 'investments-2026',
      direction: 'Инвестиции',
      target: investTarget,
      fact: investFact,
    }),
  )

  const plotsTarget = observationFromRow(input.coalPlots, {
    measureKind: 'plan',
    entityKey: 'kz-minenergo-coal-plots',
    methodologyKey: 'minenergo2025',
    geographyKey: 'national',
    geographyLabel: 'Казахстан',
    periodKind: 'fy',
    periodLabel: input.coalPlots?.year ? `до конца ${input.coalPlots.year}` : 'до конца 2026',
  })
  items.push(
    buildItem({
      id: 'coal-plots-2026',
      direction: 'Угольные участки',
      target: plotsTarget,
      fact: null,
    }),
  )

  const shubarkolTarget = observationFromRow(input.shubarkolPlan, {
    measureKind: 'plan',
    entityKey: 'shubarkol-production',
    methodologyKey: input.shubarkolPlan?.source?.code || 'minenergoShubarkol2026',
    geographyKey: 'company',
    geographyLabel: 'Предприятие',
    entityLabel: input.shubarkolPlan?.company?.short_name || 'АО «Шубарколь Комир»',
    periodKind: 'fy',
  })
  items.push(
    buildItem({
      id: 'shubarkol-production-2026',
      direction: 'Шубарколь Комир',
      target: shubarkolTarget,
      fact: null,
    }),
  )

  const list = items.filter(Boolean)
  return {
    items: list,
    summary: {
      total: list.length,
      withFact2026: list.filter((item) => item.filterFlags.hasFact2026).length,
      noComparable: list.filter((item) => item.filterFlags.noComparable).length,
    },
  }
}

export function filterMonitorItems(items, filterId) {
  if (!filterId || filterId === 'all') return items
  if (filterId === 'fact2026') return items.filter((item) => item.filterFlags.hasFact2026)
  if (filterId === 'plans') return items.filter((item) => item.filterFlags.plansOnly)
  if (filterId === 'none') return items.filter((item) => item.filterFlags.noComparable)
  return items
}
