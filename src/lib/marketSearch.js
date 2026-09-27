import { coalAssets, energyRole, getSource, investments, kpis, regions, reserveAccounts } from '../data/catalog'
import { countryNameRu } from '../data/exportCountries'
import { sourceList } from '../data/sources'
import { formatNumber, formatTonnes } from './format'
import { buildMetricTrace } from './metricTraceability'

export const TYPE_LABELS = {
  metric: 'Показатель',
  company: 'Компания',
  region: 'Регион',
  export: 'Экспортное направление',
  source: 'Источник',
  section: 'Раздел',
}

export const TYPE_ORDER = ['metric', 'company', 'region', 'export', 'source', 'section']

export const ANALYTICAL_SECTIONS = [
  {
    id: 'section-overview',
    code: '01',
    title: 'Обзор рынка',
    route: '/',
    keywords: ['обзор', 'рынок', 'главная', 'итоги'],
  },
  {
    id: 'section-energy-role',
    code: '02',
    title: 'Роль угля в энергетике',
    route: '/energy-role',
    keywords: ['энергетика', 'тэб', 'доля угля', 'потребление энергии'],
  },
  {
    id: 'section-resources',
    code: '03',
    title: 'Ресурсная база',
    route: '/resources',
    keywords: ['запасы', 'ресурсная база', 'минеральные ресурсы'],
  },
  {
    id: 'section-production',
    code: '04',
    title: 'Объёмы и баланс',
    route: '/production',
    keywords: ['добыча', 'объёмы', 'баланс', 'бнс', 'минэнерго'],
  },
  {
    id: 'section-geography',
    code: '05',
    title: 'География и структура добычи',
    route: '/geography',
    keywords: ['география', 'регионы', 'области', 'карта'],
  },
  {
    id: 'section-outlook',
    code: '06',
    title: 'Перспективы и развитие',
    route: '/outlook',
    keywords: ['перспективы', 'план', '2026', 'инвестиции', 'развитие'],
  },
  {
    id: 'section-concentration',
    code: '07',
    title: 'Концентрация рынка',
    route: '/concentration',
    keywords: ['концентрация', 'доли', 'азрк', 'конкуренция'],
  },
  {
    id: 'section-dynamics',
    code: '08',
    title: 'Динамика цен',
    route: '/dynamics',
    keywords: ['цены', 'динамика цен', 'оптовые цены', 'азрк'],
  },
  {
    id: 'section-retail',
    code: '09',
    title: 'Розничные цены',
    route: '/retail',
    keywords: ['цены', 'розничные цены', 'розница', 'астана'],
  },
  {
    id: 'section-sources',
    code: '10',
    title: 'Источники данных',
    route: '/sources',
    keywords: ['источники', 'публикации', 'первоисточник'],
  },
  {
    id: 'section-companies',
    code: '11',
    title: 'Компании и добыча',
    route: '/companies',
    keywords: ['компании', 'предприятия', 'недропользователи', 'добыча'],
  },
  {
    id: 'section-exports',
    code: '12',
    title: 'Экспорт и внешние рынки',
    route: '/exports',
    keywords: ['экспорт', 'внешние рынки', 'comtrade', 'направления'],
  },
  {
    id: 'section-constraints',
    code: '13',
    title: 'Ограничения и задачи',
    route: '/constraints',
    keywords: ['ограничения', 'задачи', 'логистика', 'инфраструктура'],
  },
]

export const QUICK_ACCESS_IDS = [
  'section-overview',
  'section-production',
  'section-outlook',
  'section-exports',
  'section-sources',
]

const SEARCH_TITLES = {
  production2025: 'Добыча угля — Минэнерго',
  bnsIndustrial2025: 'Добыча угля — данные БНС',
  export2025: 'Экспорт угля',
  'export-hs-fy2025-volume': 'Экспорт каменного угля',
}

const COMPANY_CODE_BY_ASSET = {
  'bogatyr-company': 'bogatyr-komir',
  'shubarkol-company': 'shubarkol-komir',
}

