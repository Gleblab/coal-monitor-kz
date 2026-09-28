import { NATIONAL_CAPACITY_SPLIT } from '../data/constraintsConfig.js'
import {
  VIEW_MODE,
  MEASURE_KIND,
  PERIOD_KIND,
  SCOPE,
  NODE_STATUS,
  COMPARABILITY,
  VIEW_MODE_LABEL,
  officialMetric,
  modelMetric,
  assumptionEntry,
  emptyNode,
  collectSources,
  partitionOfficial,
  normalizeViewMode,
  isPlanLike,
  finiteNumber,
  yearFromPublished,
  measureKindFromPublished,
  normalizeUnit,
  evaluateAnalyticalPair,
} from './scenarioEvidence.js'

export const ANALYTICAL_NODES = Object.freeze([
  'production',
  'energyDemand',
  'exports',
  'railLogistics',
  'constraints',
])

export const READING_SEQUENCE_NOTE =
  'Стрелки между узлами задают порядок аналитического чтения. Они не означают доказанную причинно-следственную связь.'

const CONTOUR = Object.freeze({
  MINISTRY_PRODUCTION: {
    entityKey: 'kz-minenergo-production',
    methodologyKey: 'minenergo2025',
    geographyKey: 'national',
  },
  BNS_PRODUCTION: {
    entityKey: 'kz-bns-industry-production',
    methodologyKey: 'bnsIndustryCoalProduction',
    geographyKey: 'national',
  },
  BOGATYR_PRODUCTION: {
    entityKey: 'bogatyr-production',
    methodologyKey: 'bogatyr-production',
    geographyKey: 'company',
  },
})

function yearOf(item) {
  return yearFromPublished(item)
}

function periodKindOf(item, fallback = PERIOD_KIND.FY) {
  if (item?.periodKind) return item.periodKind
  if (item?.period_type === 'ytd' || item?.is_full_year === false) return PERIOD_KIND.YTD
  if (item?.isFullYear === false) return PERIOD_KIND.YTD
  return fallback
}

function measureKindOf(item, fallback) {
  return item?.measureKind || item?.measure_kind || measureKindFromPublished(item) || fallback
}

function sourceIdOf(item) {
  return item?.sourceId || item?.source?.code || null
}

/**
 * Bind an existing mapped outlook / API metric as OFFICIAL. No invented values.
 */
export function bindOfficial(item, extras = {}) {
  if (!item) return null
  return officialMetric({
    id: extras.id || item.id,
    label: extras.label || item.label || item.name || item.indicator,
    value: item.value,
    unit: extras.unit || item.unit,
    sourceId: extras.sourceId || sourceIdOf(item),
    source_id: item.source_id,
    measureKind: extras.measureKind || measureKindOf(item, extras.fallbackKind),
    periodKind: extras.periodKind || periodKindOf(item),
    year: extras.year ?? yearOf(item),
    periodLabel: extras.periodLabel || item.period || null,
    scope: extras.scope,
    qualifier: extras.qualifier || item.value_qualifier || item.qualifier,
    approx: extras.approx ?? item.approx,
    note: extras.note || item.note,
  })
}

export function toMonitorObservation(metric, contour) {
  if (!metric) return null
  return {
    value: metric.value,
    unit: metric.unit,
    year: metric.year,
    periodKind: metric.periodKind,
    measureKind: metric.measureKind,
    entityKey: contour.entityKey,
    methodologyKey: contour.methodologyKey,
    geographyKey: contour.geographyKey,
    sourceId: metric.sourceId,
    qualifier: metric.qualifier,
    approx: metric.approx,
  }
}

function measureKindsCompatible(a, b) {
  if (!a || !b) return false
  if (a.measureKind === MEASURE_KIND.CAPACITY || b.measureKind === MEASURE_KIND.CAPACITY) {
    return a.measureKind === b.measureKind
  }
  const pair = new Set([a.measureKind, b.measureKind])
  if (pair.has(MEASURE_KIND.ACTUAL) && (pair.has(MEASURE_KIND.PLAN) || pair.has(MEASURE_KIND.TARGET) || pair.has(MEASURE_KIND.EXPECTED))) {
    return true
  }
  return a.measureKind === b.measureKind
}

function isThroughputUnit(unit) {
  const n = normalizeUnit(unit)
  return n.includes('сут') || n.includes('/сут') || n.includes('в сутки')
}

function isPowerUnit(unit) {
  const n = normalizeUnit(unit)
  return n.includes('мвт') || n.includes('гвт') || n === 'mw' || n === 'gw'
}

