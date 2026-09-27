import { sources as catalogSources, sourceList } from '../data/sources'
import { AZRK_HHI_NOTE } from '../data/azrkCompetitionStructure'
import { HS2701 } from '../services/coalDataService'
import { coverageMeta, coverageYear, uniqueSorted } from './retailAnalytics'
import { formatNumber } from './format'

const HS2701_COMTRADE_LABEL = `HS${HS2701} / Comtrade`

export const COVERAGE_STATUS = {
  CURRENT_2026: 'CURRENT_2026',
  YTD_2026: 'YTD_2026',
  LATEST_2025: 'LATEST_2025',
  OLDER: 'OLDER',
  PARTIAL_COVERAGE: 'PARTIAL_COVERAGE',
  METHODOLOGY_LIMITATION: 'METHODOLOGY_LIMITATION',
  MISSING: 'MISSING',
  PLAN_2026: 'PLAN_2026',
}

const PERIOD_TYPE_LABEL = {
  fy: 'календарный год',
  ytd: 'неполный год',
  snapshot: 'срез',
  plan: 'план',
  expected: 'ожидание',
  retail_observation: 'розничное наблюдение',
  analysis: 'официальный анализ',
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveSource(sourceId, sourceByCode) {
  if (!sourceId) return null
  const remote = sourceByCode?.[sourceId]
  const local = catalogSources[sourceId]
  if (!remote && !local) return null
  return {
    id: sourceId,
    organization: remote?.organization || local?.organization || null,
    publication: remote?.publication || remote?.title || local?.publication || null,
    url: remote?.url || local?.url || null,
    notes: remote?.notes || local?.notes || null,
  }
}

function displayValue(value, unit) {
  const n = finiteNumber(value)
  if (n == null) return null
  return `${formatNumber(n)}${unit ? ` ${unit}` : ''}`
}

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function coverageLabel(status, extras = {}) {
  if (status === COVERAGE_STATUS.YTD_2026) return extras.ytdLabel || 'частичный период'
  if (status === COVERAGE_STATUS.PARTIAL_COVERAGE) return extras.partialLabel || 'частичное покрытие'
  if (status === COVERAGE_STATUS.PLAN_2026) return extras.planLabel || 'план / ожидание'
  if (status === COVERAGE_STATUS.CURRENT_2026) return extras.currentLabel || 'факт 2026'
  if (status === COVERAGE_STATUS.LATEST_2025) return extras.fyLabel || 'годовой факт'
  if (status === COVERAGE_STATUS.OLDER) return extras.olderLabel || 'последняя публикация старше 2025'
  if (status === COVERAGE_STATUS.MISSING) return 'нет подтверждённых данных'
  return extras.fyLabel || 'доступный контур'
}

function qualityLabel(contour) {
  if (contour.methodologyStatus === COVERAGE_STATUS.METHODOLOGY_LIMITATION) {
    return contour.qualityShort || 'методологические ограничения'
  }
  if (contour.coverageStatus === COVERAGE_STATUS.YTD_2026) {
    return contour.qualityShort || 'данные за часть года нельзя напрямую сравнивать с итогом за полный год'
  }
  if (contour.coverageStatus === COVERAGE_STATUS.PARTIAL_COVERAGE) {
    return contour.qualityShort || 'неполное покрытие'
  }
  if (contour.coverageStatus === COVERAGE_STATUS.PLAN_2026) {
    return contour.qualityShort || 'плановые значения показываются отдельно от фактических результатов'
  }
  if (contour.coverageStatus === COVERAGE_STATUS.OLDER) {
    return contour.qualityShort || 'нет более свежей официальной публикации в контуре'
  }
  return contour.qualityShort || 'ограничения см. карточку'
}

function haystack(contour) {
  const bits = [
    contour.label,
    contour.geography,
    contour.latestPeriod,
    contour.coverageLabel,
    contour.qualityLabel,
    contour.periodType,
    ...(contour.metrics || []),
    ...(contour.limitations || []),
    ...(contour.methodologyNotes || []),
    ...(contour.cannot || []),
    ...(contour.sources || []).flatMap((item) => [item.id, item.organization, item.publication, item.notes]),
  ]
  return normalizeSearch(bits.filter(Boolean).join(' '))
}

function sourceHaystack(item) {
  return normalizeSearch(
    [
      item.organization,
      item.publication,
      item.notes,
      item.period,
      ...(item.indicators || []),
      ...(item.usedIn || []).map((row) => row.label),
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function contourMatchesFilter(contour, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'has2026') return Boolean(contour.has2026Coverage)
  if (filterId === 'older') return !contour.has2026Coverage && (contour.latestYear == null || contour.latestYear <= 2025)
  if (filterId === 'limits') return contour.methodologyStatus === COVERAGE_STATUS.METHODOLOGY_LIMITATION
  if (filterId === 'partial') {
    return (
      contour.coverageStatus === COVERAGE_STATUS.PARTIAL_COVERAGE ||
      contour.coverageStatus === COVERAGE_STATUS.YTD_2026 ||
      contour.coverageStatus === COVERAGE_STATUS.MISSING
    )
  }
  return true
}

export function filterQualityContours(contours, filterId, query) {
  const q = normalizeSearch(query)
  return (contours || []).filter((item) => {
    if (!contourMatchesFilter(item, filterId)) return false
    if (!q) return true
    return item.searchText.includes(q)
  })
}

export function filterSourceCatalog(items, query) {
  const q = normalizeSearch(query)
  if (!q) return items || []
  return (items || []).filter((item) => sourceHaystack(item).includes(q))
}

function finalizeContour(partial) {
  const coverageStatus = partial.coverageStatus || COVERAGE_STATUS.MISSING
  const contour = {
    ...partial,
    periodTypeLabel: PERIOD_TYPE_LABEL[partial.periodType] || partial.periodType || null,
    coverageLabel: coverageLabel(coverageStatus, partial.coverageExtras),
    qualityLabel: qualityLabel({ ...partial, coverageStatus }),
    has2026Coverage: Boolean(partial.has2026Coverage),
    has2026Fact: Boolean(partial.has2026Fact),
    sources: (partial.sources || []).filter(Boolean),
    metrics: (partial.metrics || []).filter(Boolean),
    limitations: (partial.limitations || []).filter(Boolean),
    methodologyNotes: (partial.methodologyNotes || []).filter(Boolean),
    cannot: (partial.cannot || []).filter(Boolean),
    allowed: (partial.allowed || []).filter(Boolean),
  }
  contour.searchText = haystack(contour)
  return contour
}

function attachSources(ids, sourceByCode) {
  return [...new Set((ids || []).filter(Boolean))].map((id) => resolveSource(id, sourceByCode)).filter(Boolean)
}

function buildProductionContour(production, sourceByCode) {
  const ministry = production?.ministryProduction
  const bns2025 = (production?.bnsSeries || []).find((item) => item.year === 2025 && finiteNumber(item.value) != null)
  const bns2024 = (production?.bnsSeries || []).find((item) => item.year === 2024 && finiteNumber(item.value) != null)
  const resourceAccount = production?.resourceAccount
  const plan = production?.plan
  const hasMinistry = finiteNumber(ministry?.value) != null
  const hasBns = finiteNumber(bns2025?.value) != null
  if (!hasMinistry && !hasBns && !plan) return null

  const limitations = [
    hasMinistry && hasBns
      ? 'Отраслевой итог Минэнерго и годовой промышленный ряд БНС за 2025 год — разные статистические контуры.'
      : null,
    resourceAccount && finiteNumber(resourceAccount.value) != null
      ? `Добыча в статистическом счете минеральных ресурсов (${displayValue(resourceAccount.value, resourceAccount.unit)} · ${resourceAccount.period || '2024'}) не является продолжением промышленного годового ряда БНС.`
      : null,
    plan ? 'План 2026 не является фактом 2026.' : null,
  ]

  return finalizeContour({
    id: 'production',
    label: 'Добыча',
    route: '/production',
    routeLabel: 'Открыть объёмы и баланс',
    latestPeriod: hasMinistry || hasBns ? '2025' : plan ? '2026 (план)' : null,
    latestYear: hasMinistry || hasBns ? 2025 : plan ? 2026 : null,
    periodType: hasMinistry || hasBns ? 'fy' : 'plan',
    coverageStatus: hasMinistry || hasBns ? COVERAGE_STATUS.LATEST_2025 : COVERAGE_STATUS.PLAN_2026,
    methodologyStatus: hasMinistry && hasBns ? COVERAGE_STATUS.METHODOLOGY_LIMITATION : null,
    has2026Fact: false,
    has2026Coverage: Boolean(plan && !(hasMinistry || hasBns)),
    geography: 'Казахстан (национальный контур); региональная структура — отдельный контур',
    qualityShort: hasMinistry && hasBns ? 'несколько статистических контуров' : 'годовой факт',
    coverageExtras: { fyLabel: 'годовой факт' },
    metrics: [
      hasMinistry ? `Минэнерго, факт 2025: ${displayValue(ministry.value, ministry.unit || 'млн т')}` : null,
      hasBns ? `БНС, промышленный ряд 2025: ${displayValue(bns2025.value, bns2025.unit || 'млн т')}` : null,
      bns2024 ? `БНС, промышленный ряд 2024: ${displayValue(bns2024.value, bns2024.unit || 'млн т')}` : null,
      plan ? `План 2026: ${displayValue(plan.value, plan.unit || 'млн т')} (не факт)` : null,
    ],
    limitations,
    methodologyNotes: [
      ministry?.methodology || ministry?.note || null,
      'Не агрегировать и не заменять показатели разных контуров.',
    ],
    cannot: [
      'считать БНС фактом выполнения плана Минэнерго',
      'строить один временной ряд из отраслевого итога и промышленной статистики',
      'трактовать отсутствие факта 2026 как нулевую добычу',
    ],
    allowed: ['показывать контуры раздельно', 'сравнивать годы внутри одного промышленного ряда БНС'],
    sources: attachSources(
      [ministry?.sourceId || 'minenergo2025', bns2025?.sourceId || production?.bnsSourceId, resourceAccount?.sourceId],
      sourceByCode,
    ),
  })
}

function buildResourcesContour(reserves, sourceByCode) {
  const national = reserves?.national || reserves || []
  const bns = national.find((item) => item.id === 'bnsReservesDetail') || national[0]
  const ministry = national.find((item) => item.id === 'minenergoReserves') || national[1]
  const hasBns = finiteNumber(bns?.value) != null
  const hasMinistry = finiteNumber(ministry?.value) != null
  if (!hasBns && !hasMinistry) return null

  return finalizeContour({
    id: 'resources',
    label: 'Ресурсная база',
    route: '/resources',
    routeLabel: 'Открыть ресурсную базу',
    latestPeriod: hasBns ? bns.period || 'конец 2024' : ministry?.period || null,
    latestYear: hasBns ? 2024 : null,
    periodType: 'snapshot',
    coverageStatus: COVERAGE_STATUS.OLDER,
    methodologyStatus: hasBns && hasMinistry ? COVERAGE_STATUS.METHODOLOGY_LIMITATION : null,
    has2026Fact: false,
    has2026Coverage: false,
    geography: 'Казахстан',
    qualityShort: hasBns && hasMinistry ? 'разные методологические контуры запасов' : null,
    coverageExtras: { olderLabel: 'срез на конец 2024 / отраслевой показатель без года факта 2026' },
    metrics: [
      hasBns ? `БНС, счет ресурсов: ${displayValue(bns.value, bns.unit)} · ${bns.period || 'конец 2024'}` : null,
      hasMinistry ? `Минэнерго, отраслевой показатель: ${displayValue(ministry.value, ministry.unit)}` : null,
    ],
    limitations: [
      'Статистический счет запасов БНС и отраслевой показатель Минэнерго не суммируются, не усредняются и не подменяют друг друга.',
    ],
    methodologyNotes: [bns?.methodology || bns?.note, ministry?.methodology || ministry?.note],
    cannot: ['выбирать одно значение как «правильное» без методологического основания', 'трактовать отсутствие данных как ноль'],
    allowed: ['показывать оба контура раздельно'],
    sources: attachSources([bns?.sourceId, ministry?.sourceId], sourceByCode),
  })
}

function buildEnergyContour(energy, sourceByCode) {
  if (!energy?.ok && !energy?.items?.length && !energy?.tfc) return null
  const year = energy?.year || 2025
  const sourceId = energy?.items?.[0]?.sourceId || 'bnsTeb2025'
  return finalizeContour({
    id: 'energy',
    label: 'Энергетика',
    route: '/energy-role',
    routeLabel: 'Открыть роль угля в энергетике',
    latestPeriod: String(year),
    latestYear: year,
    periodType: 'fy',
    coverageStatus: year >= 2026 ? COVERAGE_STATUS.CURRENT_2026 : COVERAGE_STATUS.LATEST_2025,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: year >= 2026,
    has2026Coverage: year >= 2026,
    geography: energy?.scope === 'national' || energy?.region === 'all' ? 'Казахстан, национальный ТЭБ' : 'срез ограничен',
    qualityShort: 'топливно-энергетический баланс не описывает структуру потребления только угля',
    coverageExtras: { fyLabel: 'годовой топливно-энергетический баланс' },
    metrics: [
      energy?.tfc ? 'конечное потребление энергии и секторная структура ТЭБ' : 'показатели роли угля в ТЭБ',
      Array.isArray(energy?.methodology) ? energy.methodology[0] : null,
    ],
    limitations: energy?.methodology || [
      'Секторная структура относится к конечному потреблению энергии, не к сегментам угля АЗРК.',
    ],
    cannot: ['читать доли секторов как структуру потребления только угля'],
    allowed: ['анализировать национальный ТЭБ за опубликованный год'],
    sources: attachSources([sourceId, 'bnsTeb2025Xlsx'], sourceByCode),
  })
}

function buildExportContour(production, sourceByCode) {
  const hsAnnual = production?.hsAnnual || []
  const hs2025 = hsAnnual.find((item) => item.year === 2025)
  const ministryExport = production?.ministryExport
  const ytdRow = (production?.availability || []).find((item) => item.id === 'hs2701-ytd')
  const hasYtd = ytdRow?.state === 'available'
  const hasHs = finiteNumber(hs2025?.millionTons) != null
  const hasMinistry = finiteNumber(ministryExport?.value) != null
  if (!hasYtd && !hasHs && !hasMinistry) return null

  return finalizeContour({
    id: 'exports',
    label: 'Экспорт',
    route: '/exports',
    routeLabel: 'Открыть экспорт и внешние рынки',
    latestPeriod: hasYtd ? 'январь–июль 2026' : hasHs ? '2025' : '2025',
    latestYear: hasYtd ? 2026 : 2025,
    periodType: hasYtd ? 'ytd' : 'fy',
    coverageStatus: hasYtd ? COVERAGE_STATUS.YTD_2026 : COVERAGE_STATUS.LATEST_2025,
    methodologyStatus: hasHs && hasMinistry ? COVERAGE_STATUS.METHODOLOGY_LIMITATION : null,
    has2026Fact: false,
    has2026Coverage: hasYtd,
    geography: `Казахстан + партнёры (HS${HS2701})`,
    qualityShort: hasYtd
      ? 'данные за часть года нельзя напрямую сравнивать с итогом за полный год'
      : 'разные контуры учёта экспорта',
    coverageExtras: { ytdLabel: 'частичный период', fyLabel: `годовой HS${HS2701}` },
    metrics: [
      hasYtd ? `HS${HS2701}, январь–июль 2026 (неполный год)` : null,
      hasHs ? `${HS2701_COMTRADE_LABEL}, полный 2025 год: ${displayValue(hs2025.millionTons, 'млн т')}` : null,
      hasMinistry ? `Минэнерго, экспорт 2025: ${displayValue(ministryExport.value, ministryExport.unit)}` : null,
    ],
    limitations: [
      'Данные за январь–июль 2026 нельзя напрямую сравнивать с итогом за полный 2025 год.',
      hasHs && hasMinistry
        ? `Отраслевой экспорт Минэнерго и ${HS2701_COMTRADE_LABEL} — разные контуры учёта. Значения из разных статистических контуров могут отличаться из-за методологии и используются отдельно.`
        : null,
    ],
    methodologyNotes: [`Покрытие: HS${HS2701}.`],
    cannot: [
      'Данные за часть года нельзя напрямую сравнивать с итогом за полный год.',
      'Расхождение между статистическими контурами не означает ошибку источника.',
    ],
    allowed: [`сопоставлять январь–июль 2026 с январём–июлем 2025 внутри HS${HS2701}`],
    sources: attachSources(
      [hs2025?.sourceId || 'unComtradeKazHs2701', 'bnsTradeYtd2026', ministryExport?.sourceId || 'minenergo2025'],
      sourceByCode,
    ),
  })
}

function buildConcentrationContour(concentration, sourceByCode) {
  const items = concentration?.items || []
  if (!items.length) return null
  const has2025 = items.some((item) => finiteNumber(item.value2025) != null)
  const has2024 = items.some((item) => finiteNumber(item.value2024) != null)
  return finalizeContour({
    id: 'concentration',
    label: 'Концентрация',
    route: '/concentration',
    routeLabel: 'Открыть концентрацию',
    latestPeriod: has2025 ? '2025' : has2024 ? '2024' : null,
    latestYear: has2025 ? 2025 : has2024 ? 2024 : null,
    periodType: 'analysis',
    coverageStatus: has2025 ? COVERAGE_STATUS.LATEST_2025 : COVERAGE_STATUS.OLDER,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: false,
    has2026Coverage: false,
    geography: 'Казахстан, сегменты первичной оптовой реализации',
    qualityShort: 'CR-1/CR-2; HHI не опубликован',
    coverageExtras: { fyLabel: 'годовой / официальный анализ' },
    metrics: items.map((item) => {
      const cr = item.crKind || 'CR'
      const name = item.shortLabel || item.segment
      if (finiteNumber(item.value2024) == null || finiteNumber(item.value2025) == null) return null
      return `${name}: ${cr} ${formatNumber(item.value2024)}% → ${formatNumber(item.value2025)}%`
    }),
    limitations: [AZRK_HHI_NOTE.text, 'Сегменты не агрегируются в один показатель концентрации всего рынка угля.'],
    cannot: ['восстанавливать HHI из CR-1/CR-2', 'читать CR сегмента как долю всего угольного рынка'],
    allowed: ['сравнивать опубликованные CR внутри одного сегмента за 2024–2025'],
    sources: attachSources(
      [items[0]?.sourceId || 'azrkConcentration', AZRK_HHI_NOTE.sourceId, 'azrkCoalMarketAnalysis2025'],
      sourceByCode,
    ),
  })
}

function buildPricesContour(concentration, sourceByCode) {
  const items = concentration?.priceItems || []
  const historyOn = Boolean(concentration?.historyAvailable)
  if (!items.length && !historyOn) return null
  return finalizeContour({
    id: 'prices',
    label: 'Динамика цен',
    route: '/dynamics',
    routeLabel: 'Открыть динамику цен',
    latestPeriod: '2022–2025',
    latestYear: 2025,
    periodType: 'fy',
    coverageStatus: COVERAGE_STATUS.LATEST_2025,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: false,
    has2026Coverage: false,
    geography: 'Казахстан, первичная оптовая реализация (сегменты АЗРК)',
    qualityShort: 'оптовые цены не равны розничным',
    coverageExtras: { fyLabel: 'накопленная динамика / официальный ряд' },
    metrics: items.map((item) => item.segment || item.label).filter(Boolean),
    limitations: [
      concentration?.priceGrowthCaption ||
        'Накопленный рост цен первичной оптовой реализации. Не розничные цены и не причинно-следственная оценка.',
    ],
    cannot: ['смешивать с розничными наблюдениями', 'экстраполировать ряд на 2026'],
    allowed: ['показывать опубликованную динамику 2022–2025 внутри сегмента'],
    sources: attachSources([items[0]?.sourceId || concentration?.sourceId || 'azrkConcentration'], sourceByCode),
  })
}

function buildRetailContour(observations, sourceByCode) {
  const items = observations?.ok ? observations.items || [] : []
  if (!items.length) {
    return finalizeContour({
      id: 'retail',
      label: 'Розничные цены',
      route: '/retail',
      routeLabel: 'Открыть розничные цены',
      latestPeriod: null,
      latestYear: null,
      periodType: 'retail_observation',
      coverageStatus: COVERAGE_STATUS.MISSING,
      has2026Fact: false,
      has2026Coverage: false,
      geography: null,
      qualityShort: 'нет подтверждённых наблюдений',
      metrics: [],
      limitations: ['Подтверждённых розничных наблюдений в текущем слое нет.'],
      cannot: ['подставлять 0 как национальную розничную цену'],
      sources: [],
    })
  }

  const coverage = coverageMeta(items)
  const dated2026 = items.filter(
    (item) => coverageYear(item.observationDate) === 2026 || coverageYear(item.periodStart) === 2026,
  )
  const astanaUndated = items.filter((item) => item.region?.code === 'astana' && !item.observationDate && !item.periodStart)
  const oskemen = dated2026.filter(
    (item) =>
      String(item.locality || '').toLowerCase().includes('усть') ||
      String(item.locality || '').toLowerCase().includes('оскемен') ||
      item.region?.code === 'vko' ||
      item.region?.code === 'east-kazakhstan',
  )

  const localities = coverage.dated2026Localities || []
  const regionNames = coverage.regionNames || []

  return finalizeContour({
    id: 'retail',
    label: 'Розничные цены',
    route: '/retail',
    routeLabel: 'Открыть розничные цены',
    latestPeriod: dated2026.length ? '2026' : coverage.latestYear ? String(coverage.latestYear) : 'без подтверждённой даты',
    latestYear: dated2026.length ? 2026 : coverage.latestYear || null,
    periodType: 'retail_observation',
    coverageStatus: dated2026.length ? COVERAGE_STATUS.PARTIAL_COVERAGE : COVERAGE_STATUS.PARTIAL_COVERAGE,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: false,
    has2026Coverage: dated2026.length > 0,
    geography: regionNames.length
      ? `${regionNames.join(', ')} · опубликованные населённые пункты`
      : 'точечные наблюдения, не национальный ряд',
    qualityShort: 'нет единого национального retail series',
    coverageExtras: { partialLabel: 'частичное региональное покрытие' },
    metrics: [
      dated2026.length
        ? `подтверждённые наблюдения 2026: ${dated2026.length}${localities.length ? ` (${localities.join(', ')})` : ''}`
        : 'подтверждённых наблюдений 2026 нет',
      oskemen.length ? 'Усть-Каменогорск / ВКО: контекст 2026 допустим по подтверждённому набору данных' : null,
      astanaUndated.length
        ? 'Наблюдения Астаны без подтверждённой даты публикации/наблюдения не маркируются как 2026'
        : null,
    ],
    limitations: [
      'Точечные розничные наблюдения не образуют единый национальный ряд.',
      'Отсутствие наблюдения не означает нулевую цену.',
    ],
    cannot: ['усреднять разные территории в «цену Казахстана»', 'присваивать Астане год 2026 без даты'],
    allowed: ['показывать наблюдения 2026 с подтверждённой датой отдельно от срезов без даты'],
    sources: attachSources(uniqueSorted(items.map((item) => item.source?.code)), sourceByCode),
  })
}

function buildCompaniesContour(outlook, sourceByCode) {
  const monitor = outlook?.targetMonitor?.items || []
  const companyItems = monitor.filter(
    (item) => item.target?.entityLabel || item.id?.includes('bogatyr') || item.id?.includes('shubarkol'),
  )
  const factYears = companyItems.map((item) => item.fact?.year).filter((year) => typeof year === 'number')
  const latestFact = factYears.length ? Math.max(...factYears) : null
  const profilesNote = 'Профили компаний строятся только по опубликованным наблюдениям. Производственная мощность не равна фактической добыче.'

  return finalizeContour({
    id: 'companies',
    label: 'Компании',
    route: '/companies',
    routeLabel: 'Открыть компании и добычу',
    latestPeriod: latestFact ? String(latestFact) : companyItems.length ? 'планы предприятий без сопоставимого факта периода цели' : 'опубликованные профили',
    latestYear: latestFact,
    periodType: 'fy',
    coverageStatus: latestFact === 2026
      ? COVERAGE_STATUS.CURRENT_2026
      : latestFact
        ? COVERAGE_STATUS.LATEST_2025
        : COVERAGE_STATUS.PARTIAL_COVERAGE,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: latestFact === 2026,
    has2026Coverage: latestFact === 2026,
    geography: 'отдельные предприятия с опубликованными рядами',
    qualityShort: 'план предприятия не равен национальному факту; мощность не равна добыче',
    coverageExtras: { fyLabel: 'последний подтверждённый факт предприятия' },
    metrics: companyItems.map((item) => {
      const name = item.target?.entityLabel || item.direction
      const plan = item.targetDisplay
      const fact = item.factDisplay
      return [name, plan ? `план: ${plan}` : null, fact ? `факт: ${fact}` : 'подтверждённый факт исполнения: нет данных']
        .filter(Boolean)
        .join(' · ')
    }),
    limitations: [
      profilesNote,
      'План 2026 предприятия не является фактом 2026.',
      'Разные источники плана и факта могут быть несопоставимы.',
    ],
    cannot: ['использовать производственную мощность как фактическую добычу', 'заполнять пропуски нулями'],
    allowed: ['показывать факт, план и целевой ориентир раздельно при наличии наблюдения'],
    sources: attachSources(
      [
        ...companyItems.map((item) => item.target?.sourceId),
        ...companyItems.map((item) => item.fact?.sourceId),
        'bogatyrKomir',
        'minenergoShubarkol2026',
      ],
      sourceByCode,
    ),
  })
}

function buildGeographyContour(geography, sourceByCode) {
  if (!geography?.ok) return null
  const year = geography.national2025?.year || 2025
  const regionCount = geography.regional?.length || 0
  return finalizeContour({
    id: 'geography',
    label: 'Региональная структура',
    route: '/geography',
    routeLabel: 'Открыть географию добычи',
    latestPeriod: String(year),
    latestYear: year,
    periodType: 'fy',
    coverageStatus: year >= 2026 ? COVERAGE_STATUS.CURRENT_2026 : COVERAGE_STATUS.LATEST_2025,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: year >= 2026,
    has2026Coverage: year >= 2026,
    geography: 'Казахстан, опубликованные области промышленного ряда БНС',
    qualityShort: regionCount ? `годовой факт · ${regionCount} областей в контуре` : 'годовой факт',
    coverageExtras: { fyLabel: 'годовой факт' },
    metrics: [
      geography.national2025
        ? `национальный промышленный ряд ${year}: ${displayValue(geography.national2025.value, geography.national2025.unit || 'млн т')}`
        : null,
      regionCount ? `региональные наблюдения: ${regionCount}` : null,
    ],
    limitations: [
      'Региональный промышленный ряд БНС не смешивается с отраслевым итогом Минэнерго.',
      'Отсутствие области в публикации не означает нулевую добычу.',
    ],
    cannot: ['достраивать неопубликованные регионы нулями'],
    allowed: ['сравнивать опубликованные области одного года и одного ряда'],
    sources: attachSources([geography.national2025?.sourceId || geography.insights?.sourceId, 'bnsIndustryCoalProduction'], sourceByCode),
  })
}

function buildOutlookContour(outlook, production, sourceByCode) {
  const plan = outlook?.trajectory?.plannedExtraction || production?.plan
  const expectedInv = outlook?.trajectory?.investmentExpectation
  const plots = outlook?.industryOutlook?.coalPlots
  const demand2030 = outlook?.industryOutlook?.additionalDemand
  const demand2032 = outlook?.industryOutlook?.energyNeed
  const gondolas = outlook?.industryOutlook?.gondolas
  if (!plan && !expectedInv && !plots) return null

  return finalizeContour({
    id: 'outlook',
    label: 'Перспективы / планы',
    route: '/outlook',
    routeLabel: 'Открыть перспективы и развитие',
    latestPeriod: '2026 (план / ожидание)',
    latestYear: 2026,
    periodType: expectedInv && !plan ? 'expected' : 'plan',
    coverageStatus: COVERAGE_STATUS.PLAN_2026,
    methodologyStatus: COVERAGE_STATUS.METHODOLOGY_LIMITATION,
    has2026Fact: false,
    has2026Coverage: true,
    geography: 'Казахстан; отдельные корпоративные планы',
    qualityShort: 'план и ожидание не являются фактическим результатом',
    coverageExtras: { planLabel: 'планы и ожидания 2026' },
    metrics: [
      plan && finiteNumber(plan.value) != null ? `план добычи 2026: ${displayValue(plan.value, plan.unit)}` : null,
      expectedInv && finiteNumber(expectedInv.value) != null
        ? `ожидание инвестиций 2026: ${displayValue(expectedInv.value, expectedInv.unit)}`
        : null,
      plots && finiteNumber(plots.value) != null
        ? `угольные участки до конца 2026: ${displayValue(plots.value, plots.unit || 'участков')}`
        : null,
      gondolas && finiteNumber(gondolas.value) != null
        ? `полувагоны: ${displayValue(gondolas.value, gondolas.unit)} · ${gondolas.note || 'обеспечение / throughput, не размер парка'}`
        : null,
    ],
    limitations: [
      'План 2026 не означает наличие факта 2026.',
      'Ожидание 2026 не является фактом.',
      demand2030 && demand2032
        ? `${demand2030.label || 'спрос к 2030'} и ${demand2032.label || 'потребность к 2032'} относятся к разным материалам/горизонтам и не суммируются.`
        : null,
      gondolas
        ? gondolas.note ||
          'Показатель дополнительного обеспечения полувагонами — потребность/throughput, не размер парка и не число новых вагонов.'
        : null,
    ],
    cannot: [
      'считать выполнение плана без сопоставимого факта за период цели',
      'суммировать разнородные горизонты спроса',
    ],
    allowed: ['вести 2026 Monitor как контроль целей против доступного факта'],
    sources: attachSources(
      [plan?.sourceId || 'minenergo2025', expectedInv?.sourceId, plots?.sourceId, gondolas?.sourceId],
      sourceByCode,
    ),
  })
}

function buildWatch(production, reserves, sourceByCode) {
  const items = []
  const ministry = production?.ministryProduction
  const bns2025 = (production?.bnsSeries || []).find((item) => item.year === 2025 && finiteNumber(item.value) != null)
  if (finiteNumber(ministry?.value) != null && finiteNumber(bns2025?.value) != null) {
    items.push({
      id: 'watch-production-2025',
      title: 'Добыча 2025',
      status: 'РАЗНЫЕ СТАТИСТИЧЕСКИЕ КОНТУРЫ',
      related: { to: '/production', label: 'Открыть добычу' },
      sides: [
        {
          label: 'Министерство энергетики',
          value: displayValue(ministry.value, ministry.unit || 'млн т'),
          period: ministry.period || '2025',
          contour: 'отраслевой итог',
          source: resolveSource(ministry.sourceId || 'minenergo2025', sourceByCode),
        },
        {
          label: 'БНС, годовой промышленный ряд',
          value: displayValue(bns2025.value, bns2025.unit || 'млн т'),
          period: bns2025.period || '2025',
          contour: 'промышленная статистика',
          source: resolveSource(bns2025.sourceId || production?.bnsSourceId, sourceByCode),
        },
      ],
    })
  }

  const ministryExport = production?.ministryExport
  const hs2025 = (production?.hsAnnual || []).find((item) => item.year === 2025)
  if (finiteNumber(ministryExport?.value) != null && finiteNumber(hs2025?.millionTons) != null) {
    items.push({
      id: 'watch-export-2025',
      title: 'Экспорт 2025',
      status: 'РАЗНЫЕ КОНТУРЫ УЧЁТА',
      related: { to: '/exports', label: 'Открыть экспорт' },
      sides: [
        {
          label: 'Министерство энергетики',
          value: displayValue(ministryExport.value, ministryExport.unit || 'млн т'),
          period: '2025',
          contour: 'отраслевой экспорт',
          source: resolveSource(ministryExport.sourceId || 'minenergo2025', sourceByCode),
        },
        {
          label: HS2701_COMTRADE_LABEL,
          value: displayValue(hs2025.millionTons, 'млн т'),
          period: 'полный 2025 год',
          contour: `внешнеторговая статистика HS${HS2701}`,
          source: resolveSource(hs2025.sourceId || 'unComtradeKazHs2701', sourceByCode),
        },
      ],
    })
  }

  const national = reserves?.national || []
  const bnsRes = national.find((item) => item.id === 'bnsReservesDetail') || national[0]
  const minRes = national.find((item) => item.id === 'minenergoReserves') || national[1]
  if (finiteNumber(bnsRes?.value) != null && finiteNumber(minRes?.value) != null) {
    items.push({
      id: 'watch-reserves',
      title: 'Запасы',
      status: 'РАЗНЫЕ МЕТОДОЛОГИЧЕСКИЕ КОНТУРЫ',
      related: { to: '/resources', label: 'Открыть ресурсную базу' },
      sides: [
        {
          label: 'БНС, счет ресурсов',
          value: displayValue(bnsRes.value, bnsRes.unit),
          period: bnsRes.period || 'конец 2024',
          contour: 'статистический учет запасов',
          source: resolveSource(bnsRes.sourceId || 'bnsReserves2024', sourceByCode),
        },
        {
          label: 'Министерство энергетики',
          value: displayValue(minRes.value, minRes.unit),
          period: minRes.period || 'отраслевой показатель',
          contour: 'отраслевая оценка запасов',
          source: resolveSource(minRes.sourceId || 'minenergo2025', sourceByCode),
        },
      ],
    })
  }

  return items
}

function buildRules(outlook, production) {
  const gondolas = outlook?.industryOutlook?.gondolas
  const demand2030 = outlook?.industryOutlook?.additionalDemand
  const demand2032 = outlook?.industryOutlook?.energyNeed
  return [
    {
      id: 'prod-ministry-bns',
      text: 'Отраслевой итог Минэнерго за 2025 год и годовой промышленный ряд БНС за 2025 год не образуют одну серию.',
    },
    {
      id: 'reserves-contours',
      text: 'Счет запасов БНС и отраслевой показатель запасов Минэнерго — разные методологические контуры.',
    },
    {
      id: 'export-contours',
      text: `Отраслевой экспорт Минэнерго и ${HS2701_COMTRADE_LABEL} за 2025 год не приводятся к одному «правильному» числу.`,
    },
    {
      id: 'resource-account-prod',
      text: production?.resourceAccount
        ? 'Добыча в статистическом счете минеральных ресурсов не является продолжением промышленного годового ряда БНС.'
        : null,
    },
    {
      id: 'astana-date',
      text: 'Розничные наблюдения Астаны без подтверждённой даты публикации/наблюдения не маркируются как 2026.',
    },
    {
      id: 'oskemen-2026',
      text: 'Розничные наблюдения Усть-Каменогорска с подтверждённым календарным признаком 2026 допускаются в контуре 2026.',
    },
    {
      id: 'export-ytd',
      text: 'Экспорт за январь–июль 2026 — данные за часть года. Их нельзя напрямую сравнивать с итогом за полный год.',
    },
    {
      id: 'gondolas',
      text: gondolas
        ? gondolas.note ||
          'Дополнительное обеспечение полувагонами — потребность/пропускная способность, не размер парка и не число новых вагонов.'
        : 'Если в контуре перспектив указаны полувагоны, это обеспечение/throughput, не парк и не 600 новых вагонов.',
    },
    {
      id: 'demand-horizons',
      text:
        demand2030 && demand2032
          ? 'Ориентиры дополнительного спроса к 2030 и потребности к 2032 относятся к разным материалам и горизонтам; не суммировать и не усреднять.'
          : 'Разнородные горизонты спроса в официальных материалах не суммируются.',
    },
    {
      id: 'missing',
      text: 'Отсутствие значения не равно нулю. Конфиденциальные данные не равны нулю. Плановые, ожидаемые и целевые значения показываются отдельно от фактических результатов.',
    },
  ].filter((item) => item.text)
}

function buildFreshness(contours) {
  const y2026 = []
  const y2025 = []
  const older = []
  for (const item of contours) {
    const tag = {
      id: item.id,
      label: item.label,
      period: item.latestPeriod,
      periodType: item.periodTypeLabel,
      has2026Fact: item.has2026Fact,
      coverage: item.coverageLabel,
    }
    if (item.latestYear === 2026) y2026.push(tag)
    else if (item.latestYear === 2025) y2025.push(tag)
    else older.push(tag)
  }
  return { y2026, y2025, older }
}

function buildSummary(contours, watch) {
  const years = contours.map((item) => item.latestYear).filter((year) => typeof year === 'number')
  const latestYear = years.length ? Math.max(...years) : null
  const with2026 = contours.filter((item) => item.has2026Coverage).length
  const methodologyCount = watch.length
  const incomplete = contours.filter(
    (item) =>
      item.coverageStatus === COVERAGE_STATUS.PARTIAL_COVERAGE ||
      item.coverageStatus === COVERAGE_STATUS.YTD_2026 ||
      item.coverageStatus === COVERAGE_STATUS.MISSING,
  ).length
  const withFact2026 = contours.filter((item) => item.has2026Fact).length
  const latest2025 = contours.filter((item) => item.latestYear === 2025 && !item.has2026Coverage).length
  return {
    latestCoveredPeriod: latestYear != null ? String(latestYear) : 'нет данных',
    contoursWith2026: with2026,
    methodologyLimitations: methodologyCount,
    incompleteCoverage: incomplete,
    withFact2026,
    latest2025Only: latest2025,
    contourCount: contours.length,
  }
}

export function attachSourceUsage(items, contours) {
  const map = new Map()
  for (const contour of contours || []) {
    for (const source of contour.sources || []) {
      if (!source?.id) continue
      if (!map.has(source.id)) map.set(source.id, [])
      const list = map.get(source.id)
      if (!list.some((row) => row.id === contour.id)) {
        list.push({ id: contour.id, label: contour.label, route: contour.route })
      }
    }
  }
  return (items || []).map((item) => ({
    ...item,
    usedIn: map.get(item.id) || [],
  }))
}

export function mergeSourceCatalog(remoteItems) {
  const localById = new Map(sourceList.map((item) => [item.id, item]))
  const rows = remoteItems?.length ? remoteItems : sourceList
  return rows.map((item) => {
    const local = localById.get(item.id)
    return {
      ...item,
      organization: item.organization || local?.organization || null,
      publication: item.publication || local?.publication || null,
      period: item.period || local?.period || null,
      url: item.url || local?.url || null,
      notes: item.notes || local?.notes || null,
      indicators: item.indicators?.length ? item.indicators : local?.indicators || [],
      sourceStatus: item.sourceStatus || local?.sourceStatus || null,
    }
  })
}

export function assembleDataQuality({
  production,
  reserves,
  energy,
  concentration,
  observations,
  geography,
  outlook,
  sourceByCode,
}) {
  const contours = [
    buildProductionContour(production, sourceByCode),
    buildResourcesContour(reserves, sourceByCode),
    buildEnergyContour(energy, sourceByCode),
    buildExportContour(production, sourceByCode),
    buildConcentrationContour(concentration, sourceByCode),
    buildPricesContour(concentration, sourceByCode),
    buildRetailContour(observations, sourceByCode),
    buildCompaniesContour(outlook, sourceByCode),
    buildGeographyContour(geography, sourceByCode),
    buildOutlookContour(outlook, production, sourceByCode),
  ].filter(Boolean)

  const watch = buildWatch(production, reserves, sourceByCode)
  return {
    contours,
    watch,
    rules: buildRules(outlook, production),
    freshness: buildFreshness(contours),
    summary: buildSummary(contours, watch),
    sourceByCode,
  }
}
