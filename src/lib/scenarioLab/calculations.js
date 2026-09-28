import { MEASURE_KIND, PERIOD_KIND, SCOPE, finiteNumber, normalizeUnit } from '../scenarioEvidence.js'
import {
  CALCULATION_ID,
  assertTonnagePair,
  inheritUncertainty,
  modelResult,
  officialSnapshot,
  rejectExportBaseline,
  requireOfficialOperand,
  sameProducerEntity,
  sameScope,
} from './evidence.js'
import { validateDemandShare, validateExpansionKind, validateExportDelta, EXPANSION_KIND } from './assumptions.js'

const CAPACITY_LIMITATION =
  'Разность именованной мощности и факта добычи. Это не доступная резервная мощность, не технический headroom, не эксплуатационный предел и не юридический лимит. Если факт выше мощности — это не нарушение и не ошибка ряда.'

function fail(error) {
  return { ok: false, error, result: null }
}

function calcComparability(comparable, status, reason) {
  return { comparable, status, reason }
}

export function calculateM1(officialDemand, shareRaw) {
  const share = validateDemandShare(shareRaw)
  if (!share.ok) return fail(share.error)
  const demand = requireOfficialOperand(officialDemand, 'O_20')
  if (!demand.ok) return fail(demand.error)
  const o = demand.operand
  if (o.scope === SCOPE.REGIONAL || o.scope === SCOPE.COMPANY || o.scope === SCOPE.ASSET) {
    return fail({
      code: 'DEMAND_SCOPE',
      message: 'Ориентир дополнительного спроса L0 — национальный программный маркер. Региональный/корпоративный спрос не подставляется.',
    })
  }
  const s = share.assumption.value
  const uncertainty = inheritUncertainty(o)
  const value = o.value * s
  return {
    ok: true,
    error: null,
    result: modelResult({
      calculationId: CALCULATION_ID.M1,
      id: 'M1',
      label: 'Модельный дополнительный объём при пользовательской доле',
      value,
      unit: o.unit,
      qualifier: uncertainty.qualifier,
      approx: uncertainty.approx,
      formula: 'Q_inc = O_20 × s',
      operands: [officialSnapshot(o, 'O_20'), share.assumption],
      scope: o.scope,
      year: o.year,
      periodKind: o.periodKind || PERIOD_KIND.HORIZON,
      interpretation:
        'Контрфактическое распределение пользовательской доли от опубликованного ориентира дополнительного спроса. Не доля рынка, не контракт, не официальное закрепление за производителем или регионом.',
      limitations: [
        'Не означает, что выбранный производитель получит этот объём.',
        'Не отождествляет национальный ориентир ≈20 млн т с спросом Павлодара.',
        'Не является прогнозом.',
      ],
      comparability: calcComparability(true, 'MODEL_IDENTITY', 'Произведение официального ориентира и доли-допущения.'),
    }),
  }
}

function producerPair(planOrTarget, actual, role, options = {}) {
  const left = requireOfficialOperand(planOrTarget, role)
  if (!left.ok) return fail(left.error)
  const right = requireOfficialOperand(actual, 'actual')
  if (!right.ok) return fail(right.error)
  const a = left.operand
  const b = right.operand
  if (!sameProducerEntity(a, b)) {
    return fail({
      code: 'ENTITY_MISMATCH',
      message: 'Расчёт только внутри одного производителя/актива. Национальный ряд не наследуется на компанию или актив.',
    })
  }
  if (!sameScope(a, b)) {
    return fail({
      code: 'SCOPE_MISMATCH',
      message: 'Охват операндов не совпадает. Национальный показатель не сравнивается с корпоративным как один ряд.',
    })
  }
  if (options.allowDistinctTonneLabels) {
    const tonnesA = normalizeUnit(a.unit).includes('т')
    const tonnesB = normalizeUnit(b.unit).includes('т')
    if (!tonnesA || !tonnesB) {
      return fail({ code: 'UNIT_MISMATCH', role, message: 'Расчёт доступен только для сопоставимых угольных тонн.' })
    }
  } else {
    const units = assertTonnagePair(a, b, role)
    if (!units.ok) return fail(units.error)
  }
  if (b.measureKind !== MEASURE_KIND.ACTUAL) {
    return fail({ code: 'ACTUAL_REQUIRED', message: 'Второй операнд должен быть фактом (actual).' })
  }
  if (b.periodKind === PERIOD_KIND.YTD) {
    return fail({ code: 'YTD_REJECTED', message: 'YTD-факт не вычитается из годового плана/цели.' })
  }
  return {
    ok: true,
    left: a,
    right: b,
    unitLabelMismatch: normalizeUnit(a.unit) !== normalizeUnit(b.unit),
  }
}