function present(value) {
  if (value == null) return null
  if (typeof value === 'number' && !Number.isFinite(value)) return null
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return null
    return text
  }
  return value
}

function compact(item) {
  const next = {}
  for (const [key, value] of Object.entries(item)) {
    if (value == null) continue
    if (typeof value === 'string' && !value.trim()) continue
    if (Array.isArray(value) && value.length === 0) continue
    next[key] = value
  }
  return next
}

export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeDecimalKey(value) {
  const raw = String(value ?? '')
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/,/g, '.')
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null
  const negative = raw.startsWith('-')
  const unsigned = negative ? raw.slice(1) : raw
  const [intRaw, fracRaw] = unsigned.split('.')
  const intPart = intRaw.replace(/^0+(?=\d)/, '') || '0'
  const frac = fracRaw ? fracRaw.replace(/0+$/, '') : ''
  const key = frac ? `${intPart}.${frac}` : intPart
  return negative ? `-${key}` : key
}

function asFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const key = normalizeDecimalKey(value)
    if (!key) return null
    const n = Number(key)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function numericKeysFromMetric(metric, valueText) {
  const keys = new Set()
  const fromValue = asFiniteNumber(metric?.value)
  if (fromValue != null) {
    keys.add(normalizeDecimalKey(fromValue))
    keys.add(normalizeDecimalKey(String(fromValue)))
    keys.add(normalizeDecimalKey(formatNumber(fromValue)))
  }
  for (const candidate of [metric?.display, metric?.altDisplay, valueText, metric?.value]) {
    const key = normalizeDecimalKey(candidate)
    if (key) keys.add(key)
  }
  return [...keys].filter(Boolean)
}

function isIntegerQuery(query) {
  return /^-?\d+$/.test(String(query || '').replace(/[\s\u00a0\u202f]/g, ''))
}

function numericMatchRank(item, query) {
  const qKey = normalizeDecimalKey(query)
  if (!qKey) return null
  const keys = item.numericKeys || numericKeysFromMetric({ value: item.valueNumeric, display: item.value }, item.value)
  if (keys.includes(qKey)) return 90
  if (!isIntegerQuery(query)) return null
  if (qKey.length === 1) return keys.includes(qKey) ? 90 : null
  if (keys.some((key) => key.split('.')[0] === qKey)) return 55
  return null
}

function tokensOf(text) {
  return normalizeSearchText(text)
    .split(/[\s,.;:()/+·—–-]+/)
    .filter((part) => part.length > 1 || /^\d/.test(part))
}

function metricKeywords(metric, extras, title, sourceName, valueText) {
  const source = getSource(extras.sourceId || metric.sourceId)
  const org = source?.organization || sourceName
  return [
    metric.label,
    metric.title,
    title,
    extras?.label,
    metric.note,
    metric.unit,
    extras?.unit,
    metric.period,
    extras?.period,
    valueText,
    metric.display,
    String(metric.value ?? ''),
    sourceName,
    org,
    ...sourceAliases(org),
    'показатель',
  ].filter(Boolean)
}

function metricSearchItem(metric, extras = {}) {
  const numericValue = asFiniteNumber(metric?.value)
  if (!metric || numericValue == null) return null
  const trace = buildMetricTrace({ ...metric, value: numericValue }, extras)
  const title = present(SEARCH_TITLES[metric.id]) || present(trace?.title) || present(metric.label) || present(metric.title)
  const sourceName = present(trace?.publisher)
  const subtitle = present(sourceName ? `По данным ${sourceName}` : metric.note)
  const valueText =
    present(trace?.display) ||
    present(metric.display) ||
    formatNumber(numericValue)
  return compact({
    id: `metric:${metric.id}`,
    type: 'metric',
    title,
    subtitle,
    keywords: metricKeywords(metric, extras, title, sourceName, valueText),
    value: valueText,
    valueNumeric: numericValue,
    numericKeys: numericKeysFromMetric({ ...metric, value: numericValue }, valueText),
    unit: present(trace?.unit || metric.unit),
    period: present(trace?.period || metric.period),
    route: present(extras.route || trace?.route),
    source: sourceName,
    sourceUrl: present(trace?.sourceUrl),
    traceMetric: { ...metric, value: numericValue },
    traceExtras: extras,
  })
}