function isTonnageUnit(unit) {
  const n = normalizeUnit(unit)
  return n.includes('т') && !isPowerUnit(unit) && !isThroughputUnit(unit)
}

/**
 * Guard for MODEL arithmetic. Aligns with targetMonitor and extra contour rules.
 */
export function compareOfficialMetrics(left, right, options = {}) {
  const empty = {
    comparable: false,
    status: COMPARABILITY.NO_FACT,
    periodRelation: null,
    difference: null,
    reason: 'Нет подтверждённых данных для сравнения.',
  }
  if (!left || !right) return empty

  if (options.intent === 'sum_horizons') {
    return {
      comparable: false,
      status: COMPARABILITY.NON_COMPARABLE,
      periodRelation: 'incompatible',
      difference: null,
      reason: 'Горизонты спроса / потребности нельзя складывать в один показатель.',
    }
  }

  if (options.intent === 'power_to_tonnes' || (isPowerUnit(left.unit) && isTonnageUnit(right.unit))) {
    return {
      comparable: false,
      status: COMPARABILITY.NON_COMPARABLE,
      periodRelation: 'incompatible',
      difference: null,
      reason: 'Мощность генерации (МВт/ГВт) не переводится в тонны угля в этой модели.',
    }
  }

  if (options.intent === 'throughput_to_fleet' || (isThroughputUnit(left.unit) && options.asFleet)) {
    return {
      comparable: false,
      status: COMPARABILITY.NON_COMPARABLE,
      periodRelation: 'incompatible',
      difference: null,
      reason: 'Показатель «ед. в сутки» описывает пропускную способность, а не парк вагонов.',
    }
  }

  if (left.scope !== right.scope) {
    return {
      comparable: false,
      status: COMPARABILITY.NON_COMPARABLE,
      periodRelation: 'incompatible',
      difference: null,
      reason: 'Прямое сравнение недоступно: различается охват (national / regional / company / asset).',
    }
  }

  if (!measureKindsCompatible(left, right)) {
    return {
      comparable: false,
      status: COMPARABILITY.NON_COMPARABLE,
      periodRelation: 'incompatible',
      difference: null,
      reason: 'Прямое сравнение недоступно: различаются виды показателя (в том числе мощность ≠ добыча).',
    }
  }

  if (left.periodKind === PERIOD_KIND.YTD || right.periodKind === PERIOD_KIND.YTD) {
    if (left.periodKind !== right.periodKind) {
      return {
        comparable: false,
        status: COMPARABILITY.PARTIAL_PERIOD,
        periodRelation: 'ytd_vs_fy',
        difference: null,
        reason: 'Данные за неполный период нельзя напрямую сравнивать с итогом за полный год.',
      }
    }
  }

  const leftObs = toMonitorObservation(left, options.leftContour || {
    entityKey: options.entityKey,
    methodologyKey: options.methodologyKey || left.sourceId,
    geographyKey: left.scope,
  })
  const rightObs = toMonitorObservation(right, options.rightContour || {
    entityKey: options.entityKey,
    methodologyKey: options.methodologyKey || right.sourceId,
    geographyKey: right.scope,
  })

  const target = isPlanLike(left.measureKind) ? leftObs : isPlanLike(right.measureKind) ? rightObs : leftObs
  const fact = isPlanLike(left.measureKind) ? rightObs : isPlanLike(right.measureKind) ? leftObs : rightObs
  return evaluateAnalyticalPair(target, fact)
}

export function modelDelta(plan, actual, options = {}) {
  const comparability = compareOfficialMetrics(plan, actual, options)
  if (!comparability.comparable) {
    return modelMetric({
      id: options.id || 'delta-non-comparable',
      label: options.label || 'Разность плана и факта',
      value: null,
      unit: plan?.unit || actual?.unit || null,
      formula: 'plan − last_actual',
      operands: [plan, actual].filter(Boolean),
      comparability,
      explanation: comparability.reason,
      measureKind: 'delta',
      scope: plan?.scope || actual?.scope || null,
    })
  }
  return modelMetric({
    id: options.id || 'delta-plan-actual',
    label: options.label || 'Разность сопоставимого факта и плана',
    value: comparability.difference,
    unit: plan.unit,
    formula: 'actual − plan',
    operands: [plan, actual],
    comparability,
    explanation: comparability.reason,
    measureKind: 'delta',
    scope: plan.scope,
  })
}