export function calculateM2(officialPlan, officialActual) {
  const pair = producerPair(officialPlan, officialActual, 'plan')
  if (!pair.ok) return pair
  if (pair.left.measureKind !== MEASURE_KIND.PLAN) {
    return fail({ code: 'PLAN_REQUIRED', message: 'M2 требует официальный план (plan), не цель и не мощность.' })
  }
  const value = pair.left.value - pair.right.value
  return {
    ok: true,
    error: null,
    result: modelResult({
      calculationId: CALCULATION_ID.M2,
      id: 'M2',
      label: 'Шаг плана относительно факта',
      value,
      unit: pair.left.unit,
      formula: 'Δ_plan = plan(Yp) − actual(Ya)',
      operands: [officialSnapshot(pair.left, 'plan'), officialSnapshot(pair.right, 'actual')],
      scope: pair.left.scope,
      year: pair.left.year,
      periodKind: PERIOD_KIND.FY,
      interpretation: `Опубликованный план ${pair.left.year} относительно опубликованного факта ${pair.right.year}. Не выполнение плана года ${pair.left.year} и не прогноз снижения или роста.`,
      limitations: [
        `Годы обоих операндов обязательны: план ${pair.left.year}, факт ${pair.right.year}.`,
        'Отсутствие факта года плана не означает срыв плана.',
      ],
      comparability: calcComparability(true, 'PREVIOUS_PERIOD', 'План и факт разных лет одного производителя.'),
    }),
  }
}

export function calculateM3(officialTarget, officialActual) {
  const pair = producerPair(officialTarget, officialActual, 'target', { allowDistinctTonneLabels: true })
  if (!pair.ok) return pair
  if (pair.left.measureKind !== MEASURE_KIND.TARGET) {
    return fail({ code: 'TARGET_REQUIRED', message: 'M3 требует официальную цель (target).' })
  }
  const value = pair.left.value - pair.right.value
  const limitations = ['Не гарантирует расширение добычи и не задаёт линейный путь.']
  if (pair.unitLabelMismatch) {
    limitations.push(
      'Подписи единиц цели и факта различны в публикациях («млн т» vs «млн т в год»). Разность считается как опубликованные тоннажные величины, не как доказанная тождественность единиц.',
    )
  }
  return {
    ok: true,
    error: null,
    result: modelResult({
      calculationId: CALCULATION_ID.M3,
      id: 'M3',
      label: 'Разность цели и выбранного факта',
      value,
      unit: pair.left.unit,
      formula: 'Δ_target = target(Yt) − actual(Ya)',
      operands: [officialSnapshot(pair.left, 'target'), officialSnapshot(pair.right, 'actual')],
      scope: pair.left.scope,
      year: pair.left.year,
      periodKind: PERIOD_KIND.FY,
      interpretation: `Разность опубликованной цели ${pair.left.year} и выбранного факта ${pair.right.year}. Не траектория, не CAGR и не спрос рынка.`,
      limitations,
      comparability: calcComparability(true, 'PREVIOUS_PERIOD', 'Цель и факт одного производителя, разные годы.'),
    }),
  }
}

