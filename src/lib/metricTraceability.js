import { getSource } from '../data/catalog'
import {
  geographyKeyFromMetric,
  measureKindFromMetric,
  statusLabel,
  toComparisonItem,
  yearFromMetric,
} from './comparison'
import { formatNumber, formatQualifiedNumber, valueQualifierPrefix } from './format'

const MISSING_COPY = 'Дополнительная информация для этого показателя не опубликована в текущем наборе данных.'

function present(value) {
  if (value == null) return null
  if (typeof value === 'number' && !Number.isFinite(value)) return null
  const text = String(value).trim()
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return null
  return value
}

function relatedVolume(related, key) {
  const item = related?.[key]
  if (!item || typeof item.value !== 'number' || !Number.isFinite(item.value)) return null
  return `${formatNumber(item.value)} ${item.unit || ''}`.trim()
}

export const TRACE_ROUTES = {
  production: { to: '/production', label: 'Объёмы и баланс' },
  exports: { to: '/exports', label: 'Экспорт и внешние рынки' },
  outlook: { to: '/outlook', label: 'Перспективы и развитие' },
  resources: { to: '/resources', label: 'Ресурсная база' },
  companies: { to: '/companies', label: 'Компании и добыча' },
}

const PROFILES = {
  production2025: {
    title: 'Добыча угля',
    meaning: 'Фактический отраслевой объём добычи угля в Казахстане за указанный год.',
    methodology:
      'Отраслевой итог, опубликованный Министерством энергетики. Показатель не заменяет промышленную статистику БНС.',
    limitation: (ctx) => {
      const other = relatedVolume(ctx.related, 'bns2025')
      if (other) {
        return `В мониторинге также есть показатель БНС ${other} за тот же год. Значения рассчитаны по разным методологиям, поэтому разница между ними не означает, что один из источников ошибся.`
      }
      return 'В мониторинге также публикуется промышленная статистика БНС по добыче за тот же год. Показатели рассчитаны по разным методологиям и не заменяют друг друга.'
    },
    route: TRACE_ROUTES.production,
    comparable: true,
    seriesKey: 'minenergo_industry_total',
  },
  bnsIndustrial: {
    title: 'Добыча угля — данные БНС',
    meaning: 'Годовой объём добычи угля по промышленной статистике Бюро национальной статистики.',
    methodology: 'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.',
    limitation: (ctx) => {
      const other = relatedVolume(ctx.related, 'ministry2025')
      if (other) {
        return `В мониторинге также есть отраслевой итог Минэнерго ${other} за 2025 год. Значения рассчитаны по разным методологиям, поэтому разница между ними не означает, что один из источников ошибся.`
      }
      return 'Отраслевой итог Минэнерго за тот же год публикуется отдельно. Показатели рассчитаны по разным методологиям и не заменяют друг друга.'
    },
    route: TRACE_ROUTES.production,
    comparable: true,
    seriesKey: 'bns_industry_annual',
  },
  export2025: {
    title: 'Экспорт',
    meaning: 'Объём угля, направленный на экспорт, по сообщению Министерства энергетики.',
    methodology: 'Отраслевой показатель экспорта из официального сообщения Минэнерго. Это не внешнеторговая статистика по товарной группе.',
    limitation: (ctx) => {
      const other = relatedVolume(ctx.related, 'hs2025')
      if (other) {
        return `Отдельно публикуется экспорт каменного угля по внешнеторговой статистике (товарная группа HS 2701): ${other} за полный 2025 год. Это другой способ учёта, а не уточнение отраслевого показателя.`
      }
      return 'Экспорт по внешнеторговой статистике каменного угля (товарная группа HS 2701) публикуется отдельно и не заменяет этот отраслевой показатель.'
    },
    route: TRACE_ROUTES.exports,
    comparable: true,
    seriesKey: 'minenergo_export',
  },
  domestic2025: {
    title: 'Внутреннее направление',
    meaning: 'Объём, направленный на внутреннее потребление и коммунально-бытовые нужды, по формулировке Минэнерго.',
    methodology: 'Показатель из того же отраслевого сообщения, что и добыча и экспорт Минэнерго. Это не расчётный остаток.',
    route: TRACE_ROUTES.production,
    comparable: true,
    seriesKey: 'minenergo_domestic',
  },
  plan2026: {
    title: 'План добычи',
    meaning: 'Плановый объём добычи угля на указанный год по данным Министерства энергетики.',
    methodology: 'Плановый показатель. Не является фактической добычей этого года и не продолжение промышленного ряда БНС.',
    limitation: 'План нельзя читать как уже состоявшийся факт и нельзя складывать с фактической добычей другого года как с одним рядом.',
    route: TRACE_ROUTES.outlook,
    comparable: true,
    seriesKey: 'minenergo_industry_plan',
    measureKind: 'plan',
  },
  bnsReserves: {
    title: 'Запасы угля, статистический учёт БНС',
    meaning: 'Статистический учёт запасов угля в счёте минеральных и энергетических ресурсов БНС.',
    methodology: 'Показатель из статистического учёта запасов. Это не отраслевая оценка Министерства энергетики.',
    limitation: 'Отраслевая оценка запасов Минэнерго публикуется отдельно. Эти величины не складываются и не усредняются.',
    route: TRACE_ROUTES.resources,
    comparable: false,
  },
  subsoilUsers: {
    title: 'Недропользователи, добыча угля',
    meaning: 'Число недропользователей, осуществляющих добычу угля, по данным Министерства энергетики.',
    methodology: 'Количество организаций, а не объём добычи.',
    route: TRACE_ROUTES.companies,
    comparable: false,
  },
  invest2025: {
    title: 'Инвестиции в отрасль',
    meaning: 'Фактический объём инвестиций в угольную отрасль за указанный год по данным Минэнерго.',
    methodology: 'Отраслевой инвестиционный показатель. Не суммируется с инвестиционными программами отдельных предприятий.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
  },
  invest2026: {
    title: 'Ожидаемые инвестиции',
    meaning: 'Ожидаемый объём инвестиций в угольную отрасль на указанный год.',
    methodology: 'Ожидание, а не исполненный факт. В источнике значение может быть указано как ориентир «около».',
    limitation: 'Ожидание нельзя читать как уже состоявшиеся инвестиции.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'expected',
  },
  demand2030: {
    title: 'Дополнительный спрос на энергетический уголь',
    meaning: 'Ориентир дополнительного спроса на энергетический уголь к указанному горизонту.',
    methodology: 'Показатель из официального отраслевого материала о будущем спросе. Это не факт добычи.',
    limitation: 'Ориентир к 2030 году относится к другому материалу и горизонту, чем потребность энергетических проектов к 2032 году. Показатели не складываются и не усредняются.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'target',
  },
  demand2032: {
    title: 'Потребность для новых энергетических проектов',
    meaning: 'Ориентир потребности в угле для новых энергетических проектов к указанному горизонту.',
    methodology: 'Целевой ориентир из официального материала. Это не факт добычи.',
    limitation: 'Показатель относится к другому горизонту, чем дополнительный спрос к 2030 году. Значения не складываются и не усредняются.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'target',
  },
  coalPlots: {
    title: 'Угольные участки',
    meaning: 'Число угольных участков, которые планируется выставить на аукцион.',
    methodology: 'Плановый ориентир расширения сырьевой базы, а не объём уже подтверждённой добычи.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'plan',
  },
  gondolas: {
    title: 'Обеспечение полувагонами',
    meaning: 'Ориентир потребности в обеспечении перевозок полувагонами для будущего спроса.',
    methodology: 'Это показатель пропускной способности и обеспечения перевозок, а не размер существующего парка и не план закупки вагонов.',
    limitation: 'Цифру нельзя читать как уже имеющийся парк полувагонов и нельзя понимать как поручение купить указанное число вагонов.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'target',
  },
  generationCapacity: {
    title: 'Мощности угольной генерации',
    meaning: 'Заявленный объём новых и модернизируемых мощностей угольной генерации.',
    methodology: 'Показатель национальной программы генерации. Это план и целевой ориентир, а не уже введённая мощность.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'target',
  },
  generationNew: {
    title: 'Новые электростанции',
    meaning: 'Число новых электростанций в национальной программе угольной генерации.',
    methodology: 'Счёт объектов программы. Не является объёмом добычи угля.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'plan',
  },
  generationModernize: {
    title: 'Модернизируемые электростанции',
    meaning: 'Число действующих электростанций, предусмотренных к модернизации.',
    methodology: 'Счёт объектов программы. Не является объёмом добычи угля.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'plan',
  },
  bogatyrActual: {
    title: 'Добыча Богатырь Комир',
    meaning: 'Фактическая добыча предприятия за указанный год.',
    methodology: 'Показатель конкретного производителя. Его нельзя подставлять вместо национального итога.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
  },
  bogatyrPlan: {
    title: 'План добычи Богатырь Комир',
    meaning: 'Плановая добыча предприятия на указанный год.',
    methodology: 'План предприятия. Не является фактом и не заменяет национальный план отрасли.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'plan',
  },
  bogatyrTarget: {
    title: 'Целевой показатель Богатырь Комир',
    meaning: 'Целевой ориентир добычи предприятия на указанный горизонт.',
    methodology: 'Целевой показатель программы предприятия, а не факт добычи.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
    measureKind: 'target',
  },
  bogatyrInvestment: {
    title: 'Инвестиционная программа Богатырь Комир',
    meaning: 'Заявленный объём инвестиционной программы предприятия.',
    methodology: 'Корпоративная программа. Не суммируется с отраслевыми инвестициями Минэнерго.',
    route: TRACE_ROUTES.outlook,
    comparable: false,
  },
  hsFyVolume: {
    title: 'Экспорт каменного угля',
    meaning: 'Объём экспорта каменного угля Казахстана по внешнеторговой статистике за полный календарный год. Товарная группа: HS 2701 (каменный уголь).',
    methodology: 'Внешнеторговая статистика по конкретной товарной группе. Это не отраслевой итог экспорта Минэнерго.',
    limitation: (ctx) => {
      const other = relatedVolume(ctx.related, 'ministryExport')
      if (other) {
        return `Отраслевой экспорт Минэнерго за тот же год составляет ${other}. Показатели относятся к разным системам учёта и не заменяют друг друга.`
      }
      return 'Отраслевой экспорт Минэнерго публикуется отдельно и не заменяет внешнеторговую статистику по товарной группе HS 2701.'
    },
    route: TRACE_ROUTES.exports,
    comparable: true,
    seriesKey: 'comtrade_hs2701_annual',
  },
  hsFyValue: {
    title: 'Стоимость экспорта каменного угля',
    meaning: 'Таможенная стоимость экспорта каменного угля за полный календарный год. Товарная группа: HS 2701 (каменный уголь).',
    methodology: 'Стоимостной показатель внешнеторговой статистики, не физический отраслевой объём Минэнерго.',
    route: TRACE_ROUTES.exports,
    comparable: false,
    seriesKey: 'comtrade_hs2701_value',
  },
  hsYtdVolume: {
    title: 'Экспорт каменного угля',
    meaning: 'Объём экспорта каменного угля за неполный год по данным внешнеторговой статистики. Товарная группа: HS 2701 (каменный уголь).',
    methodology: 'Показатель за январь–июль, а не за полный календарный год.',
    limitation: 'Неполный год нельзя сравнивать с полным годом как с одинаковым периодом.',
    route: TRACE_ROUTES.exports,
    comparable: true,
    seriesKey: 'bns_hs2701_ytd_volume',
  },
  hsYtdValue: {
    title: 'Стоимость экспорта каменного угля',
    meaning: 'Стоимость экспорта каменного угля за неполный год. Товарная группа: HS 2701 (каменный уголь).',
    methodology: 'Показатель за январь–июль, а не за полный календарный год.',
    limitation: 'Неполный год нельзя сравнивать с полным годом как с одинаковым периодом.',
    route: TRACE_ROUTES.exports,
    comparable: false,
  },
  derivedYoyVolume: {
    title: 'Изменение объёма экспорта',
    meaning: 'Расчётное изменение физического объёма экспорта каменного угля между двумя сопоставимыми неполными периодами.',
    methodology: 'Расчёт Coal Monitor KZ на основе опубликованных исходных данных. Это не отдельный показатель государственного органа.',
    limitation: 'Сравниваются одинаковые неполные периоды. Расчёт нельзя сопоставлять с полным годом как с тем же типом периода.',
    route: TRACE_ROUTES.exports,
    comparable: false,
    derived: true,
  },
  derivedYoyValue: {
    title: 'Изменение стоимости экспорта',
    meaning: 'Расчётное изменение стоимости экспорта каменного угля между двумя сопоставимыми неполными периодами.',
    methodology: 'Расчёт Coal Monitor KZ на основе опубликованных исходных данных. Это не отдельный показатель государственного органа.',
    limitation: 'Сравниваются одинаковые неполные периоды. Расчёт нельзя сопоставлять с полным годом как с тем же типом периода.',
    route: TRACE_ROUTES.exports,
    comparable: false,
    derived: true,
  },
}