function joinStatements(parts) {
  return parts.filter(Boolean).join(' ')
}

function horizonOf(input) {
  const year = finiteNumber(input?.horizon)
  return year
}

function requestedScope(input) {
  if (input?.assetId) return SCOPE.ASSET
  if (input?.companyId && input.companyId !== 'all') return SCOPE.COMPANY
  if (input?.regionId && input.regionId !== 'all') return SCOPE.REGIONAL
  return SCOPE.NATIONAL
}

function isBogatyrSlice(input) {
  const asset = String(input?.assetId || '')
  const company = String(input?.companyId || '')
  return (
    asset.includes('bogatyr') ||
    company.includes('bogatyr') ||
    asset === 'bogatyr-company' ||
    company === 'bogatyr-komir'
  )
}

function isPavlodarSlice(input) {
  return input?.regionId === 'pavlodar'
}

function finishNode(node, viewMode) {
  const partitioned = partitionOfficial(viewMode, [...node.officialMetrics, ...node.contextMetrics])
  node.officialMetrics = partitioned.officialMetrics
  node.contextMetrics = partitioned.contextMetrics
  node.sources = collectSources([...node.officialMetrics, ...node.contextMetrics, ...node.modelMetrics.flatMap((m) => m.operands || [])])
  if (!node.officialMetrics.length && !node.contextMetrics.length) {
    node.status = node.status === NODE_STATUS.UNSUPPORTED_SCOPE ? NODE_STATUS.UNSUPPORTED_SCOPE : NODE_STATUS.MISSING
    if (!node.statement) node.statement = 'Нет подтверждённых данных.'
  }
  return node
}