export function calculateM4(officialCapacity, officialActual) {
  const cap = requireOfficialOperand(officialCapacity, 'capacity')
  if (!cap.ok) return fail(cap.error)
  const act = requireOfficialOperand(officialActual, 'actual')
  if (!act.ok) return fail(act.error)
  const a = cap.operand
  const b = act.operand
  if (a.measureKind !== MEASURE_KIND.CAPACITY) {
    return fail({ code: 'CAPACITY_REQUIRED', message: 'M4 требует именованную мощность (capacity).' })
  }
  if (b.measureKind !== MEASURE_KIND.ACTUAL) {
    return fail({ code: 'ACTUAL_REQUIRED', message: 'M4 требует факт добычи (actual).' })
  }
  if (!sameProducerEntity(a, b) || !sameScope(a, b)) {
    return fail({
      code: 'ENTITY_MISMATCH',
      message: 'Мощность и факт должны относиться к одному производителю/активу. Национальная мощность не наследуется.',
    })
  }
  const tonnesA = normalizeUnit(a.unit).includes('т')
  const tonnesB = normalizeUnit(b.unit).includes('т')
  if (!tonnesA || !tonnesB) {
    return fail({ code: 'UNIT_MISMATCH', message: 'M4 требует угольные тонны у обоих операндов.' })
  }
  const value = a.value - b.value
  return {
    ok: true,
    error: null,
    result: modelResult({
      calculationId: CALCULATION_ID.M4,
      id: 'M4',
      label: 'Разность именованной мощности и факта',
      value,
      unit: a.unit,
      formula: 'H = named_capacity − actual(Ya)',
      operands: [officialSnapshot(a, 'capacity'), officialSnapshot(b, 'actual')],
      scope: a.scope,
      year: b.year,
      periodKind: PERIOD_KIND.FY,
      interpretation:
        'Числовая разность опубликованной именованной мощности и опубликованного факта. Семантически это не «доступная мощность».',
      limitations: [
        CAPACITY_LIMITATION,
        'Единицы «млн т» и «млн т в год» здесь сопоставляются только как опубликованные тоннажные величины разных понятий, не как доказанная сопоставимость рядов.',
      ],
      comparability: calcComparability(
        false,
        'NON_COMPARABLE',
        'Мощность и добыча — разные понятия; разность публикуется только как справочная MODEL-величина.',
      ),
    }),
  }
}