function sectionItems() {
  return ANALYTICAL_SECTIONS.map((item) =>
    compact({
      id: item.id,
      type: 'section',
      title: `${item.code} ${item.title}`,
      subtitle: 'Аналитический раздел',
      keywords: [item.title, item.code, ...(item.keywords || [])],
      route: item.route,
    }),
  )
}

function regionItems() {
  return regions
    .filter((item) => item.id !== 'all')
    .map((item) =>
      compact({
        id: `region:${item.id}`,
        type: 'region',
        title: item.name,
        subtitle: 'Регион Казахстана',
        keywords: [item.name, 'область', 'регион', 'география'],
        route: '/geography',
        regionId: item.id,
      }),
    )
}

function sourceAliases(organization) {
  const name = normalizeSearchText(organization)
  const aliases = ['источник']
  if (name.includes('бюро национальной статистики')) aliases.push('бнс', 'статистика')
  if (name.includes('министерство энергетики')) aliases.push('минэнерго')
  if (name.includes('защите и развитию конкуренции')) aliases.push('азрк')
  if (name.includes('comtrade') || name.includes('united nations')) aliases.push('un', 'comtrade')
  return aliases
}

function sourceItems() {
  return sourceList.map((item) =>
    compact({
      id: `source:${item.id}`,
      type: 'source',
      title: present(item.organization),
      subtitle: present(item.publication),
      keywords: [
        item.organization,
        item.publication,
        item.period,
        ...(item.indicators || []),
        item.sourceStatus,
        ...sourceAliases(item.organization),
      ],
      route: '/sources',
      source: present(item.organization),
      sourceUrl: present(item.url),
      sourceId: item.id,
    }),
  )
}

const OPERATOR_COMPANY_CODES = {
  'богатырь комир': 'bogatyr-komir',
  'шубарколь комир': 'shubarkol-komir',
  каражыра: 'karazhyra',
  'майкубен-вест': 'maikuben-west',
}

function catalogCompanyItems() {
  const byKey = new Map()
  for (const asset of coalAssets) {
    const match = String(asset.operator || '').match(/((?:ТОО|АО)\s+«[^»]+»)/)
    if (!match) continue
    const full = match[1]
    const short = full.replace(/^ТОО\s+«|АО\s+«|»$/g, '')
    const key = normalizeSearchText(short)
    if (byKey.has(key)) continue
    byKey.set(
      key,
      compact({
        id: `company:${key}`,
        type: 'company',
        title: short,
        subtitle: 'Компания',
        keywords: [full, short, 'компания', 'добыча', 'мощности', 'планы'],
        route: '/companies',
        companyCode: OPERATOR_COMPANY_CODES[key] || COMPANY_CODE_BY_ASSET[asset.id] || null,
        hint: 'Добыча · мощности · планы',
      }),
    )
  }
  return [...byKey.values()]
}

function metricMetadataSearchItem(metric, extras = {}) {
  if (!metric?.id) return null
  const title = present(SEARCH_TITLES[metric.id]) || present(metric.label) || present(metric.title)
  const source = getSource(extras.sourceId || metric.sourceId)
  const sourceName = present(source?.organization)
  const meta = { ...metric, value: undefined, display: undefined, altDisplay: undefined }
  return compact({
    id: `metric:${metric.id}`,
    type: 'metric',
    title,
    subtitle: present(sourceName ? `По данным ${sourceName}` : metric.note),
    keywords: metricKeywords(meta, extras, title, sourceName, null),
    route: present(extras.route),
    source: sourceName,
    sourceUrl: present(source?.url),
  })
}