function bindProduction(input, viewMode) {
  const node = emptyNode('production', 'Добыча')
  node.evidenceClass = 'mixed'
  const horizon = horizonOf(input)
  const outlook = input.outlook || {}
  const scope = requestedScope(input)

  if (scope === SCOPE.ASSET || scope === SCOPE.COMPANY) {
    if (!isBogatyrSlice(input)) {
      node.status = NODE_STATUS.UNSUPPORTED_SCOPE
      node.statement = 'Для выбранного актива отсутствует подтверждённый ряд добычи. Национальный план не наследуется на актив.'
      node.limitations.push('Национальное наблюдение не подставляется вместо показателя актива.')
      return finishNode(node, viewMode)
    }
    const c = outlook.bogatyrCase || {}
    const actual = bindOfficial(c.actual, {
      scope: SCOPE.COMPANY,
      measureKind: MEASURE_KIND.ACTUAL,
      label: c.actual?.label || 'Добыча Богатырь Комир',
    })
    const plan = bindOfficial(c.plan, {
      scope: SCOPE.COMPANY,
      measureKind: MEASURE_KIND.PLAN,
      label: c.plan?.label || 'План добычи Богатырь Комир',
    })
    const target = bindOfficial(c.target, {
      scope: SCOPE.COMPANY,
      measureKind: MEASURE_KIND.TARGET,
      label: c.target?.label || 'Целевой показатель Богатырь Комир',
    })
    const capacity = bindOfficial(c.capacity, {
      scope: SCOPE.COMPANY,
      measureKind: MEASURE_KIND.CAPACITY,
      label: c.capacity?.label || 'Мощность Богатырь Комир',
      periodKind: PERIOD_KIND.HORIZON,
    })

    const collected = [actual, plan, target, capacity].filter(Boolean)
    node.officialMetrics = collected
    node.assumptions.push(
      assumptionEntry({
        id: 'capacity-not-production',
        text: 'Показатель мощности не является фактом или планом добычи и не используется как производство.',
      }),
    )

    const nationalPlan = bindOfficial(outlook.trajectory?.plannedExtraction, {
      scope: SCOPE.NATIONAL,
      measureKind: MEASURE_KIND.PLAN,
    })
    if (nationalPlan) {
      node.limitations.push('Национальный план добычи не является планом Богатырь Комир.')
      const inherit = compareOfficialMetrics(nationalPlan, plan || actual, {
        leftContour: CONTOUR.MINISTRY_PRODUCTION,
        rightContour: CONTOUR.BOGATYR_PRODUCTION,
      })
      node.modelMetrics.push(
        modelMetric({
          id: 'national-plan-as-bogatyr',
          label: 'Наследование национального плана на Богатырь',
          value: null,
          unit: nationalPlan.unit,
          formula: 'forbidden: national_plan → bogatyr_plan',
          operands: [nationalPlan, plan].filter(Boolean),
          comparability: {
            ...inherit,
            status: COMPARABILITY.NON_COMPARABLE,
            comparable: false,
            reason: 'Национальный план не является планом Богатырь Комир.',
          },
          explanation: 'Национальный план не является планом Богатырь Комир.',
        }),
      )
    }

    if (plan && actual) {
      node.modelMetrics.push(
        modelDelta(plan, actual, {
          id: 'bogatyr-plan-vs-actual',
          leftContour: CONTOUR.BOGATYR_PRODUCTION,
          rightContour: CONTOUR.BOGATYR_PRODUCTION,
          entityKey: CONTOUR.BOGATYR_PRODUCTION.entityKey,
          methodologyKey: plan.sourceId || actual.sourceId,
        }),
      )
    }
    if (capacity && (plan || actual)) {
      node.modelMetrics.push(
        modelMetric({
          id: 'capacity-vs-production',
          label: 'Мощность как добыча',
          value: null,
          unit: capacity.unit,
          formula: 'forbidden: capacity − production',
          operands: [capacity, plan || actual],
          comparability: compareOfficialMetrics(capacity, plan || actual, {
            leftContour: CONTOUR.BOGATYR_PRODUCTION,
            rightContour: CONTOUR.BOGATYR_PRODUCTION,
          }),
          explanation: 'Мощность не сопоставляется с добычей как один ряд.',
        }),
      )
    }

    const parts = []
    if (plan && horizon === plan.year && !actual) {
      parts.push(`Опубликован план добычи на ${plan.year} год; сопоставимый факт ${plan.year} отсутствует.`)
    } else if (plan && actual && actual.year !== plan.year) {
      parts.push(
        `Опубликован план добычи на ${plan.year} год; сопоставимый факт ${plan.year} отсутствует. Последний подтверждённый факт относится к ${actual.year} году и не является выполнением плана.`,
      )
    } else if (actual && !plan) {
      parts.push(`Есть подтверждённый факт добычи за ${actual.year} год.`)
    }
    if (capacity) {
      parts.push('Опубликован показатель мощности; он не трактуется как добыча.')
    }
    if (target && horizon === target.year) {
      parts.push(`Опубликован целевой показатель на ${target.year} год; это не факт исполнения.`)
    }
    node.statement = joinStatements(parts) || 'Нет подтверждённых данных.'
    node.status = collected.length ? (plan && (!actual || actual.year !== plan.year) ? NODE_STATUS.PLAN_WITHOUT_FACT : NODE_STATUS.READY) : NODE_STATUS.MISSING
    return finishNode(node, viewMode)
  }

  if (scope === SCOPE.REGIONAL) {
    const regionalRows = Array.isArray(input.regionalProduction) ? input.regionalProduction : []
    const scoped = regionalRows
      .map((row) =>
        bindOfficial(row, {
          scope: SCOPE.REGIONAL,
          measureKind: measureKindOf(row, MEASURE_KIND.ACTUAL),
        }),
      )
      .filter(Boolean)
    if (!scoped.length) {
      node.status = NODE_STATUS.MISSING
      node.statement = isPavlodarSlice(input)
        ? 'Для выбранного горизонта отсутствует подтверждённый региональный ряд.'
        : 'Нет подтверждённых данных.'
      node.limitations.push('Национальный факт или план не подставляется в региональный узел.')
      return finishNode(node, viewMode)
    }
    node.officialMetrics = scoped
    node.statement = `Есть подтверждённые региональные наблюдения (${scoped.length}). Национальный контур в регион не наследуется.`
    node.status = NODE_STATUS.READY
    return finishNode(node, viewMode)
  }

  const ministryActual = bindOfficial(outlook.trajectory?.actualExtraction, {
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.ACTUAL,
    label: outlook.trajectory?.actualExtraction?.label || 'Добыча (Минэнерго)',
  })
  const ministryPlan = bindOfficial(outlook.trajectory?.plannedExtraction, {
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.PLAN,
    label: outlook.trajectory?.plannedExtraction?.label || 'План добычи (Минэнерго)',
  })
  const bns = bindOfficial(outlook.industry?.bns || input.bnsActual, {
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.ACTUAL,
    label: 'Добыча (БНС)',
  })

  node.officialMetrics = [ministryActual, ministryPlan, bns].filter(Boolean)

  if (ministryPlan && ministryActual) {
    node.modelMetrics.push(
      modelDelta(ministryPlan, ministryActual, {
        id: 'ministry-plan-vs-actual',
        leftContour: CONTOUR.MINISTRY_PRODUCTION,
        rightContour: CONTOUR.MINISTRY_PRODUCTION,
        entityKey: CONTOUR.MINISTRY_PRODUCTION.entityKey,
        methodologyKey: CONTOUR.MINISTRY_PRODUCTION.methodologyKey,
      }),
    )
  }
  if (ministryActual && bns) {
    node.modelMetrics.push(
      modelDelta(ministryActual, bns, {
        id: 'ministry-vs-bns',
        leftContour: CONTOUR.MINISTRY_PRODUCTION,
        rightContour: CONTOUR.BNS_PRODUCTION,
      }),
    )
  }

  const parts = []
  if (ministryPlan && (!ministryActual || ministryActual.year !== ministryPlan.year)) {
    parts.push(
      `Опубликован план добычи на ${ministryPlan.year} год; сопоставимый факт ${ministryPlan.year} отсутствует.`,
    )
    if (ministryActual) {
      parts.push(`Последний факт того же контура Минэнерго относится к ${ministryActual.year} году и не является выполнением плана.`)
    }
    node.status = NODE_STATUS.PLAN_WITHOUT_FACT
  } else if (ministryActual) {
    parts.push(`Есть подтверждённый факт добычи Минэнерго за ${ministryActual.year} год.`)
    node.status = NODE_STATUS.READY
  } else {
    node.status = NODE_STATUS.MISSING
    parts.push('Нет подтверждённых данных.')
  }
  if (bns) {
    parts.push('Показатель БНС относится к другому статистическому контуру и не складывается с рядом Минэнерго.')
  }
  node.statement = joinStatements(parts)
  return finishNode(node, viewMode)
}