const ID_ALIASES = {
  production2025: 'production2025',
  minenergoExtraction2025: 'production2025',
  bnsIndustrial2025: 'bnsIndustrial',
  'bns-2025': 'bnsIndustrial',
  export2025: 'export2025',
  exportFlow: 'export2025',
  domestic2025: 'domestic2025',
  domesticFlow: 'domestic2025',
  plan2026: 'plan2026',
  bnsReserves: 'bnsReserves',
  bnsReservesDetail: 'bnsReserves',
  subsoilUsers: 'subsoilUsers',
  invest2025: 'invest2025',
  invest2026: 'invest2026',
}

const WATCHLIST_CANONICAL = {
  minenergoExtraction2025: 'production2025',
  exportFlow: 'export2025',
  domesticFlow: 'domestic2025',
  'bns-2025': 'bnsIndustrial2025',
  bnsReservesDetail: 'bnsReserves',
}

export function watchlistMetricKey(metric, extras = {}) {
  const raw = String(extras.id || extras.watchlistKey || metric?.id || '').trim()
  if (!raw || raw === 'undefined' || raw === 'null') return null
  if (WATCHLIST_CANONICAL[raw]) return WATCHLIST_CANONICAL[raw]
  if (raw === 'bns-industry-2025') return 'bnsIndustrial2025'
  return raw.length <= 120 ? raw : null
}