function catalogMetricItems() {
  const extrasById = {
    production2025: { route: '/production' },
    export2025: { route: '/exports' },
    domestic2025: { route: '/production' },
    plan2026: { route: '/outlook', measureKind: 'plan' },
    bnsReserves: { route: '/resources' },
    subsoilUsers: { route: '/companies' },
    invest2025: { route: '/outlook' },
    invest2026: { route: '/outlook', measureKind: 'expected' },
    primaryShare2025: { route: '/energy-role' },
    finalShare2025: { route: '/energy-role' },
    minenergoReserves: { route: '/resources' },
  }
  return [...kpis, ...investments, ...energyRole, ...reserveAccounts.filter((item) => item.id !== 'bnsReservesDetail')]
    .map((metric) => metricMetadataSearchItem(metric, extrasById[metric.id] || {}))
    .filter(Boolean)
}

export function buildStaticSearchIndex() {
  return [
    ...catalogMetricItems(),
    ...catalogCompanyItems(),
    ...regionItems(),
    ...sourceItems(),
    ...sectionItems(),
  ]
}

export function mergeRemoteSearchIndex(staticItems, remote = {}) {
  const byId = new Map(staticItems.map((item) => [item.id, item]))

  if (remote.overview?.kpis) {
    const extrasById = {
      production2025: { route: '/production', related: relatedFromOverview(remote.overview.kpis) },
      export2025: { route: '/exports', related: relatedFromOverview(remote.overview.kpis) },
      domestic2025: { route: '/production' },
      plan2026: { route: '/outlook', measureKind: 'plan' },
      bnsReserves: { route: '/resources' },
      subsoilUsers: { route: '/companies' },
      bnsIndustrial2025: {
        route: '/production',
        profileKey: 'bnsIndustrial',
        label: 'Добыча угля — данные БНС',
        related: relatedFromOverview(remote.overview.kpis),
      },
    }
    for (const metric of remote.overview.kpis) {
      if (metric.origin !== 'supabase' || asFiniteNumber(metric.value) == null) continue
      const item = metricSearchItem(metric, extrasById[metric.id] || { route: '/' })
      if (item) byId.set(item.id, item)
    }
  }

  if (Array.isArray(remote.production?.bnsSeries)) {
    for (const row of remote.production.bnsSeries) {
      const year = row?.year
      const value = asFiniteNumber(row?.value)
      if (year == null || value == null) continue
      const metric = {
        id: year === 2025 ? 'bnsIndustrial2025' : `bns-industry-${year}`,
        label: year === 2025 ? 'Добыча угля — данные БНС' : `Добыча угля — данные БНС, ${year}`,
        value,
        display: formatNumber(value),
        unit: row.unit || 'млн т',
        period: `${year} год`,
        sourceId: row.sourceId,
        note: 'Годовой промышленный статистический ряд. Не является отраслевым итогом Минэнерго.',
        year,
      }
      const item = metricSearchItem(metric, {
        profileKey: 'bnsIndustrial',
        route: '/production',
        label: year === 2025 ? 'Добыча угля — данные БНС' : undefined,
        related: relatedFromOverview(remote.overview?.kpis || []),
      })
      if (item) byId.set(item.id, item)
    }
  }

  const hs2025 = Array.isArray(remote.production?.hsAnnual)
    ? remote.production.hsAnnual.find((item) => item.year === 2025 && item.millionTons != null)
    : null
  if (hs2025) {
    const metric = {
      id: 'export-hs-fy2025-volume',
      value: hs2025.millionTons,
      display: formatNumber(hs2025.millionTons),
      unit: hs2025.volumeUnit || 'млн т',
      period: '2025 год',
      sourceId: hs2025.sourceId || 'unComtradeKazHs2701',
    }
    const item = metricSearchItem(metric, {
      profileKey: 'hsFyVolume',
      route: '/exports',
    })
    if (item) byId.set(item.id, item)
  }

  if (remote.exportTotals?.ok) {
    const fy2025 = remote.exportTotals.items?.find((item) => item.period?.id === 'fy-2025')
    if (fy2025?.netWeightTonnes != null) {
      const tonnes = formatTonnes(fy2025.netWeightTonnes, 3)
      const metric = {
        id: 'export-hs-fy2025-volume',
        value: fy2025.netWeightTonnes / 1e6,
        display: tonnes.text,
        unit: tonnes.unit,
        period: '2025 год',
        sourceId: fy2025.sourceId || 'unComtradeKazHs2701',
      }
      const item = metricSearchItem(metric, {
        profileKey: 'hsFyVolume',
        route: '/exports',
        related: {
          ministryExport:
            fy2025.ministryCoalExportsTonnesMillion != null
              ? { value: fy2025.ministryCoalExportsTonnesMillion, unit: 'млн т' }
              : null,
        },
      })
      if (item) byId.set(item.id, item)
    }
  }

  if (remote.companies?.ok && Array.isArray(remote.companies.items)) {
    for (const key of [...byId.keys()]) {
      if (key.startsWith('company:')) byId.delete(key)
    }
    for (const company of remote.companies.items) {
      const title = present(company.shortName) || present(company.name)
      if (!title) continue
      byId.set(`company:${company.code}`, compact({
        id: `company:${company.code}`,
        type: 'company',
        title,
        subtitle: 'Компания',
        keywords: [company.name, company.shortName, company.notes, 'компания', 'добыча', 'мощности', 'планы'],
        route: '/companies',
        companyCode: company.code,
        hint: 'Добыча · мощности · планы',
      }))
    }
  }

  if (remote.exportPartners?.ok && Array.isArray(remote.exportPartners.partners)) {
    for (const key of [...byId.keys()]) {
      if (key.startsWith('export:')) byId.delete(key)
    }
    for (const partner of remote.exportPartners.partners) {
      const code = present(partner.partnerCode)
      const title = countryNameRu(code, partner.partnerCountry)
      if (!title) continue
      byId.set(`export:${code || title}`, compact({
        id: `export:${code || title}`,
        type: 'export',
        title,
        subtitle: 'Экспортное направление',
        keywords: [title, partner.partnerCountry, code, 'экспорт', 'направление'],
        route: '/exports',
        partnerCode: code,
      }))
    }
  }

  return [...byId.values()]
}