function bindEnergyDemand(input, viewMode) {
  const node = emptyNode('energyDemand', 'Спрос и генерация')
  node.evidenceClass = 'mixed'
  const horizon = horizonOf(input)
  const scope = requestedScope(input)
  const outlook = input.outlook || {}
  const industry = outlook.industryOutlook || {}

  if (scope === SCOPE.REGIONAL || scope === SCOPE.ASSET || scope === SCOPE.COMPANY) {
    const regional = Array.isArray(input.regionalEnergy) ? input.regionalEnergy : []
    const scoped = regional.map((row) => bindOfficial(row, { scope: SCOPE.REGIONAL })).filter(Boolean)
    if (!scoped.length) {
      node.status = NODE_STATUS.MISSING
      node.statement = 'Для выбранного горизонта отсутствует подтверждённый региональный ряд.'
      node.limitations.push('Национальный спрос / потребность не наследуются на Павлодар или Богатырь.')
      return finishNode(node, viewMode)
    }
    node.officialMetrics = scoped
    node.status = NODE_STATUS.READY
    node.statement = 'Есть подтверждённые региональные наблюдения по роли угля. Национальный спрос к ним не прибавляется.'
    return finishNode(node, viewMode)
  }

  const demand2030 = bindOfficial(industry.additionalDemand, {
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.PLAN,
    periodKind: PERIOD_KIND.HORIZON,
    year: 2030,
    label: industry.additionalDemand?.label || 'Дополнительный спрос (ориентир)',
  })
  const need2032 = bindOfficial(industry.energyNeed, {
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.EXPECTED,
    periodKind: PERIOD_KIND.HORIZON,
    year: 2032,
    label: industry.energyNeed?.label || 'Потребность в энергии (ориентир)',
  })
  const genIndicators = Array.isArray(outlook.nationalProject?.indicators)
    ? outlook.nationalProject.indicators
        .map((row) =>
          bindOfficial(row, {
            scope: SCOPE.NATIONAL,
            measureKind: row.indicator_kind === 'capacity' ? MEASURE_KIND.CAPACITY : measureKindOf(row, MEASURE_KIND.PLAN),
            periodKind: PERIOD_KIND.HORIZON,
          }),
        )
        .filter(Boolean)
    : []

  const collected = []
  if (horizon === 2030 && demand2030) collected.push(demand2030)
  if (horizon === 2032 && need2032) collected.push(need2032)
  if (horizon !== 2030 && demand2030) node.contextMetrics.push(demand2030)
  if (horizon !== 2032 && need2032) node.contextMetrics.push(need2032)
  collected.push(...genIndicators)
  node.officialMetrics = collected

  if (demand2030 && need2032) {
    node.modelMetrics.push(
      modelMetric({
        id: 'demand-2030-plus-2032',
        label: 'Сумма ориентиров 2030 и 2032',
        value: null,
        unit: demand2030.unit,
        formula: 'forbidden: demand_2030 + requirement_2032',
        operands: [demand2030, need2032],
        comparability: compareOfficialMetrics(demand2030, need2032, { intent: 'sum_horizons' }),
        explanation: 'Ориентир 2030 и потребность 2032 — разные горизонты; сумма не рассчитывается.',
      }),
    )
    node.limitations.push('Ориентир спроса 2030 и потребность 2032 не суммируются.')
  }

  for (const gen of genIndicators) {
    if (isPowerUnit(gen.unit) && (demand2030 || need2032)) {
      const coal = demand2030 || need2032
      node.modelMetrics.push(
        modelMetric({
          id: `mw-to-tonnes-${gen.id}`,
          label: 'Перевод мощности в тонны угля',
          value: null,
          unit: coal.unit,
          formula: 'forbidden: MW → coal tonnes',
          operands: [gen, coal],
          comparability: compareOfficialMetrics(gen, coal, { intent: 'power_to_tonnes' }),
          explanation: 'МВт/ГВт не переводятся в тонны угля.',
        }),
      )
    }
  }

  if (horizon === 2026) {
    node.statement = 'Для горизонта 2026 подтверждённый ряд национального спроса на уголь в этом контуре отсутствует. Ориентиры 2030/2032 — другие горизонты и не являются фактом 2026.'
    node.status = demand2030 || need2032 || genIndicators.length ? NODE_STATUS.READY : NODE_STATUS.MISSING
  } else if (horizon === 2030 && demand2030) {
    node.statement = 'Опубликован ориентир дополнительного спроса на 2030 год; это не факт исполнения и не сумма с потребностью 2032.'
    node.status = NODE_STATUS.READY
  } else if (horizon === 2032 && need2032) {
    node.statement = 'Опубликован ориентир потребности на 2032 год; это не факт исполнения и не сумма с ориентиром 2030.'
    node.status = NODE_STATUS.READY
  } else {
    node.statement = 'Нет подтверждённых данных.'
    node.status = NODE_STATUS.MISSING
  }
  return finishNode(node, viewMode)
}