export function calculateM5(officialDemand, expansionStart, expansionEnd, expansionKindRaw) {
  const kind = validateExpansionKind(expansionKindRaw)
  if (!kind.ok) return fail(kind.error)
  const demand = requireOfficialOperand(officialDemand, 'O_20')
  if (!demand.ok) return fail(demand.error)
  const o = demand.operand
  if (finiteNumber(o.value) === 0) {
    return fail({ code: 'DIVIDE_BY_ZERO', message: 'Ориентир спроса равен нулю — отношение не считается.' })
  }
  const start = requireOfficialOperand(expansionStart, 'expansionStart')
  if (!start.ok) return fail(start.error)
  const end = requireOfficialOperand(expansionEnd, 'expansionEnd')
  if (!end.ok) return fail(end.error)
  if (!sameProducerEntity(start.operand, end.operand) || !sameScope(start.operand, end.operand)) {
    return fail({
      code: 'ENTITY_MISMATCH',
      message: 'Δ производителя только внутри одной сущности. Национальный спрос не становится региональным рядом.',
    })
  }
  const units = assertTonnagePair(start.operand, end.operand, 'expansion')
  if (!units.ok) return fail(units.error)
  if (kind.assumption.value === EXPANSION_KIND.PLAN_STEP && end.operand.measureKind !== MEASURE_KIND.PLAN) {
    return fail({ code: 'PLAN_REQUIRED', message: 'Для planStep конечный операнд должен быть планом.' })
  }
  if (kind.assumption.value === EXPANSION_KIND.TARGET_GAP && end.operand.measureKind !== MEASURE_KIND.TARGET) {
    return fail({ code: 'TARGET_REQUIRED', message: 'Для targetGap конечный операнд должен быть целью.' })
  }
  const delta = end.operand.value - start.operand.value
  const r = delta / o.value
  const demandYear = o.year
  const producerYears = [start.operand.year, end.operand.year].filter((y) => y != null)
  const mismatch = producerYears.some((y) => y !== demandYear)
  return {
    ok: true,
    error: null,
    result: modelResult({
      calculationId: CALCULATION_ID.M5,
      id: 'M5',
      label: 'Относительная величина Δ производителя к ориентиру спроса 2030',
      value: r,
      unit: 'ratio',
      formula: 'r = (producer_end − producer_start) / O_20',
      operands: [
        officialSnapshot(o, 'O_20'),
        officialSnapshot(start.operand, 'expansionStart'),
        officialSnapshot(end.operand, 'expansionEnd'),
        kind.assumption,
      ],
      scope: start.operand.scope,
      year: demandYear,
      periodKind: PERIOD_KIND.HORIZON,
      interpretation:
        'Отношение выбранного шага производителя к опубликованному ориентиру дополнительного спроса. Не доля спроса, не coverage и не market share.',
      limitations: [
        'Не означает, что производитель поставляет эту долю спроса.',
        mismatch
          ? `Несовпадение горизонтов: годы производителя ${producerYears.join(' / ')}, ориентир спроса ${demandYear}.`
          : 'Горизонты совпадают.',
      ],
      horizonMismatch: mismatch
        ? {
            present: true,
            demandYear,
            producerAnchorYears: producerYears,
            warning: `Ориентир спроса относится к ${demandYear}; якоря производителя: ${producerYears.join(', ')}.`,
          }
        : { present: false, demandYear, producerAnchorYears: producerYears },
      comparability: calcComparability(false, 'NON_COMPARABLE', 'Разные горизонты и контуры; отношение только контекстное.'),
    }),
  }
}

export function calculateM6(officialExportFy, deltaRaw) {
  const delta = validateExportDelta(deltaRaw)
  if (!delta.ok) return fail(delta.error)
  const exp = requireOfficialOperand(officialExportFy, 'V_FY')
  if (!exp.ok) return fail(exp.error)
  const rejected = rejectExportBaseline(exp.operand)
  if (rejected) return fail(rejected)
  const d = delta.assumption.value
  const value = exp.operand.value * (1 + d)
  if (value < 0) {
    return fail({ code: 'NEGATIVE_VOLUME', message: 'Сценарий дал бы отрицательный объём экспорта.' })
  }
  return {
    ok: true,
    error: null,
    result: modelResult({
      calculationId: CALCULATION_ID.M6,
      id: 'M6',
      label: 'Национальный экспорт HS 2701 при пользовательской Δ',
      value,
      unit: exp.operand.unit,
      formula: 'V_scenario = V_FY × (1 + deltaPercent)',
      operands: [officialSnapshot(exp.operand, 'V_FY'), delta.assumption],
      scope: exp.operand.scope,
      year: exp.operand.year,
      periodKind: PERIOD_KIND.FY,
      interpretation: `Сценарий объёма национального экспорта HS 2701 за полный год ${exp.operand.year} при пользовательской Δ. Не экспорт региона и не экспорт производителя.`,
      limitations: [
        'Базис — полный год HS 2701, национальный торговый контур.',
        'YTD не годизируется.',
        'Ряд Минэнерго (млн т) не используется как базис.',
      ],
      comparability: calcComparability(true, 'MODEL_IDENTITY', 'Масштабирование официального FY-объёма.'),
    }),
  }
}

export const CALCULATORS = Object.freeze({
  [CALCULATION_ID.M1]: calculateM1,
  [CALCULATION_ID.M2]: calculateM2,
  [CALCULATION_ID.M3]: calculateM3,
  [CALCULATION_ID.M4]: calculateM4,
  [CALCULATION_ID.M5]: calculateM5,
  [CALCULATION_ID.M6]: calculateM6,
})