export function resolveTraceProfileKey(metric, extras = {}) {
  if (extras.profileKey && PROFILES[extras.profileKey]) return extras.profileKey
  const id = String(extras.id || metric?.id || '')
  if (ID_ALIASES[id]) return ID_ALIASES[id]
  if (id.startsWith('bns-industry-')) return 'bnsIndustrial'
  return extras.profileKey || null
}

function resolveSourceRecord(sourceId, extras = {}) {
  const remote = extras.sourceRecord || null
  const local = sourceId ? getSource(sourceId) : null
  const picked = remote || local
  if (!picked) return { publisher: extras.publisher || null, publication: extras.publication || null, url: extras.sourceUrl || null }
  return {
    publisher: extras.publisher || picked.organization || null,
    publication: extras.publication || picked.publication || null,
    url: extras.sourceUrl || picked.url || null,
  }
}

function displayValue(metric) {
  if (metric?.value == null || (typeof metric.value === 'number' && !Number.isFinite(metric.value))) return null
  if (metric.display) {
    return `${valueQualifierPrefix(metric.value_qualifier, metric.approx)}${metric.display}`.trim()
  }
  if (typeof metric.value === 'number') {
    return formatQualifiedNumber(metric.value, metric.value_qualifier, metric.approx)
  }
  return String(metric.value)
}