function bindExports(input, viewMode) {
  const node = emptyNode('exports', 'Экспорт')
  const scope = requestedScope(input)
  const rows = Array.isArray(input.exportMetrics) ? input.exportMetrics : []

  if (scope === SCOPE.REGIONAL || scope === SCOPE.ASSET || scope === SCOPE.COMPANY) {
    node.status = NODE_STATUS.UNSUPPORTED_SCOPE
    node.statement = 'Для выбранного охвата нет подтверждённой экспортной структуры. Национальная доля партнёра не является структурой экспорта региона или актива.'
    node.limitations.push('Национальная доля партнёра не переносится на Павлодар / Богатырь.')
    const national = rows
      .map((row) => bindOfficial(row, { scope: SCOPE.TRADE_NATIONAL, periodKind: periodKindOf(row) }))
      .filter(Boolean)
    node.contextMetrics = national
    return finishNode(node, viewMode)
  }

  const official = rows
    .map((row) =>
      bindOfficial(row, {
        scope: SCOPE.TRADE_NATIONAL,
        periodKind: periodKindOf(row),
        measureKind: measureKindOf(row, MEASURE_KIND.ACTUAL),
      }),
    )
    .filter(Boolean)

  if (!official.length) {
    node.status = NODE_STATUS.MISSING
    node.statement = 'Нет подтверждённых данных.'
    return finishNode(node, viewMode)
  }

  node.officialMetrics = official
  const ytd = official.filter((item) => item.periodKind === PERIOD_KIND.YTD)
  const fy = official.filter((item) => item.periodKind === PERIOD_KIND.FY)
  if (ytd.length && fy.length) {
    node.modelMetrics.push(
      modelMetric({
        id: 'export-ytd-vs-fy',
        label: 'YTD как полный год',
        value: null,
        unit: ytd[0].unit,
        formula: 'forbidden: ytd treated as fy',
        operands: [ytd[0], fy[0]],
        comparability: compareOfficialMetrics(ytd[0], fy[0]),
        explanation: 'YTD не трактуется как полный год.',
      }),
    )
  } else if (ytd.length) {
    node.limitations.push('Показатель экспорта относится к неполному периоду (YTD) и не является итогом полного года.')
    node.statement = 'Есть подтверждённый экспорт за неполный период; это не факт полного года.'
    node.status = NODE_STATUS.READY
    return finishNode(node, viewMode)
  }

  node.statement = 'Есть подтверждённые наблюдения внешнеторгового контура. Это не региональная структура экспорта.'
  node.status = NODE_STATUS.READY
  return finishNode(node, viewMode)
}