function relatedFromOverview(kpisList) {
  const pick = (id) => {
    const item = (kpisList || []).find((row) => row.id === id)
    if (!item || item.origin !== 'supabase' || asFiniteNumber(item.value) == null) return null
    return item
  }
  return {
    bns2025: pick('bnsIndustrial2025'),
    ministry2025: pick('production2025'),
  }
}

function rankItem(item, query) {
  const q = normalizeSearchText(query)
  if (!q) return null
  const title = normalizeSearchText(item.title)
  const subtitle = normalizeSearchText(item.subtitle)
  const source = normalizeSearchText(item.source)
  const keywords = (item.keywords || []).map(normalizeSearchText)
  const numericRank = numericMatchRank(item, query)
  if (numericRank != null) return numericRank
  if (title === q) return 100
  if (title.startsWith(q)) return 80
  if (title.includes(q)) return 60
  if (keywords.some((word) => word === q || word.startsWith(q) || word.includes(q))) return 40
  if (subtitle.includes(q) || source.includes(q)) return 20

  const parts = tokensOf(q)
  if (parts.length > 1) {
    const hay = [title, subtitle, source, ...keywords].join(' ')
    if (parts.every((part) => hay.includes(part))) return 35
  }
  return null
}

export function searchMarketIndex(items, query, limit = 24) {
  const q = normalizeSearchText(query)
  if (!q) return []
  return items
    .map((item) => {
      const rank = rankItem(item, query)
      return rank == null ? null : { item, rank }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank
      const typeDelta = TYPE_ORDER.indexOf(a.item.type) - TYPE_ORDER.indexOf(b.item.type)
      if (typeDelta !== 0) return typeDelta
      return String(a.item.title).localeCompare(String(b.item.title), 'ru')
    })
    .slice(0, limit)
    .map((row) => row.item)
}

export function countSearchIndex(items) {
  const counts = { metric: 0, company: 0, region: 0, export: 0, source: 0, section: 0 }
  for (const item of items) {
    if (counts[item.type] != null) counts[item.type] += 1
  }
  return counts
}

export function quickAccessItems(items) {
  return QUICK_ACCESS_IDS.map((id) => items.find((item) => item.id === id)).filter(Boolean)
}