export function buildMetricTrace(metric, extras = {}) {
  if (!metric) return null
  if (typeof metric.value !== 'number' || !Number.isFinite(metric.value)) return null
  const profileKey = resolveTraceProfileKey(metric, extras)
  const profile = profileKey ? PROFILES[profileKey] : null
  const sourceId = extras.sourceId || metric.sourceId || null
  const source = resolveSourceRecord(sourceId, extras)
  const measureKind = extras.measureKind || profile?.measureKind || measureKindFromMetric(metric)
  const year = extras.year ?? yearFromMetric(metric)
  const geographyKey = geographyKeyFromMetric(metric, extras)
  const route = extras.route
    ? { to: extras.route, label: extras.routeLabel || TRACE_ROUTES.production.label }
    : profile?.route || null
  const title = extras.label || profile?.title || metric.label || metric.title || null
  const meaning = extras.meaning || profile?.meaning || metric.note || null
  const methodology =
    extras.methodology ||
    (typeof profile?.methodology === 'string' ? profile.methodology : null) ||
    metric.methodology ||
    metric.note ||
    null
  const limitationRaw = extras.limitation || profile?.limitation
  const limitation =
    typeof limitationRaw === 'function' ? limitationRaw({ metric, related: extras.related }) : limitationRaw || null
  const comparisonExtras = {
    ...(extras.comparison || {}),
    id: extras.id || metric.id,
    sourceId,
    sourceRecord: extras.sourceRecord || null,
    methodology,
    seriesKey: extras.seriesKey || profile?.seriesKey,
    measureKind,
    year,
    label: title,
    route: route?.to || extras.comparison?.route,
  }
  const comparisonItem = toComparisonItem(metric, comparisonExtras)
  const comparable = Boolean(comparisonItem) && (extras.comparable ?? profile?.comparable ?? true)

  return {
    id: extras.id || metric.id || null,
    title: present(title),
    value: typeof metric.value === 'number' && Number.isFinite(metric.value) ? metric.value : null,
    display: displayValue(metric),
    unit: present(metric.unit || extras.unit),
    period: present(extras.period || metric.period || (year != null ? String(year) : null)),
    year: year ?? null,
    geography: present(extras.geography || (geographyKey === 'national' ? 'Казахстан' : metric.geography)),
    status: present(statusLabel(measureKind)),
    measureKind,
    publisher: present(source.publisher),
    publication: present(source.publication),
    methodology: present(methodology),
    meaning: present(meaning),
    limitation: present(limitation),
    sourceUrl: present(source.url),
    sourceId,
    route: route?.to || null,
    routeLabel: route?.label || null,
    derived: Boolean(extras.derived || profile?.derived),
    derivedNote: extras.derived || profile?.derived
      ? present(extras.derivedNote) || 'Расчёт Coal Monitor KZ на основе опубликованных исходных данных'
      : null,
    comparable: Boolean(comparable && comparisonItem),
    comparisonMetric: comparisonItem ? metric : null,
    comparisonExtras: comparisonItem ? comparisonExtras : null,
    emptyCopy: !meaning && !methodology && !source.publisher && !source.publication ? MISSING_COPY : null,
    watchlistKey: watchlistMetricKey(metric, extras),
  }
}

export { MISSING_COPY }