function bindRail(input, viewMode) {
  const node = emptyNode('railLogistics', 'Железнодорожная логистика')
  const industry = input.outlook?.industryOutlook || {}
  const gondolas = bindOfficial(industry.gondolas, {
    scope: SCOPE.NATIONAL,
    measureKind: MEASURE_KIND.PLAN,
    label: industry.gondolas?.label || 'Полувагоны (пропускная способность)',
  })
  if (gondolas && isThroughputUnit(gondolas.unit)) {
    gondolas.note = joinStatements([gondolas.note, 'Ед. в сутки — пропускная способность, не парк вагонов.'])
  }

  const scope = requestedScope(input)
  if (gondolas && scope === SCOPE.NATIONAL) node.officialMetrics.push(gondolas)
  if (industry.railMeasure) {
    node.assumptions.push(
      assumptionEntry({
        id: 'rail-measure-qualitative',
        text: industry.railMeasure.name || 'Опубликована качественная мера по железнодорожной логистике без перевода в парк вагонов.',
      }),
    )
  }

  if (gondolas && scope === SCOPE.NATIONAL) {
    node.modelMetrics.push(
      modelMetric({
        id: 'wagon-day-as-fleet',
        label: 'Ед. в сутки как парк вагонов',
        value: null,
        unit: gondolas.unit,
        formula: 'forbidden: wagon/day → wagon fleet',
        operands: [gondolas],
        comparability: compareOfficialMetrics(gondolas, gondolas, { intent: 'throughput_to_fleet', asFleet: true }),
        explanation: 'Показатель «ед. в сутки» не описывается как парк вагонов.',
      }),
    )
    node.statement = 'Опубликован показатель в единицах в сутки; это пропускная способность, а не парк вагонов.'
    node.status = NODE_STATUS.READY
  } else if (scope !== SCOPE.NATIONAL) {
    node.limitations.push('Национальный логистический ориентир не является ограничением конкретного разреза без отдельного источника.')
    node.statement = 'Для выбранного охвата нет подтверждённой железнодорожной нагрузки. Национальный ориентир в единицах в сутки не переносится на регион или разрез.'
    node.status = NODE_STATUS.MISSING
  } else {
    node.statement = 'Нет подтверждённых данных.'
    node.status = NODE_STATUS.MISSING
  }
  return finishNode(node, viewMode)
}

function bindConstraints(input, viewMode) {
  const node = emptyNode('constraints', 'Ограничения и пробелы')
  const outlook = input.outlook || {}

  if (NATIONAL_CAPACITY_SPLIT?.sourceId) {
    if (requestedScope(input) === SCOPE.NATIONAL) {
      const splitNew = officialMetric({
        id: 'national-capacity-new',
        label: 'Новые объекты угольной генерации (формулировка Нацпроекта)',
        value: NATIONAL_CAPACITY_SPLIT.newGw,
        unit: 'ГВт',
        sourceId: NATIONAL_CAPACITY_SPLIT.sourceId,
        measureKind: MEASURE_KIND.CAPACITY,
        periodKind: PERIOD_KIND.HORIZON,
        scope: SCOPE.NATIONAL,
        note: NATIONAL_CAPACITY_SPLIT.note,
      })
      const splitMod = officialMetric({
        id: 'national-capacity-modernize',
        label: 'Модернизация действующих (формулировка Нацпроекта)',
        value: NATIONAL_CAPACITY_SPLIT.modernizeGw,
        unit: 'ГВт',
        sourceId: NATIONAL_CAPACITY_SPLIT.sourceId,
        measureKind: MEASURE_KIND.CAPACITY,
        periodKind: PERIOD_KIND.HORIZON,
        scope: SCOPE.NATIONAL,
        note: NATIONAL_CAPACITY_SPLIT.note,
      })
      node.officialMetrics.push(splitNew, splitMod)
      node.limitations.push('Разбивка 5,3 / 2,5 ГВт — официальная формулировка Нацпроекта, не прогноз выработки и не добыча разреза.')
    } else {
      node.limitations.push(
        'Национальная разбивка 5,3 / 2,5 ГВт не является ограничением региона или разреза.',
      )
    }
  }

  if (outlook.producerCase?.unpublishedGeography) {
    node.limitations.push('География сбыта по кейсу производителя в опубликованных материалах не раскрыта.')
  }
  if (Array.isArray(outlook.warnings)) {
    for (const warning of outlook.warnings) {
      if (warning) node.limitations.push(String(warning))
    }
  }

  node.assumptions.push(
    assumptionEntry({
      id: 'no-causal-arrows',
      text: 'Рост генерации не трактуется как причина роста добычи Богатырь без явной публикации такой связи.',
    }),
  )

  if (viewMode === VIEW_MODE.CONSTRAINTS) {
    node.statement = node.limitations.length
      ? 'Контур ограничений собран из опубликованных методических и инфраструктурных оговорок; значения официальных показателей не масштабируются.'
      : 'Отдельные опубликованные ограничения в текущем наборе не выделены.'
  } else {
    node.statement = 'Ограничения зафиксированы как методический контур и не меняют официальные значения.'
  }
  node.status = node.officialMetrics.length || node.limitations.length ? NODE_STATUS.READY : NODE_STATUS.MISSING
  return finishNode(node, viewMode)
}

