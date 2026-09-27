import { sources as catalogSources } from '../data/sources'
import { formatNumber, formatSignedPercent, formatTonnes } from './format'
import { coverageMeta, coverageYear, pluralizeBrand, uniqueSorted } from './retailAnalytics'

export const KPI_RELATED_SECTIONS = {
  production2025: { to: '/production', label: 'Объёмы и баланс' },
  export2025: { to: '/exports', label: 'Экспорт и внешние рынки' },
  domestic2025: { to: '/production', label: 'Объёмы и баланс' },
  plan2026: { to: '/outlook', label: 'Перспективы и развитие' },
  bnsReserves: { to: '/resources', label: 'Ресурсная база' },
  subsoilUsers: { to: '/companies', label: 'Компании и добыча' },
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function yoyRatioPercent(current, previous) {
  const cur = finiteNumber(current)
  const prev = finiteNumber(previous)
  if (cur == null || prev == null || prev === 0) return null
  return (cur / prev - 1) * 100
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

function changeGlyph(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) return '→'
  return value > 0 ? '↑' : '↓'
}

function plainPercent(value, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return `${formatNumber(Math.abs(value), digits)}%`
}

function verbByGender(value, forms) {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) return forms.flat
  return value > 0 ? forms.up : forms.down
}

function formatPercentagePoints(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, 1)} процентного пункта`
}

function localityIn(name) {
  const cleaned = String(name || '')
    .replace(/^г\.\s*/i, '')
    .trim()
  if (!cleaned) return null
  return cleaned
}

function placePrepositional(name) {
  const cleaned = localityIn(name)
  if (!cleaned) return null
  if (/усть-каменогорск/i.test(cleaned)) return 'в Усть-Каменогорске'
  if (/^астан/i.test(cleaned)) return 'в Астане'
  return `в ${cleaned}`
}

function concentrationShareHeadline(item) {
  const from = formatNumber(item.value2024)
  const to = formatNumber(item.value2025)
  const kind = item.crKind || 'CR'
  const participants = Array.isArray(item.participants) ? item.participants.filter(Boolean) : []
  const deltaLabel = formatPercentagePoints(item.deltaPp)
  const verb = verbByGender(item.deltaPp, {
    up: 'выросла',
    down: 'снизилась',
    flat: 'не изменилась',
  })
  let who
  if (kind === 'CR-2') who = 'двух крупнейших поставщиков'
  else if (kind === 'CR-1') who = 'крупнейшего поставщика'
  else who = 'крупнейших участников'
  const market = item.marketName
    ? item.marketName.replace(/^первичная оптовая реализация\s+/i, '')
    : `${String(item.shortLabel || item.segment || 'сегмента').toLowerCase()} угля`
  let line = `Доля ${who} ${market} ${verb} с ${from}% до ${to}%.`
  if (deltaLabel) line += ` Изменение: ${deltaLabel}.`
  return { line, kind, participants }
}

function buildProductionSignal(production, sourceByCode) {
  const series = production?.bnsSeries || []
  const point2024 = series.find((item) => item.year === 2024)
  const point2025 = series.find((item) => item.year === 2025)
  const value2024 = finiteNumber(point2024?.value)
  const value2025 = finiteNumber(point2025?.value)
  const pct = yoyRatioPercent(value2025, value2024)
  if (pct == null) return null
  const unit = point2025?.unit || point2024?.unit || 'млн т'
  const sourceId = point2025?.sourceId || point2024?.sourceId || production?.bnsSourceId
  const source = resolveSource(sourceId, sourceByCode)
  const grown = verbByGender(pct, { up: 'выросла', down: 'снизилась', flat: 'не изменилась' })
  const pctLabel = plainPercent(pct)
  return {
    id: 'production-bns-yoy',
    domain: 'Добыча',
    title: 'Добыча угля, БНС',
    headline: `Добыча угля в 2025 году ${grown} на ${pctLabel} к 2024 году`,
    glyph: changeGlyph(pct),
    changeLabel: formatSignedPercent(pct),
    section: { to: '/production', label: 'Открыть добычу' },
    sourceId,
    source,
    methodologyScope: 'Годовой промышленный статистический ряд БНС. Не отраслевой итог Минэнерго и не счет минеральных ресурсов.',
    calculation: '(значение 2025 / значение 2024 − 1) × 100. Сравниваются только два года одного промышленного ряда.',
    periods: ['2024', '2025'],
    unit,
    inputs: [
      { label: '2024', value: formatNumber(value2024), unit },
      { label: '2025', value: formatNumber(value2025), unit },
      { label: 'Изменение', value: formatSignedPercent(pct), unit: 'к 2024 году' },
    ],
    brief: `Добыча угля в 2025 году ${grown} на ${pctLabel} к 2024 году по промышленной статистике БНС.`,
  }
}

function yoyOk(entry) {
  return entry && entry.status === 'ok' && finiteNumber(entry.pct) != null
}

function buildExportSignal(exportCmp, sourceByCode) {
  if (!exportCmp?.ok) return null
  if (exportCmp.currentPeriod?.is_full_year !== exportCmp.previousPeriod?.is_full_year) return null
  if (!yoyOk(exportCmp.volumeYoy) || !yoyOk(exportCmp.valueYoy)) return null
  const volumePct = exportCmp.volumeYoy.pct
  const valuePct = exportCmp.valueYoy.pct
  const currentTonnes = finiteNumber(exportCmp.currentNational?.netWeightTonnes)
  const previousTonnes = finiteNumber(exportCmp.previousNational?.netWeightTonnes)
  const currentUsd = finiteNumber(exportCmp.currentNational?.tradeValueUsd)
  const previousUsd = finiteNumber(exportCmp.previousNational?.tradeValueUsd)
  if (currentTonnes == null || previousTonnes == null || currentUsd == null || previousUsd == null) {
    return null
  }
  const sourceId = 'bnsTradeYtd2026'
  const source = resolveSource(sourceId, sourceByCode)
  const volumeVerb = verbByGender(volumePct, { up: 'вырос', down: 'снизился', flat: 'не изменился' })
  const valueVerb = verbByGender(valuePct, { up: 'выросла', down: 'снизилась', flat: 'не изменилась' })
  const volumeLabel = plainPercent(volumePct)
  const valueLabel = plainPercent(valuePct)
  return {
    id: 'export-hs2701-ytd',
    domain: 'Экспорт',
    title: 'Экспорт каменного угля, январь–июль',
    headline: `За январь–июль 2026 объём экспорта угля ${volumeVerb} на ${volumeLabel}, а стоимость — ${valueVerb} на ${valueLabel} к тому же периоду 2025 года.`,
    glyph: changeGlyph(volumePct),
    changeLabel: formatSignedPercent(volumePct),
    section: { to: '/exports', label: 'Открыть экспорт' },
    sourceId: source?.id || sourceId,
    source,
    methodologyScope:
      'Для внешней торговли используется товарная группа HS 2701 — каменный уголь; брикеты, окатыши и аналогичные виды твёрдого топлива из каменного угля. Сравниваются сопоставимые периоды январь–июль 2026 и январь–июль 2025. Не сравнение с полным 2025 годом и не отраслевой экспорт Минэнерго.',
    calculation: 'Изменение объёма и стоимости: (значение 2026 / значение 2025 − 1) × 100 для одинакового окна январь–июль.',
    periods: ['январь–июль 2025', 'январь–июль 2026'],
    unit: 'т / USD',
    inputs: [
      { label: 'Объём, январь–июль 2025', value: formatNumber(previousTonnes, 0), unit: 'т' },
      { label: 'Объём, январь–июль 2026', value: formatNumber(currentTonnes, 0), unit: 'т' },
      { label: 'Стоимость, январь–июль 2025', value: formatNumber(previousUsd, 0), unit: 'USD' },
      { label: 'Стоимость, январь–июль 2026', value: formatNumber(currentUsd, 0), unit: 'USD' },
    ],
    brief: `За январь–июль 2026 экспорт ${volumeVerb} на ${volumeLabel} по объёму и на ${valueLabel} по стоимости к аналогичному периоду 2025 года.`,
  }
}

function buildConcentrationSignal(concentration, sourceByCode) {
  const items = (concentration?.items || []).filter(
    (item) => finiteNumber(item.value2024) != null && finiteNumber(item.value2025) != null && item.deltaPp != null,
  )
  if (!items.length) return null
  const sourceId = items[0].sourceId || 'azrkConcentration'
  const source = resolveSource(sourceId, sourceByCode)
  const first = items[0]
  const headlines = items.map((item) => concentrationShareHeadline(item))
  const crGuide =
    first.crKind === 'CR-1'
      ? 'CR-1 — доля крупнейшего участника сегмента.'
      : 'CR-2 — совокупная рыночная доля двух крупнейших участников сегмента.'
  const named = first.participants?.length
    ? ` В текущих данных сегмента указаны: ${first.participants.join(', ')}.`
    : ''
  return {
    id: 'concentration-cr',
    domain: 'Концентрация',
    title: 'Доля крупнейших поставщиков, 2024–2025',
    headline: headlines[0].line,
    details: headlines.slice(1).map((row) => row.line),
    glyph: changeGlyph(first.deltaPp),
    changeLabel: formatPercentagePoints(first.deltaPp),
    section: { to: '/concentration', label: 'Открыть концентрацию' },
    sourceId,
    source,
    methodologyScope: `${crGuide} Доли крупнейших участников сегментов первичной оптовой реализации. Не оценка «хорошо/плохо» и не доля всего угольного рынка.${named}`,
    calculation: 'Δ = значение 2025 − значение 2024, в процентных пунктах. Сегменты не агрегируются в один показатель.',
    periods: ['2024', '2025'],
    unit: '%',
    inputs: items.map((item) => ({
      label: `${item.shortLabel || item.segment} · ${item.crKind || 'CR'}`,
      value: `${formatNumber(item.value2024)} → ${formatNumber(item.value2025)}`,
      unit: `% · Δ ${formatPercentagePoints(item.deltaPp)}`,
    })),
    brief: headlines[0].line,
  }
}

function buildRetailSignal(observations, sourceByCode) {
  if (!observations?.ok || !observations.items?.length) return null
  const coverage = coverageMeta(observations.items)
  const localities = coverage.dated2026Localities || []
  if (!coverage.datedCount || !localities.length) return null
  const dated = observations.items.filter(
    (item) => coverageYear(item.observationDate) === 2026 || coverageYear(item.periodStart) === 2026,
  )
  if (!dated.length) return null
  const places = uniqueSorted(localities).map(localityIn).filter(Boolean)
  const territory = places.join(', ')
  const sourceCodes = uniqueSorted(dated.map((item) => item.source?.code))
  const sourceId = sourceCodes.length === 1 ? sourceCodes[0] : dated[0]?.source?.code || null
  const source = resolveSource(sourceId, sourceByCode)
  const placePhrase =
    places.length === 1
      ? placePrepositional(places[0])
      : places.length
        ? `по территориям: ${territory}`
        : null
  const headline = placePhrase
    ? `Доступны подтверждённые розничные цены за 2026 год ${placePhrase}. Это не данные по всему Казахстану.`
    : 'Доступны подтверждённые розничные цены за 2026 год. Это не данные по всему Казахстану.'
  return {
    id: 'retail-2026-freshness',
    domain: 'Розничные цены',
    title: 'Розничные цены 2026',
    headline,
    glyph: '→',
    changeLabel: '2026',
    section: { to: '/retail', label: 'Открыть розничные цены' },
    sourceId,
    source,
    methodologyScope: 'Только наблюдения с подтверждённым календарным признаком 2026. Публикации без даты в этот сигнал не входят. Не национальная розничная статистика.',
    calculation: 'Отбор розничных наблюдений, у которых observation_date или period_start относится к 2026 году.',
    periods: ['2026'],
    unit: null,
    inputs: [
      { label: 'Территории', value: territory, unit: null },
      { label: 'Наблюдений 2026', value: String(dated.length), unit: null },
    ],
    brief: placePhrase
      ? `В мониторинге доступны подтверждённые розничные цены 2026 года ${placePhrase}.`
      : 'В мониторинге доступны подтверждённые розничные цены 2026 года.',
  }
}

function buildProductionConflict(production, sourceByCode) {
  const ministry = production?.ministryProduction
  const bns2025 = (production?.bnsSeries || []).find((item) => item.year === 2025)
  const ministryValue = finiteNumber(ministry?.value)
  const bnsValue = finiteNumber(bns2025?.value)
  if (ministryValue == null || bnsValue == null) return null
  const ministryUnit = ministry.unit || 'млн т'
  const bnsUnit = bns2025.unit || 'млн т'
  return {
    id: 'minenergo-vs-bns-industry-2025',
    kpiId: 'production2025',
    warning: `В проекте также используется показатель БНС ${formatNumber(bnsValue)} ${bnsUnit} за 2025 год. Он относится к другому статистическому контуру и не включается автоматически в один временной ряд с показателем Минэнерго.`,
    conclusion: 'Показатели представлены раздельно и не агрегируются.',
    sides: [
      {
        label: 'Минэнерго',
        value: formatNumber(ministryValue),
        unit: ministryUnit,
        period: ministry.period || '2025',
        contour: 'Отраслевой итог',
        source: resolveSource(ministry.sourceId || 'minenergo2025', sourceByCode),
      },
      {
        label: 'БНС',
        value: formatNumber(bnsValue),
        unit: bnsUnit,
        period: bns2025.period || '2025',
        contour: 'Годовой промышленный статистический ряд',
        source: resolveSource(bns2025.sourceId || production?.bnsSourceId, sourceByCode),
      },
    ],
  }
}

function buildPulseFacts({ production, exportCmp, concentration, observations }) {
  const items = []
  const series = production?.bnsSeries || []
  const point2025 = series.find((item) => item.year === 2025)
  const productionValue = finiteNumber(point2025?.value)
  if (productionValue != null) {
    const unit = point2025.unit || 'млн т'
    const sourceId = point2025.sourceId || production?.bnsSourceId
    items.push({
      id: 'pulse-production',
      label: 'Добыча',
      value: formatNumber(productionValue),
      unit,
      period: '2025',
      context: 'Бюро национальной статистики (БНС)',
      metric: {
        id: 'bnsIndustrial2025',
        value: productionValue,
        display: formatNumber(productionValue),
        unit,
        period: '2025 год',
        sourceId,
      },
      traceExtras: {
        route: '/production',
        methodology: 'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.',
        label: 'Добыча угля — данные БНС',
      },
    })
  }

  const exportTonnes = finiteNumber(exportCmp?.ok ? exportCmp.currentNational?.netWeightTonnes : null)
  const exportFullYear = exportCmp?.currentPeriod?.is_full_year
  if (exportCmp?.ok && exportTonnes != null && exportFullYear === false) {
    const volume = formatTonnes(exportTonnes, 3)
    const sourceId = 'bnsTradeYtd2026'
    items.push({
      id: 'pulse-export',
      label: 'Экспорт',
      value: volume.text,
      unit: volume.unit,
      period: 'янв–июл 2026',
      context: 'Каменный уголь · внешнеторговая статистика',
      metric: {
        id: 'export-ytd-2026-volume',
        value: exportTonnes / 1e6,
        display: volume.text,
        unit: volume.unit,
        period: 'январь–июль 2026',
        sourceId,
      },
      traceExtras: { profileKey: 'hsYtdVolume', route: '/exports', label: 'Объём экспорта каменного угля' },
    })
  }

  const concentrationRows = (concentration?.items || []).filter(
    (item) => finiteNumber(item.value2025) != null,
  )
  const household = concentrationRows.find((item) =>
    /коммунальн/i.test(`${item.marketName || ''} ${item.segment || ''} ${item.shortLabel || ''}`),
  )
  const concentrationRow = household || concentrationRows[0]
  if (concentrationRow) {
    const share = finiteNumber(concentrationRow.value2025)
    const who =
      concentrationRow.crKind === 'CR-1' ? 'доля крупнейшего поставщика' : 'доля двух крупнейших поставщиков'
    const market = String(concentrationRow.marketName || concentrationRow.shortLabel || concentrationRow.segment || '')
      .replace(/^первичная оптовая реализация\s+/i, '')
      .trim()
    items.push({
      id: 'pulse-concentration',
      label: 'Концентрация',
      value: formatNumber(share),
      unit: '%',
      period: '2025',
      context: `${who}${market ? ` · ${market}` : ''}`,
      metric: {
        id: concentrationRow.id,
        value: share,
        display: formatNumber(share),
        unit: '%',
        period: '2025',
        sourceId: concentrationRow.sourceId,
      },
      traceExtras: { route: '/concentration', label: concentrationRow.segment || 'Концентрация сегмента' },
    })
  }

  if (observations?.ok && observations.items?.length) {
    const coverage = coverageMeta(observations.items)
    const dated2026 = observations.items.filter(
      (item) => coverageYear(item.observationDate) === 2026 || coverageYear(item.periodStart) === 2026,
    )
    const places = uniqueSorted(coverage.dated2026Localities || []).map(localityIn).filter(Boolean)
    if (coverage.datedCount && places.length && dated2026.length) {
      const brands = uniqueSorted(
        dated2026.map((item) => String(item.brand || '').trim()).filter(Boolean),
      )
      const placeLine = places.join(', ')
      const period =
        brands.length > 0 ? `${placeLine} · ${pluralizeBrand(brands.length)} угля` : placeLine
      items.push({
        id: 'pulse-retail',
        kind: 'coverage',
        label: 'Розничные цены',
        value: 'Данные 2026 доступны',
        unit: '',
        period,
        context: 'Подтверждённые розничные наблюдения',
        href: '/retail',
        actionLabel: 'Посмотреть цены',
      })
    }
  }

  return items.slice(0, 4)
}

export function assembleMarketIntelligence({ production, exportCmp, concentration, observations, sourceByCode }) {
  const skipped = []
  const productionSignal = buildProductionSignal(production, sourceByCode)
  if (!productionSignal) skipped.push('Добыча БНС 2024→2025: нет двух сопоставимых значений промышленного ряда.')
  const exportSignal = buildExportSignal(exportCmp, sourceByCode)
  if (!exportSignal) skipped.push('Экспорт каменного угля январь–июль 2025 vs 2026: нет сопоставимой пары объёма и стоимости.')
  const concentrationSignal = buildConcentrationSignal(concentration, sourceByCode)
  if (!concentrationSignal) skipped.push('Концентрация АЗРК: нет пар долей 2024 и 2025.')
  const retailSignal = buildRetailSignal(observations, sourceByCode)
  if (!retailSignal) skipped.push('Розница 2026: нет наблюдений с подтверждённой датой/периодом 2026.')

  const signals = [productionSignal, exportSignal, concentrationSignal, retailSignal].filter(Boolean)
  const brief = signals.map((item) => item.brief).filter(Boolean).slice(0, 6)
  const conflicts = {
    production2025: buildProductionConflict(production, sourceByCode),
  }
  return {
    signals,
    brief,
    pulseFacts: buildPulseFacts({ production, exportCmp, concentration, observations, sourceByCode }),
    skipped,
    conflicts,
    sourceByCode,
  }
}

export function inspectKpiRecord(item, extras = {}) {
  if (!item) return null
  const source = resolveSource(item.sourceId, extras.sourceByCode)
  const related = KPI_RELATED_SECTIONS[item.id] || null
  const isPlan = item.status === 'План' || String(item.period || '').toLowerCase().includes('план')
  return {
    id: item.id,
    title: item.label || item.title || null,
    value: item.display || (finiteNumber(item.value) != null ? formatNumber(item.value) : null),
    numericValue: finiteNumber(item.value),
    unit: item.unit || null,
    period: item.period || null,
    geography: item.coverage === 'republic' || !item.coverage ? 'Национальный / республика' : null,
    status: isPlan ? 'План' : 'Факт',
    publisher: source?.organization || null,
    sourceName: source?.publication || null,
    methodologyScope: item.methodology || item.note || null,
    sourceUrl: source?.url || null,
    sourceId: item.sourceId || null,
    related,
    conflict: extras.conflicts?.[item.id] || null,
  }
}