const NODE_BINDERS = {
  production: bindProduction,
  energyDemand: bindEnergyDemand,
  exports: bindExports,
  railLogistics: bindRail,
  constraints: bindConstraints,
}

export function bindAnalyticalNode(nodeId, input) {
  const viewMode = normalizeViewMode(input?.viewMode)
  const binder = NODE_BINDERS[nodeId]
  if (!binder) return emptyNode(nodeId, nodeId)
  return binder(input, viewMode)
}

export function buildScenarioConclusion(nodes, input = {}) {
  const viewMode = normalizeViewMode(input.viewMode)
  const supported = []
  const unsupported = []
  const limitations = []

  for (const node of nodes || []) {
    if (node.statement && node.status !== NODE_STATUS.MISSING && node.status !== NODE_STATUS.UNSUPPORTED_SCOPE) {
      supported.push({ nodeId: node.id, text: node.statement })
    }
    if (node.status === NODE_STATUS.MISSING) {
      unsupported.push({ nodeId: node.id, text: node.statement || 'Нет подтверждённых данных.' })
    }
    if (node.status === NODE_STATUS.UNSUPPORTED_SCOPE) {
      unsupported.push({ nodeId: node.id, text: node.statement })
    }
    for (const item of node.limitations || []) limitations.push({ nodeId: node.id, text: item })
    for (const model of node.modelMetrics || []) {
      if (model.comparability && !model.comparability.comparable && model.value == null) {
        unsupported.push({ nodeId: node.id, text: model.explanation || model.comparability.reason })
      }
    }
  }

  const uniqueUnsupported = []
  const seenU = new Set()
  for (const item of unsupported) {
    if (seenU.has(item.text)) continue
    seenU.add(item.text)
    uniqueUnsupported.push(item)
  }

  return {
    viewMode,
    viewModeLabel: VIEW_MODE_LABEL[viewMode],
    supported: supported.slice(0, 5),
    unsupported: uniqueUnsupported.slice(0, 5),
    limitations: limitations.slice(0, 8),
  }
}

/**
 * Bind verified project payloads into the Coal Intelligence node model.
 * Does not fetch data and does not mutate official values by viewMode.
 */
export function bindScenario(input = {}) {
  const viewMode = normalizeViewMode(input.viewMode)
  const nodes = ANALYTICAL_NODES.map((id) => bindAnalyticalNode(id, { ...input, viewMode }))
  return {
    viewMode,
    viewModeLabel: VIEW_MODE_LABEL[viewMode],
    slice: {
      regionId: input.regionId || 'all',
      assetId: input.assetId || null,
      companyId: input.companyId || null,
      horizon: horizonOf(input),
      requestedScope: requestedScope(input),
    },
    readingSequence: ANALYTICAL_NODES,
    readingSequenceNote: READING_SEQUENCE_NOTE,
    nodes,
    conclusion: buildScenarioConclusion(nodes, { viewMode }),
  }
}

export function assertOfficialTraceability(metrics) {
  return (metrics || []).every((item) => item.evidenceClass !== 'official' || Boolean(item.sourceId))
}

export function assertModelTransparency(metrics) {
  return (metrics || []).every(
    (item) =>
      item.evidenceClass !== 'model' ||
      (Boolean(item.formula) && Array.isArray(item.operands) && item.operands.length > 0 && Boolean(item.comparability)),
  )
}
