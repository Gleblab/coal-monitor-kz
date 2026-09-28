import {
  astanaRetailPrices,
  coalTypes,
  concentration,
  extractionAccounts,
  flow2025,
  investments,
  kpis,
  priceGrowth,
  energyRole,
  energyRoleQuote,
  energySectors,
  ENERGY_ROLE_SECTOR_IDS,
  coalAssets,
  resourceGuide,
  regions,
  reserveAccounts,
  unavailable,
  SLICE_EMPTY,
  SLICE_NATIONAL_HINT,
} from '../data/catalog'
import { INDICATOR_STATUS, SOURCE_STATUS, sourceList, sources } from '../data/sources'
import {
  fetchPublishedCoalAssets,
  fetchPublishedCompanies,
  fetchPublishedEnergyBalance,
  fetchPublishedIndustryIndicators,
  fetchPublishedMarketShares,
  fetchPublishedPrices,
  fetchPublishedRetailCoalObservations,
  fetchPublishedChemistryDirections,
  fetchPublishedGenerationProjects,
  fetchPublishedProduction,
  fetchPublishedProgramIndicators,
  fetchPublishedProgramMeasures,
  fetchPublishedRegions,
  fetchPublishedRegionalCoalEnergy,
  fetchPublishedReserves,
  fetchPublishedSources,
  fetchPublishedStrategicPrograms,
  fetchPublishedTrade,
  numericValue,
  EXPORT_PERIODS,
  matchExportPeriod,
  ratioChange,
  isHs2701ExportRow,
} from '../services/coalDataService'
import { energySliceLabel, formatCoalVolume, formatEnergyKtoe, formatHouseholdCoalKg, formatNumber } from '../lib/format'
import {
  astanaSnapshotSeries,
  brandRanges,
  classifySupplyItems,
  coverageMeta,
  filterRetailByRegion,
  geoPoints,
  latestAstanaSnapshot,
  oskemen2026Retail,
  stockPoints,
} from '../lib/retailAnalytics'
import { assembleMarketIntelligence } from '../lib/marketIntelligence'
import { assembleTargetMonitor } from '../lib/targetMonitor'
import { assembleDataQuality, attachSourceUsage, mergeSourceCatalog } from '../lib/dataQuality'
import { GEOGRAPHY_STATUS_2025, GEOGRAPHY_STATUS_LABEL } from '../data/geographyStatuses'
import {
  AZRK_CR_GUIDE,
  AZRK_DELTA_NOTE,
  AZRK_HHI_NOTE,
  AZRK_HISTORICAL_HOUSEHOLD_CR3,
  AZRK_KEY_CAPACITY_RULE,
  AZRK_MEASURES,
  AZRK_OLIGOPOLY_NOTE,
  AZRK_PARTICIPANTS_NOTE,
  AZRK_PRICE_CAUSALITY_NOTE,
  AZRK_STRUCTURAL_FACTORS,
  AZRK_UNPUBLISHED_NOTE,
  CONCENTRATION_SEGMENT_META,
} from '../data/azrkCompetitionStructure'

function segmentMatches(itemSegmentId, coalType) {
  if (coalType === 'all') return true
  return itemSegmentId === coalType
}

export async function getFiltersMeta() {
  const remote = await fetchPublishedRegions()
  const byId = new Map()
  for (const item of regions) {
    if (item.id !== 'all') byId.set(item.id, { id: item.id, name: item.name })
  }
  if (remote.ok) {
    for (const row of remote.rows || []) {
      if (row.code && row.name) byId.set(row.code, { id: row.code, name: row.name })
    }
  }
  const sorted = [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru'))
  return {
    regions: [{ id: 'all', name: 'Все регионы / республика' }, ...sorted],
    coalTypes,
  }
}

export async function getOverview() {
  const [prodRemote, tradeRemote, industryRemote, reservesRemote] = await Promise.all([
    fetchPublishedProduction(),
    fetchPublishedTrade(),
    fetchPublishedIndustryIndicators(),
    fetchPublishedReserves(),
  ])

  const production = prodRemote.ok ? compareNationalProduction(prodRemote.rows) : null
  const trade = tradeRemote.ok ? compareTrade(tradeRemote.rows) : null
  const industry = industryRemote.ok ? compareIndustryIndicators(industryRemote.rows) : null
  const reserves = reservesRemote.ok ? compareReserves(reservesRemote.rows) : null

  const extraction2025 = production?.matched
    ? production.extraction.find((item) => item.id === 'minenergoExtraction2025')
    : null
  const plan2026 = production?.matched ? production.plan : null
  const exportFlow = trade?.matched ? trade.flows.find((item) => item.id === 'exportFlow') : null
  const domesticFlow = trade?.matched ? trade.flows.find((item) => item.id === 'domesticFlow') : null
  const users = industry?.matched ? industry.users : null
  const bnsReserves = reserves?.matched
    ? reserves.national.find((item) => item.id === 'bnsReservesDetail')
    : null

  const overlay = {
    production2025: extraction2025,
    export2025: exportFlow,
    domestic2025: domesticFlow,
    plan2026,
    bnsReserves,
    subsoilUsers: users,
  }

  const mapped = kpis.map((item) => overlayOverviewKpi(item, overlay[item.id]))
  const bnsIndustrial2025 = prodRemote.ok
    ? mapBnsIndustrialSeries(prodRemote.rows).find((item) => item.year === 2025 && item.value != null)
    : null
  if (bnsIndustrial2025) {
    mapped.push({
      id: 'bnsIndustrial2025',
      label: 'Добыча угля · БНС',
      value: bnsIndustrial2025.value,
      display: formatNumber(bnsIndustrial2025.value),
      unit: bnsIndustrial2025.unit || 'млн т',
      period: '2025 год',
      status: INDICATOR_STATUS.official,
      sourceId: bnsIndustrial2025.sourceId,
      note: 'Годовой промышленный статистический ряд. Не является отраслевым итогом Минэнерго.',
      methodology: 'Годовой промышленный статистический ряд',
      origin: 'supabase',
    })
  }
  const verified = mapped.filter((item) => item.origin === 'supabase')
  const kpisDataOrigin = verified.length === mapped.length
    ? 'supabase'
    : verified.length
      ? 'mixed'
      : 'unavailable'

  return {
    kpis: mapped,
    regionalNote: null,
    scope: 'national',
    kpisDataOrigin,
  }
}

function overlayOverviewKpi(catalogItem, remote) {
  const metadata = {
    id: catalogItem.id,
    label: catalogItem.label,
    unit: catalogItem.unit,
    period: catalogItem.period,
    status: catalogItem.status,
    sourceId: catalogItem.sourceId,
    note: catalogItem.note,
    methodology: catalogItem.methodology || catalogItem.note,
  }
  if (!remote || typeof remote.value !== 'number' || !Number.isFinite(remote.value)) {
    return {
      ...metadata,
      value: null,
      display: null,
      altDisplay: null,
      origin: 'unavailable',
    }
  }
  return {
    ...metadata,
    value: remote.value,
    display: remote.display || catalogItem.display || null,
    altDisplay: remote.altDisplay || catalogItem.altDisplay || null,
    unit: remote.unit || catalogItem.unit,
    sourceId: remote.sourceId || catalogItem.sourceId,
    status: remote.status || catalogItem.status,
    methodology: remote.methodology || catalogItem.methodology || catalogItem.note,
    origin: 'supabase',
  }
}

export async function getResources(filters) {
  const region = filters?.region ?? 'all'
  const coalType = filters?.coalType ?? 'all'
  const jsPayload = jsResourcesPayload(region, coalType, 'unavailable')

  const [reservesRemote, prodRemote, assetsRemote, companiesRemote, regionsRemote] =
    await Promise.all([
      fetchPublishedReserves(),
      fetchPublishedProduction(),
      fetchPublishedCoalAssets(),
      fetchPublishedCompanies(),
      fetchPublishedRegions(),
    ])

  let payload = {
    ...jsPayload,
    reserves: [],
    extraction: [],
    assets: [],
    companiesRemoteCount: companiesRemote.ok ? companiesRemote.count : null,
    regionsRemoteCount: regionsRemote.ok ? regionsRemote.count : null,
  }

  const reservesCmp = reservesRemote.ok ? compareReserves(reservesRemote.rows) : null
  if (reservesCmp?.matched) {
    payload = {
      ...payload,
      reserves: reservesCmp.national,
      reservesDataOrigin: 'supabase',
      reservesRemoteCount: reservesRemote.count,
    }
  } else {
    payload = {
      ...payload,
      reserves: [],
      reservesDataOrigin: 'unavailable',
      reservesRemoteCount: reservesRemote.count,
    }
  }

  const productionCmp = prodRemote.ok ? compareNationalProduction(prodRemote.rows) : null
  if (productionCmp?.matched) {
    payload = {
      ...payload,
      extraction: productionCmp.extraction,
      extractionDataOrigin: 'supabase',
      productionRemoteCount: prodRemote.count,
    }
  } else {
    payload = {
      ...payload,
      extraction: [],
      extractionDataOrigin: 'unavailable',
      productionRemoteCount: prodRemote.count,
    }
  }

  const assetsCmp =
    assetsRemote.ok && companiesRemote.ok && regionsRemote.ok
      ? compareCoalAssets(assetsRemote.rows, {
          capacityRows: prodRemote.ok ? prodRemote.rows.filter((row) => row.measure_kind === 'capacity') : [],
          companyReserveRows: reservesCmp?.matched ? reservesCmp.companyRows : [],
          productionOk: Boolean(prodRemote.ok && productionCmp?.matched),
        })
      : null

  if (assetsCmp?.matched) {
    const assets = filterAssets([...assetsCmp.assets, ...jsOnlyResourceAssets()], region, coalType)
    payload = {
      ...payload,
      assets,
      assetsEmpty:
        assets.length === 0
          ? 'Нет подтвержденных данных по выбранному срезу в каталоге ключевых угольных активов.'
          : null,
      assetsDataOrigin: 'supabase',
      assetsRemoteCount: assetsRemote.count,
    }
  } else {
    payload = {
      ...payload,
      assets: [],
      assetsEmpty: 'Нет подтвержденных данных',
      assetsDataOrigin: 'unavailable',
      assetsRemoteCount: assetsRemote.count,
    }
  }

  return payload
}

function jsOnlyResourceAssets() {
  return coalAssets
    .filter((item) => item.id === 'karaganda-basin')
    .map((item) => ({ ...item, origin: 'js-catalog' }))
}

function filterAssets(assets, region, coalType) {
  return assets.filter((item) => {
    const regionOk = region === 'all' || item.regionId === region
    const segmentOk =
      coalType === 'all' || (item.segmentIds.length > 0 && item.segmentIds.includes(coalType))
    return regionOk && segmentOk
  })
}

function jsResourcesPayload(region, coalType, origin, extra = {}) {
  const assets = filterAssets(coalAssets, region, coalType)
  return {
    reserves: reserveAccounts,
    extraction: extractionAccounts,
    assets,
    guide: resourceGuide,
    assetsEmpty:
      assets.length === 0
        ? `${SLICE_EMPTY} В каталоге ключевых активов нет observation для этого региона и сегмента.`
        : null,
    reservesDataOrigin: origin,
    extractionDataOrigin: origin,
    assetsDataOrigin: origin,
    ...extra,
  }
}

export async function getProduction() {
  const [prodRemote, tradeRemote, industryRemote] = await Promise.all([
    fetchPublishedProduction(),
    fetchPublishedTrade(),
    fetchPublishedIndustryIndicators(),
  ])

  let payload = jsProductionPayload('unavailable')

  if (!prodRemote.ok) {
    payload = {
      ...payload,
      extraction: [],
      plan: null,
      productionDataOrigin: 'unavailable',
      productionError: prodRemote.error,
    }
  } else {
    const comparison = compareNationalProduction(prodRemote.rows)
    if (!comparison.matched) {
      payload = {
        ...payload,
        extraction: [],
        plan: null,
        productionDataOrigin: 'unavailable',
        productionError: comparison.reason,
        productionRemoteCount: prodRemote.count,
      }
    } else {
      payload = {
        ...payload,
        extraction: comparison.extraction,
        plan: comparison.plan,
        productionDataOrigin: 'supabase',
        productionRemoteCount: prodRemote.count,
      }
    }
  }

  if (!tradeRemote.ok) {
    payload = {
      ...payload,
      flows: [],
      flowsDataOrigin: 'unavailable',
      flowsError: tradeRemote.error,
    }
  } else {
    const comparison = compareTrade(tradeRemote.rows)
    if (!comparison.matched) {
      payload = {
        ...payload,
        flows: [],
        flowsDataOrigin: 'unavailable',
        flowsError: comparison.reason,
        tradeRemoteCount: tradeRemote.count,
      }
    } else {
      payload = {
        ...payload,
        flows: comparison.flows,
        flowsDataOrigin: 'supabase',
        tradeRemoteCount: tradeRemote.count,
      }
    }
  }

  if (!industryRemote.ok) {
    payload = {
      ...payload,
      investments: [],
      users: null,
      indicatorsDataOrigin: 'unavailable',
      indicatorsError: industryRemote.error,
    }
  } else {
    const comparison = compareIndustryIndicators(industryRemote.rows)
    if (!comparison.matched) {
      payload = {
        ...payload,
        investments: [],
        users: null,
        indicatorsDataOrigin: 'unavailable',
        indicatorsError: comparison.reason,
        industryRemoteCount: industryRemote.count,
      }
    } else {
      payload = {
        ...payload,
        investments: comparison.investments,
        users: comparison.users,
        indicatorsDataOrigin: 'supabase',
        industryRemoteCount: industryRemote.count,
      }
    }
  }

  const fromProductionDb = payload.productionDataOrigin === 'supabase'
  const bnsSeries = prodRemote.ok ? mapBnsIndustrialSeries(prodRemote.rows) : []
  const hsAnnual = tradeRemote.ok ? mapHs2701AnnualNational(tradeRemote.rows) : []
  const ministryFlows = tradeRemote.ok
    ? mapMinistry2025Flows(tradeRemote.rows)
    : { domestic: null, export: null }
  const ministryProduction = fromProductionDb
    ? payload.extraction.find((item) => item.id === 'minenergoExtraction2025') || null
    : null
  const resourceAccount = fromProductionDb
    ? payload.extraction.find((item) => item.id === 'bnsExtraction2024') || null
    : null
  const plan = fromProductionDb ? payload.plan : null
  const hsYtd2026 = tradeRemote.ok
    ? Boolean(nationalExportRow(tradeRemote.rows, EXPORT_PERIODS.ytd2026)?.volume)
    : false

  payload.bnsSeries = bnsSeries
  payload.bnsInsights = deriveBnsSeriesInsights(bnsSeries)
  payload.bnsSourceId = INDUSTRY_PRODUCTION_SOURCE
  payload.ministryProduction = ministryProduction
  payload.ministryDomestic = ministryFlows.domestic
  payload.ministryExport = ministryFlows.export
  payload.ministryBalance = buildMinistryBalance(
    ministryProduction,
    ministryFlows.domestic,
    ministryFlows.export,
  )
  payload.hsAnnual = hsAnnual
  payload.resourceAccount = resourceAccount
  if (!fromProductionDb) payload.plan = null
  payload.availability = buildProductionAvailability({
    bnsSeries,
    ministryBalance: payload.ministryBalance,
    hsAnnual,
    hsYtd2026,
    plan,
  })

  return payload
}

function findUniqueMinenergoNationalProduction(rows, spec) {
  const matches = (rows || []).filter((row) => {
    if (row.asset_id || row.company_id || row.region_id) return false
    if (row.measure_kind !== spec.measureKind) return false
    if (row.year !== spec.year) return false
    if (row.source?.code !== 'minenergo2025') return false
    if (row.period_type !== spec.periodType) return false
    if (row.data_status !== spec.dataStatus) return false
    if (row.unit !== 'млн т') return false
    return true
  })
  return matches.length === 1 ? matches[0] : null
}

export async function getOutlook() {
  const [
    productionRemote,
    industryRemote,
    programsRemote,
    indicatorsRemote,
    projectsRemote,
    directionsRemote,
    measuresRemote,
  ] = await Promise.all([
    fetchPublishedProduction(),
    fetchPublishedIndustryIndicators(),
    fetchPublishedStrategicPrograms(),
    fetchPublishedProgramIndicators(),
    fetchPublishedGenerationProjects(),
    fetchPublishedChemistryDirections(),
    fetchPublishedProgramMeasures(),
  ])

  const remotes = [
    productionRemote,
    industryRemote,
    programsRemote,
    indicatorsRemote,
    projectsRemote,
    directionsRemote,
    measuresRemote,
  ]
  if (!remotes.some((item) => item.ok)) {
    throw new Error(productionRemote.error || 'Подключение к данным временно недоступно.')
  }

  const productionRows = productionRemote.ok ? productionRemote.rows : []
  const industryRows = industryRemote.ok ? industryRemote.rows : []
  const programs = programsRemote.ok ? programsRemote.rows : []
  const indicators = indicatorsRemote.ok ? indicatorsRemote.rows : []
  const projects = projectsRemote.ok ? projectsRemote.rows : []
  const directions = directionsRemote.ok ? directionsRemote.rows : []
  const measures = measuresRemote.ok ? measuresRemote.rows : []

  const ministryNationalActual2025 = findUniqueMinenergoNationalProduction(productionRows, {
    year: 2025,
    measureKind: 'actual',
    periodType: 'year',
    dataStatus: 'official',
  })
  const bnsNationalActual2025 = productionRows.find(
    (row) =>
      !row.asset_id &&
      !row.company_id &&
      !row.region_id &&
      row.measure_kind === 'actual' &&
      row.year === 2025 &&
      row.source?.code === 'bnsIndustryCoalProduction',
  )
  const ministryNationalPlan2026 = findUniqueMinenergoNationalProduction(productionRows, {
    year: 2026,
    measureKind: 'plan',
    periodType: 'plan_year',
    dataStatus: 'plan',
  })
  const shubarkolPlan2026 = productionRows.find(
    (row) =>
      row.company?.code === 'shubarkol-komir' &&
      row.measure_kind === 'plan' &&
      row.year === 2026,
  )
  const shubarkolCapacity = pickPreferredSeries(
    productionRows.filter(
      (row) =>
        row.coal_asset?.code === 'shubarkol-company' && row.measure_kind === 'capacity',
    ),
  )
  const bogatyrActual2024 = pickPreferredSeries(
    productionRows.filter(
      (row) =>
        row.company?.code === 'bogatyr-komir' &&
        row.coal_asset?.code === 'bogatyr-company' &&
        row.measure_kind === 'actual' &&
        row.year === 2024,
    ),
  )
  const bogatyrActualLatest = productionRows
    .filter(
      (row) =>
        row.company?.code === 'bogatyr-komir' &&
        row.coal_asset?.code === 'bogatyr-company' &&
        row.measure_kind === 'actual' &&
        row.unit === 'млн т' &&
        typeof row.year === 'number',
    )
    .reduce((best, row) => (!best || row.year > best.year ? row : best), null)
  const bogatyrPlan2026 = productionRows.find(
    (row) =>
      row.company?.code === 'bogatyr-komir' &&
      row.coal_asset?.code === 'bogatyr-company' &&
      row.measure_kind === 'plan' &&
      row.year === 2026,
  )
  const bogatyrTarget2032 = productionRows.find(
    (row) =>
      row.company?.code === 'bogatyr-komir' &&
      row.coal_asset?.code === 'bogatyr-company' &&
      row.measure_kind === 'target' &&
      row.year === 2032,
  )
  const bogatyrCapacity = productionRows.find(
    (row) =>
      row.coal_asset?.code === 'bogatyr-company' && row.measure_kind === 'capacity',
  )

  const shubarkolActuals = productionRows.filter(
    (row) =>
      row.company?.code === 'shubarkol-komir' &&
      row.coal_asset?.code === 'shubarkol-company' &&
      row.measure_kind === 'actual' &&
      row.unit === 'млн т' &&
      typeof row.year === 'number',
  )
  const shubarkolHistoricalActuals = shubarkolActuals
    .filter((row) => row.year < 2024)
    .sort((a, b) => b.year - a.year)

  const karazhyraActuals = productionRows.filter(
    (row) =>
      row.company?.code === 'karazhyra' &&
      row.measure_kind === 'actual' &&
      row.unit === 'млн т' &&
      typeof row.year === 'number',
  )
  const karazhyraActualCanonical = pickPreferredSeries(karazhyraActuals.filter((row) => row.year === 2024))
  const karazhyraHistoricalActuals = karazhyraActuals
    .filter((row) => row.year < 2024)
    .sort((a, b) => b.year - a.year)

  const maikubenActuals = productionRows.filter(
    (row) =>
      row.company?.code === 'maikuben-west' &&
      row.measure_kind === 'actual' &&
      row.unit === 'млн т' &&
      typeof row.year === 'number',
  )
  const maikubenActualCanonical = pickPreferredSeries(maikubenActuals.filter((row) => row.year === 2024))
  const maikubenHistoricalActuals = maikubenActuals
    .filter((row) => row.year < 2024)
    .sort((a, b) => b.year - a.year)
  const maikubenCapacity = pickPreferredSeries(
    productionRows.filter(
      (row) =>
        row.company?.code === 'maikuben-west' &&
        row.coal_asset?.code === 'maikuben-pit' &&
        row.measure_kind === 'capacity',
    ),
  )

  const investmentFact = industryRows.find(
    (row) =>
      row.year === 2025 &&
      !row.is_approximate &&
      typeof row.unit === 'string' &&
      row.unit.includes('тенге'),
  )
  const investmentExpectation = industryRows.find(
    (row) =>
      row.year === 2026 &&
      Boolean(row.is_approximate) &&
      typeof row.unit === 'string' &&
      row.unit.includes('тенге'),
  )
  const coalPlots = industryRows.find(
    (row) =>
      row.data_status === 'plan' &&
      row.unit === 'участков' &&
      row.year === 2026,
  )

  const nationalProgram = programs.find((row) => row.program_type === 'national_project') || null
  const shubarkolProgram =
    programs.find(
      (row) => row.program_type === 'company_strategy' && row.company?.code === 'shubarkol-komir',
    ) || null
  const bogatyrProgram =
    programs.find(
      (row) => row.program_type === 'company_strategy' && row.company?.code === 'bogatyr-komir',
    ) || null
  const chemistryProgram = programs.find((row) => row.program_type === 'roadmap') || null
  const heatingProgram = programs.find((row) => row.program_type === 'seasonal_plan') || null

  const nationalIndicators = nationalProgram
    ? indicators.filter((row) => row.program_id === nationalProgram.id)
    : []
  const nationalCoreIndicators = nationalIndicators.filter(
    (row) => row.indicator_kind === 'capacity' || row.indicator_kind === 'count',
  )
  const shubarkolIndicators = shubarkolProgram
    ? indicators.filter((row) => row.program_id === shubarkolProgram.id)
    : []
  const bogatyrIndicators = bogatyrProgram
    ? indicators.filter((row) => row.program_id === bogatyrProgram.id)
    : []
  const heatingIndicators = heatingProgram
    ? indicators.filter((row) => row.program_id === heatingProgram.id)
    : []

  const additionalDemand = indicators.find(
    (row) =>
      row.indicator_kind === 'demand' &&
      row.value_qualifier === 'about' &&
      row.year === 2030,
  )
  const energyNeed2032 = indicators.find(
    (row) =>
      row.indicator_kind === 'demand' &&
      row.value_qualifier === 'more_than' &&
      row.year === 2032,
  )
  const gondolaSupport = indicators.find(
    (row) =>
      row.indicator_kind === 'infrastructure' &&
      row.unit === 'ед. в сутки',
  )

  const investmentParent = shubarkolIndicators.find(
    (row) => row.indicator_kind === 'investment' && !row.parent_indicator_id,
  )
  const investmentChildren = investmentParent
    ? shubarkolIndicators.filter((row) => row.parent_indicator_id === investmentParent.id)
    : []
  const bogatyrInvestment = bogatyrIndicators.find(
    (row) => row.indicator_kind === 'investment' && !row.parent_indicator_id,
  )

  const heatingTotal = heatingIndicators.find(
    (row) => row.indicator_kind === 'demand' && !row.parent_indicator_id,
  )
  const heatingInfrastructure = heatingIndicators.filter(
    (row) => row.indicator_kind === 'infrastructure',
  )

  const newBuildProjects = nationalProgram
    ? projects
        .filter(
          (row) => row.program_id === nationalProgram.id && row.project_type === 'new_build',
        )
        .sort((a, b) => (b.capacity_mw ?? 0) - (a.capacity_mw ?? 0))
    : []

  const chemistryDirections = chemistryProgram
    ? directions.filter((row) => row.program_id === chemistryProgram.id)
    : []
  const shubarkolMeasures = shubarkolProgram
    ? measures.filter((row) => row.program_id === shubarkolProgram.id)
    : []
  const bogatyrMeasures = bogatyrProgram
    ? measures.filter((row) => row.program_id === bogatyrProgram.id)
    : []
  const chemistryMeasures = chemistryProgram
    ? measures.filter((row) => row.program_id === chemistryProgram.id)
    : []
  const railMeasure = nationalProgram
    ? measures.find(
        (row) =>
          row.program_id === nationalProgram.id &&
          typeof row.name === 'string' &&
          row.name.toLowerCase().includes('железнодорож'),
      ) || null
    : null

  return {
    phase1Error: {
      production: productionRemote.ok ? null : productionRemote.error,
      industry: industryRemote.ok ? null : industryRemote.error,
    },
    phase2Error: {
      programs: programsRemote.ok ? null : programsRemote.error,
      indicators: indicatorsRemote.ok ? null : indicatorsRemote.error,
      projects: projectsRemote.ok ? null : projectsRemote.error,
      directions: directionsRemote.ok ? null : directionsRemote.error,
      measures: measuresRemote.ok ? null : measuresRemote.error,
    },
    trajectory: {
      actualExtraction: mapOutlookMetric(ministryNationalActual2025, {
        status: 'ФАКТ',
        period: ministryNationalActual2025 ? String(ministryNationalActual2025.year) : null,
        note: 'Фактическая добыча. Не план 2026 года. Контур Министерства энергетики, не промышленный ряд БНС.',
      }),
      plannedExtraction: mapOutlookMetric(ministryNationalPlan2026, {
        status: 'ПЛАН',
        period: ministryNationalPlan2026 ? String(ministryNationalPlan2026.year) : null,
        note: 'План добычи Казахстана. Не факт 2026 года и не сумма с планом отдельного предприятия.',
      }),
      extractionChange: null,
      investmentFact: mapOutlookMetric(investmentFact, {
        status: 'ФАКТ',
        period: investmentFact ? String(investmentFact.year) : null,
        label: investmentFact?.indicator,
        note: investmentFact?.notes || 'Фактические отраслевые инвестиции.',
      }),
      investmentExpectation: mapOutlookMetric(investmentExpectation, {
        status: 'ОЖИДАНИЕ',
        period: investmentExpectation ? String(investmentExpectation.year) : null,
        label: investmentExpectation?.indicator,
        note: investmentExpectation?.notes || 'Ожидание, не исполненный факт.',
      }),
      investmentChange: null,
      companyPlan: mapOutlookMetric(shubarkolPlan2026, {
        status: 'ПЛАН',
        period: shubarkolPlan2026 ? String(shubarkolPlan2026.year) : null,
        label: shubarkolPlan2026
          ? `План добычи ${shubarkolPlan2026.company?.short_name || shubarkolPlan2026.company?.name || 'предприятия'}`
          : null,
        note: 'План предприятия внутри национального рынка. Не складывается с республиканским планом.',
      }),
    },
    industryOutlook: {
      additionalDemand: mapOutlookMetric(additionalDemand, {
        status: 'ПЛАН',
        period: additionalDemand ? String(additionalDemand.year) : null,
        label: 'дополнительный спрос на энергетический уголь к 2030 году',
        note: additionalDemand?.methodology_note,
      }),
      energyNeed: mapOutlookMetric(energyNeed2032, {
        status: 'ПЛАН',
        period: energyNeed2032 ? String(energyNeed2032.year) : null,
        label: 'потребность в энергетическом угле для новых энергетических проектов',
        note: energyNeed2032?.methodology_note,
      }),
      gondolas: mapOutlookMetric(gondolaSupport, {
        status: 'ПЛАН',
        period: gondolaSupport ? String(gondolaSupport.year) : null,
        label: 'предусмотренное дополнительное обеспечение полувагонами',
        note: gondolaSupport?.methodology_note,
      }),
      railMeasure: railMeasure ? mapOutlookMeasure(railMeasure) : null,
      coalPlots: mapOutlookMetric(coalPlots, {
        status: 'ПЛАН',
        period: coalPlots ? 'до конца 2026' : null,
        label: coalPlots?.indicator,
    note: coalPlots?.notes,
      }),
    },
    nationalProject: nationalProgram
      ? {
          program: mapOutlookProgram(nationalProgram),
          indicators: nationalCoreIndicators.map((row) =>
            mapOutlookMetric(row, {
              status: roleFromProgram(nationalProgram),
              period: programHorizon(nationalProgram),
              note: row.methodology_note,
            }),
          ),
          projects: newBuildProjects.map((row) => ({
            id: row.id,
            program_id: row.program_id,
            name: row.name,
            location_name: row.location_name || null,
            capacity_mw: row.capacity_mw,
            status: row.status === 'approved' ? 'УТВЕРЖДЁННАЯ ПРОГРАММА' : 'ПЛАН',
            sourceId: row.source?.code || null,
            source_id: row.source_id,
          })),
        }
      : null,
    producerCase: {
      program: shubarkolProgram ? mapOutlookProgram(shubarkolProgram) : null,
      plan: mapOutlookMetric(shubarkolPlan2026, {
        status: 'ПЛАН',
        period: shubarkolPlan2026 ? String(shubarkolPlan2026.year) : null,
        note: 'План добычи на календарный год. Не производственная мощность.',
      }),
      capacity: mapOutlookMetric(shubarkolCapacity, {
        status: 'Данные предприятия',
        period: shubarkolCapacity
          ? `${shubarkolCapacity.year ?? ''}`.trim() || null
          : null,
        note: 'Указанная производственная мощность в источнике этапа 1. Не план добычи.',
      }),
      actualHistorical: shubarkolHistoricalActuals.map((row) =>
        mapOutlookMetric(row, {
          status: 'ФАКТ',
          period: String(row.year),
          note: 'Историческая фактическая добыча. Не канонический факт для сравнения с планом 2026 года.',
        }),
      ),
      investmentParent: mapOutlookMetric(investmentParent, {
        status: shubarkolProgram ? roleFromProgram(shubarkolProgram) : 'ПЛАН',
        period: shubarkolProgram ? programHorizon(shubarkolProgram) : null,
        note: investmentParent?.methodology_note,
      }),
      investmentParts: investmentChildren.map((row) =>
        mapOutlookMetric(row, {
          status: 'ПЛАН',
          period: shubarkolProgram ? programHorizon(shubarkolProgram) : null,
          note: row.methodology_note,
          parentId: row.parent_indicator_id,
        }),
      ),
      measures: shubarkolMeasures.map(mapOutlookMeasure),
    },
    bogatyrCase: {
      program: bogatyrProgram ? mapOutlookProgram(bogatyrProgram) : null,
      actual: mapOutlookMetric(bogatyrActual2024, {
        status: 'ФАКТ',
        period: bogatyrActual2024 ? String(bogatyrActual2024.year) : null,
        note: 'Фактическая добыча. Не производственная мощность.',
      }),
      actualLatest: mapOutlookMetric(bogatyrActualLatest, {
        status: 'ФАКТ',
        period: bogatyrActualLatest ? String(bogatyrActualLatest.year) : null,
        note: 'Последний подтверждённый факт добычи этого контура. Не мощность и не план. Ряд мониторинга 2024 остаётся отдельным.',
      }),
      plan: mapOutlookMetric(bogatyrPlan2026, {
        status: 'ПЛАН',
        period: bogatyrPlan2026 ? String(bogatyrPlan2026.year) : null,
        note: 'План добычи. Не факт и не целевой показатель 2032 года.',
      }),
      target: mapOutlookMetric(bogatyrTarget2032, {
        status: 'ЦЕЛЕВОЙ ПОКАЗАТЕЛЬ',
        period: bogatyrTarget2032 ? String(bogatyrTarget2032.year) : null,
        note: 'Целевой показатель горизонта. Не факт добычи и не мощность.',
      }),
      capacity: mapOutlookMetric(bogatyrCapacity, {
        status: 'Данные предприятия',
        period: null,
        note: 'Заявленная производственная мощность из отдельного корпоративного источника. Не факт добычи 42,7 млн т.',
      }),
      investment: mapOutlookMetric(bogatyrInvestment, {
        status: bogatyrProgram ? roleFromProgram(bogatyrProgram) : 'ПЛАН',
        period: bogatyrProgram ? programHorizon(bogatyrProgram) : null,
        note: bogatyrInvestment?.methodology_note,
      }),
      measures: bogatyrMeasures.map(mapOutlookMeasure),
    },
    karazhyraCase: {
      actual: mapOutlookMetric(karazhyraActualCanonical, {
        status: 'ФАКТ',
        period: karazhyraActualCanonical ? String(karazhyraActualCanonical.year) : null,
        note: 'Фактическая добыча АО «Каражыра». Не продажа и не заявленная мощность.',
      }),
      actualLatest: mapOutlookMetric(karazhyraActualCanonical, {
        status: 'ФАКТ',
        period: karazhyraActualCanonical ? String(karazhyraActualCanonical.year) : null,
        note: 'Канонический факт: полный год 2024. Не мощность «7,5–8».',
      }),
      actualHistorical: karazhyraHistoricalActuals.map((row) =>
        mapOutlookMetric(row, {
          status: 'ФАКТ',
          period: String(row.year),
          note: 'Историческая фактическая добыча. Не канонический факт текущего сравнения.',
        }),
      ),
      plan: null,
      target: null,
      capacity: null,
    },
    maikubenCase: {
      actual: mapOutlookMetric(maikubenActualCanonical, {
        status: 'ФАКТ',
        period: maikubenActualCanonical ? String(maikubenActualCanonical.year) : null,
        note: 'Фактическая добыча АО «Майкубен-Вест» за 2024 год. Не мощность 5,2.',
      }),
      actualLatest: mapOutlookMetric(maikubenActualCanonical, {
        status: 'ФАКТ',
        period: maikubenActualCanonical ? String(maikubenActualCanonical.year) : null,
        note: 'Канонический факт: полный год 2024. Ряд 2025 не принимается без годового отчёта эмитента с показателем добычи.',
      }),
      actualHistorical: maikubenHistoricalActuals.map((row) =>
        mapOutlookMetric(row, {
          status: 'ФАКТ',
          period: String(row.year),
          note:
            row.series_role === 'original'
              ? 'Конфликт 2023: original 3,8 (отчёт 2023). Не канонический факт.'
              : row.series_role === 'revised'
                ? 'Конфликт 2023: revised 4,0 (ретроспектива отчёта 2024). Не канонический факт.'
                : 'Историческая фактическая добыча. Не канонический факт.',
        }),
      ),
      plan: null,
      target: null,
      capacity: mapOutlookMetric(maikubenCapacity, {
        status: 'Данные предприятия',
        period: null,
        note: 'Проектная мощность разреза по годовому отчёту 2024. Не факт добычи.',
      }),
    },
    heating: heatingProgram
      ? {
          program: mapOutlookProgram(heatingProgram),
          total: mapOutlookMetric(heatingTotal, {
            status: 'СЕЗОННАЯ ПОТРЕБНОСТЬ',
            period: programHorizon(heatingProgram),
            note: heatingTotal?.methodology_note,
          }),
          parts: [],
          infrastructure: heatingInfrastructure.map((row) =>
            mapOutlookMetric(row, {
              status: 'СЕЗОННАЯ ПОТРЕБНОСТЬ',
              period: programHorizon(heatingProgram),
              note: row.methodology_note,
            }),
          ),
        }
      : null,
    chemistry: chemistryProgram
      ? {
          program: mapOutlookProgram(chemistryProgram),
          directions: chemistryDirections.map((row) => ({
            id: row.id,
            program_id: row.program_id,
            name: row.name,
            description: row.description || null,
            sourceId: row.source?.code || null,
            source_id: row.source_id,
          })),
          measures: chemistryMeasures.map(mapOutlookMeasure),
        }
      : null,
    targetMonitor: assembleTargetMonitor({
      ministryPlan: ministryNationalPlan2026,
      ministryActual: ministryNationalActual2025,
      bnsActual2025: bnsNationalActual2025,
      bogatyrPlan: bogatyrPlan2026,
      bogatyrActual: bogatyrActualLatest || bogatyrActual2024,
      bogatyrTarget2032,
      investmentFact,
      investmentExpectation,
      coalPlots,
      shubarkolPlan: shubarkolPlan2026,
    }),
  }
}

function mapOutlookProgram(row) {
  return {
    id: row.id,
    name: row.name,
    program_type: row.program_type,
    status: roleFromProgram(row),
    start_year: row.start_year,
    end_year: row.end_year,
    horizon: programHorizon(row),
    company_id: row.company_id,
    companyName: row.company?.name || row.company?.short_name || null,
    sourceId: row.source?.code || null,
    source_id: row.source_id,
    methodology_note: row.methodology_note || null,
  }
}

function mapOutlookMetric(row, extras = {}) {
  if (!row) return null
  return {
    id: row.id,
    label: extras.label || row.name || row.indicator,
    value: row.value,
    unit: row.unit,
    year: row.year ?? null,
    period: extras.period || null,
    status: extras.status,
    sourceId: row.source?.code || null,
    source_id: row.source_id,
    approx: Boolean(row.is_approximate),
    note: extras.note || row.methodology_note || row.notes || null,
    company_id: row.company_id || null,
    company_code: row.company?.code || extras.company_code || null,
    coal_asset_code: row.coal_asset?.code || extras.coal_asset_code || null,
    program_id: row.program_id || null,
    parent_indicator_id: extras.parentId || row.parent_indicator_id || null,
    indicator_kind: row.indicator_kind || null,
    measure_kind: row.measure_kind || null,
    series_role: row.series_role || null,
    value_qualifier: row.value_qualifier || (row.is_approximate ? 'about' : 'exact'),
  }
}

function mapOutlookMeasure(row) {
  return {
    id: row.id,
    program_id: row.program_id,
    company_id: row.company_id,
    name: row.name,
    description: row.description || null,
    measure_type: row.measure_type,
    sourceId: row.source?.code || null,
    source_id: row.source_id,
  }
}

function roleFromProgram(program) {
  if (program.status === 'approved') return 'УТВЕРЖДЁННАЯ ПРОГРАММА'
  if (program.status === 'roadmap') return 'ДОРОЖНАЯ КАРТА'
  if (program.status === 'seasonal_plan') return 'СЕЗОННАЯ ПОТРЕБНОСТЬ'
  if (program.status === 'planned') return 'ПЛАН'
  return program.status
}

function programHorizon(program) {
  if (!program) return null
  if (program.start_year && program.end_year && program.start_year !== program.end_year) {
    return `${program.start_year}–${program.end_year}`
  }
  if (program.start_year) return String(program.start_year)
  if (program.end_year) return String(program.end_year)
  return null
}

function jsProductionPayload(origin, extra = {}) {
  return {
    extraction: [],
    flows: [],
    investments: [],
    users: null,
    plan: null,
    missingMonthly: [unavailable.monthlyProduction2026, unavailable.monthlyExport2026],
    bnsSeries: [],
    bnsInsights: null,
    bnsSourceId: INDUSTRY_PRODUCTION_SOURCE,
    ministryProduction: null,
    ministryDomestic: null,
    ministryExport: null,
    ministryBalance: null,
    hsAnnual: [],
    resourceAccount: null,
    availability: [],
    productionDataOrigin: origin,
    flowsDataOrigin: origin,
    indicatorsDataOrigin: origin,
    ...extra,
  }
}

function valuesClose(a, b) {
  const left = numericValue(a)
  const right = numericValue(b)
  if (left === null || right === null) return false
  return Math.abs(left - right) < 1e-6
}

function pickPreferredSeries(rows) {
  if (!rows?.length) return null
  const revised = rows.filter((row) => row.series_role === 'revised')
  if (revised.length === 1) return revised[0]
  if (revised.length > 1) return revised[0]
  const current = rows.filter((row) => row.series_role !== 'original')
  return current[0] || rows[0] || null
}

function findUniqueMatch(rows, predicate, label) {
  const matches = rows.filter(predicate)
  if (matches.length === 0) {
    return { error: `Не совпал показатель ${label}.` }
  }
  if (matches.length > 1) {
    return { error: `Найдено несколько записей для показателя ${label}.` }
  }
  return { row: matches[0] }
}

function isNationalVolumeRow(row) {
  return (
    !row.asset_id &&
    !row.company_id &&
    !row.region_id &&
    (row.measure_kind === 'actual' || row.measure_kind === 'plan')
  )
}

function compareNationalProduction(rows) {
  const expected = [
    {
      catalogId: 'bnsExtraction2024',
      value: extractionAccounts[0].value,
      year: 2024,
      unit: extractionAccounts[0].unit,
      measure_kind: 'actual',
      data_status: 'official',
      sourceCode: 'bnsReserves2024',
      catalogItem: extractionAccounts[0],
    },
    {
      catalogId: 'minenergoExtraction2025',
      value: extractionAccounts[1].value,
      year: 2025,
      unit: extractionAccounts[1].unit,
      measure_kind: 'actual',
      data_status: 'official',
      sourceCode: 'minenergo2025',
      catalogItem: extractionAccounts[1],
    },
    {
      catalogId: 'plan2026',
      value: kpis.find((item) => item.id === 'plan2026').value,
      year: 2026,
      unit: kpis.find((item) => item.id === 'plan2026').unit,
      measure_kind: 'plan',
      data_status: 'plan',
      sourceCode: 'minenergo2025',
      catalogItem: kpis.find((item) => item.id === 'plan2026'),
    },
  ]

  const mapped = []

  for (const item of expected) {
    const found = findUniqueMatch(
      rows,
      (row) =>
        isNationalVolumeRow(row) &&
        valuesClose(row.value, item.value) &&
        row.year === item.year &&
        row.unit === item.unit &&
        row.measure_kind === item.measure_kind &&
        row.data_status === item.data_status &&
        row.source?.code === item.sourceCode,
      item.catalogId,
    )
    if (found.error) {
      return { matched: false, reason: found.error }
    }
    mapped.push({ expected: item, row: found.row })
  }

  const extraction = mapped
    .filter((item) => item.expected.measure_kind === 'actual')
    .map(({ expected, row }) => ({
      ...expected.catalogItem,
      id: expected.catalogItem.id,
      value: row.value,
      unit: row.unit,
      sourceId: row.source?.code || expected.catalogItem.sourceId,
      status: INDICATOR_STATUS[row.data_status] || expected.catalogItem.status,
      methodology: row.notes || expected.catalogItem.methodology,
      origin: 'supabase',
    }))

  const planMapped = mapped.find((item) => item.expected.measure_kind === 'plan')
  const planCatalog = planMapped.expected.catalogItem
  const plan = {
    ...planCatalog,
    value: planMapped.row.value,
    unit: planMapped.row.unit,
    sourceId: planMapped.row.source?.code || planCatalog.sourceId,
    status: INDICATOR_STATUS[planMapped.row.data_status] || planCatalog.status,
    origin: 'supabase',
  }

  return { matched: true, extraction, plan }
}

function mapCatalogIndicator(catalogItem, row, extras = {}) {
  return {
    ...catalogItem,
    value: extras.value ?? catalogItem.value,
    unit: extras.unit ?? catalogItem.unit,
    sourceId: row.source?.code || catalogItem.sourceId,
    status: extras.status
      || (row.is_approximate ? 'ОЖИДАНИЕ' : INDICATOR_STATUS[row.data_status] || catalogItem.status),
    note: row.notes || catalogItem.note,
    approx: extras.approx ?? catalogItem.approx,
    origin: 'supabase',
  }
}

function compareTrade(rows) {
  const expected = [
    {
      catalogItem: flow2025.find((item) => item.id === 'domesticFlow'),
      trade_type: 'domestic_supply',
      volume: 85,
      year: 2025,
    },
    {
      catalogItem: flow2025.find((item) => item.id === 'exportFlow'),
      trade_type: 'export',
      volume: 30,
      year: 2025,
      destinationMustBeNull: true,
    },
  ]
  const used = new Set()
  const flows = []

  for (const item of expected) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
      const destinationOk = item.destinationMustBeNull
        ? row.destination_country == null
        : true
      return (
        row.trade_type === item.trade_type &&
        valuesClose(row.volume, item.volume) &&
        row.volume_unit === item.catalogItem.unit &&
        row.year === item.year &&
        row.value_amount == null &&
        destinationOk &&
        row.source?.code === 'minenergo2025' &&
        row.data_status === 'official'
      )
    })
    if (!match) {
      return {
        matched: false,
        reason: `Не совпал показатель trade «${item.catalogItem.label}».`,
      }
    }
    used.add(match.id)
    flows.push(mapCatalogIndicator(item.catalogItem, match, {
      value: match.volume,
      unit: match.volume_unit,
    }))
  }

  const extra = rows.filter((row) => {
    if (used.has(row.id)) return false
    if (row.hs_code) return false
    if (row.methodology_scope && row.methodology_scope !== 'ministry_coal_exports') return false
    if (row.series_code && row.series_code !== 'ministry_coal_exports' && row.series_code !== 'ministry_domestic_supply') {
      return false
    }
    return true
  })
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В trade есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
  }

  return { matched: true, flows }
}

function compareIndustryIndicators(rows) {
  const usersCatalog = kpis.find((item) => item.id === 'subsoilUsers')
  const expected = [
    {
      kind: 'investment',
      catalogItem: investments[0],
      value: 305,
      year: 2025,
      data_status: 'official',
      is_approximate: false,
    },
    {
      kind: 'investment',
      catalogItem: investments[1],
      value: 553,
      year: 2026,
      data_status: 'plan',
      is_approximate: true,
    },
    {
      kind: 'users',
      catalogItem: usersCatalog,
      value: 40,
      year: null,
      data_status: 'official',
      is_approximate: false,
    },
  ]
  const mapped = []

  for (const item of expected) {
    const found = findUniqueMatch(
      rows,
      (row) =>
        row.indicator === item.catalogItem.label &&
        valuesClose(row.value, item.value) &&
        row.unit === item.catalogItem.unit &&
        row.year === item.year &&
        row.data_status === item.data_status &&
        Boolean(row.is_approximate) === item.is_approximate &&
        row.source?.code === 'minenergo2025',
      `«${item.catalogItem.label}»`,
    )
    if (found.error) {
      return { matched: false, reason: found.error }
    }
    mapped.push({
      kind: item.kind,
      item: mapCatalogIndicator(item.catalogItem, found.row, {
        value: found.row.value,
        unit: found.row.unit,
        approx: Boolean(found.row.is_approximate),
      }),
    })
  }

  return {
    matched: true,
    investments: mapped.filter((row) => row.kind === 'investment').map((row) => row.item),
    users: mapped.find((row) => row.kind === 'users').item,
  }
}

function compareEnergyBalance(rows) {
  const items = []

  for (const catalogItem of energyRole) {
    const match = rows.find((row) => {
      const isHeadline =
        row.dimension == null ||
        row.dimension === '' ||
        row.dimension === 'headline'
      if (!isHeadline) return false
      return (
        row.indicator === catalogItem.label &&
        valuesClose(row.value, catalogItem.value) &&
        row.unit === catalogItem.unit &&
        row.year === 2025 &&
        row.source?.code === 'bnsTeb2025' &&
        row.data_status === 'official'
      )
    })
    if (!match) {
      return {
        matched: false,
        reason: `Не совпал показатель ТЭБ «${catalogItem.label}».`,
      }
    }
    items.push({
      ...mapCatalogIndicator(catalogItem, match, {
        value: match.value,
        unit: match.unit,
      }),
      display: catalogItem.display,
    })
  }

  return { matched: true, items }
}

function compareReserves(rows) {
  const expectedNational = [
    {
      catalogId: 'bnsReservesDetail',
      value: reserveAccounts[0].value,
      unit: reserveAccounts[0].unit,
      reserve_type: 'bns_statistical',
      data_status: 'official',
      sourceCode: 'bnsReserves2024',
      year: 2024,
      catalogItem: reserveAccounts[0],
    },
    {
      catalogId: 'minenergoReserves',
      value: reserveAccounts[1].value,
      unit: reserveAccounts[1].unit,
      reserve_type: 'industry_estimate',
      data_status: 'industry',
      sourceCode: 'minenergo2025',
      year: null,
      catalogItem: reserveAccounts[1],
    },
  ]
  const expectedCompany = {
    catalogId: 'bogatyr-company',
    value: 2.62,
    unit: 'млрд т',
    reserve_type: 'company_balance',
    data_status: 'company',
    sourceCode: 'bogatyrKomir',
    assetCode: 'bogatyr-company',
  }

  const used = new Set()
  const nationalMapped = []

  for (const item of expectedNational) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
      const yearOk = item.year === null ? row.year === null : row.year === item.year
      return (
        !row.asset_id &&
        valuesClose(row.value, item.value) &&
        row.unit === item.unit &&
        row.reserve_type === item.reserve_type &&
        row.data_status === item.data_status &&
        row.source?.code === item.sourceCode &&
        yearOk
      )
    })
    if (!match) {
      return { matched: false, reason: `Не совпал показатель ${item.catalogId}.` }
    }
    used.add(match.id)
    nationalMapped.push({ expected: item, row: match })
  }

  const companyMatch = rows.find((row) => {
    if (used.has(row.id)) return false
    return (
      Boolean(row.asset_id) &&
      valuesClose(row.value, expectedCompany.value) &&
      row.unit === expectedCompany.unit &&
      row.reserve_type === expectedCompany.reserve_type &&
      row.data_status === expectedCompany.data_status &&
      row.source?.code === expectedCompany.sourceCode &&
      row.coal_asset?.code === expectedCompany.assetCode
    )
  })
  if (!companyMatch) {
    return { matched: false, reason: 'Не совпал показатель балансовых запасов ТОО «Богатырь Комир».' }
  }
  used.add(companyMatch.id)

  const extra = rows.filter((row) => !used.has(row.id))
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В reserves есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
  }

  const national = nationalMapped.map(({ expected, row }) => ({
    ...expected.catalogItem,
    value: row.value,
    unit: row.unit,
    display: `${formatNumber(row.value)} ${row.unit}`,
    methodology: row.methodology_note || expected.catalogItem.methodology,
    sourceId: row.source?.code || expected.catalogItem.sourceId,
    status: INDICATOR_STATUS[row.data_status] || expected.catalogItem.status,
    origin: 'supabase',
  }))

  return {
    matched: true,
    national,
    companyRows: [companyMatch],
  }
}

function applyCompanyReserves(assets, companyRows) {
  const byAssetCode = new Map(
    companyRows.map((row) => [row.coal_asset?.code, row]).filter(([code]) => Boolean(code)),
  )
  return assets.map((asset) => {
    const remote = byAssetCode.get(asset.id)
    if (!remote) return asset
    return {
      ...asset,
      reserves: {
        display: `${formatNumber(remote.value)} ${remote.unit}`,
        title:
          remote.methodology_note ||
          'Балансовые запасы ТОО «Богатырь Комир». Не являются запасами всего Экибастузского бассейна.',
      },
      origin: 'supabase',
    }
  })
}

const ASSET_TYPE_LABEL = {
  basin: 'угольный бассейн',
  deposit: 'месторождение',
  mine: 'разрез/предприятие',
  enterprise: 'разрез/предприятие',
}

const COAL_USE_LABEL = {
  energy: 'Энергетический уголь',
  household: 'Коммунально-бытовой уголь',
}

const UNCONFIRMED_CELL = {
  display: '—',
  title: 'Сопоставимые подтвержденные данные пока отсутствуют',
}

const EXPECTED_CAPACITIES = [
  { code: 'bogatyr-company', value: 42, unit: 'млн т в год' },
  { code: 'bogatyr-pit', value: 32, unit: 'млн т в год' },
  { code: 'severny-pit', value: 10, unit: 'млн т в год' },
  { code: 'shubarkol-company', values: [16.9, 12.54], unit: 'млн т в год' },
]

function compareCoalAssets(rows, { capacityRows, companyReserveRows, productionOk }) {
  const expected = coalAssets.filter((item) => item.id !== 'karaganda-basin')
  const used = new Set()
  const mapped = []

  for (const catalogItem of expected) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
      const regionCode = row.region?.code || null
      const catalogRegion = catalogItem.regionId === 'unspecified' ? null : catalogItem.regionId
      const regionOk =
        catalogItem.regionId === 'unspecified' || regionCode === catalogRegion
      const expectedCoalType = catalogItem.segmentIds.includes('household') ? 'household' : 'energy'
      return (
        row.code === catalogItem.id &&
        row.name === catalogItem.name &&
        row.coal_type === expectedCoalType &&
        regionOk &&
        row.source?.code === catalogItem.sourceId &&
        ASSET_TYPE_LABEL[row.asset_type] === catalogItem.objectType
      )
    })
    if (!match) {
      return { matched: false, reason: `Не совпал актив «${catalogItem.name}».` }
    }
    used.add(match.id)
    mapped.push({ catalogItem, row: match })
  }

  const extra = rows.filter((row) => !used.has(row.id))
  if (extra.length > 0 && extra.some((row) => expected.some((item) => item.id === row.code))) {
    return {
      matched: false,
      reason: `В coal_assets есть дубликат записи каталога.`,
    }
  }

  let capacitiesByCode = new Map()
  if (productionOk) {
    const capUsed = new Set()
    for (const item of EXPECTED_CAPACITIES) {
      let match = null
      const wanted = item.values || [item.value]
      for (const value of wanted) {
        match = capacityRows.find((row) => {
          if (capUsed.has(row.id)) return false
          return (
            row.coal_asset?.code === item.code &&
            valuesClose(row.value, value) &&
            row.unit === item.unit &&
            row.measure_kind === 'capacity'
          )
        })
        if (match) break
      }
      if (!match) {
        return { matched: false, reason: `Не совпала мощность актива ${item.code}.` }
      }
      capUsed.add(match.id)
      capacitiesByCode.set(item.code, match)
    }
    const extraCap = capacityRows.filter((row) => !capUsed.has(row.id))
    extraCap.forEach((row) => {
      const code = row.coal_asset?.code
      if (code && !capacitiesByCode.has(code)) capacitiesByCode.set(code, row)
    })
  }

  const reserveByCode = new Map(
    (companyReserveRows || [])
      .map((row) => [row.coal_asset?.code, row])
      .filter(([code]) => Boolean(code)),
  )

  const assets = mapped.map(({ catalogItem, row }) => {
    const capacityRow = capacitiesByCode.get(catalogItem.id)
    const reserveRow = reserveByCode.get(catalogItem.id)
    return {
      ...catalogItem,
      name: row.name,
      objectType: ASSET_TYPE_LABEL[row.asset_type] || catalogItem.objectType,
      regionId: row.region?.code || catalogItem.regionId,
      region: row.region?.name || catalogItem.region,
      operator: row.operator?.name || catalogItem.operator,
      coalUse: COAL_USE_LABEL[row.coal_type] || catalogItem.coalUse,
      note: row.description || catalogItem.note,
      sourceId: row.source?.code || catalogItem.sourceId,
      status:
        row.source?.source_type === 'company'
          ? INDICATOR_STATUS.company
          : row.source?.source_type === 'regional'
            ? INDICATOR_STATUS.regional
            : INDICATOR_STATUS.official,
      reserves: reserveRow
        ? {
            display: `${formatNumber(reserveRow.value)} ${reserveRow.unit}`,
            title:
              reserveRow.methodology_note ||
              'Балансовые запасы ТОО «Богатырь Комир». Не являются запасами всего Экибастузского бассейна.',
          }
        : UNCONFIRMED_CELL,
      capacity: capacityRow
        ? {
            display: `${formatNumber(capacityRow.value)} ${capacityRow.unit}`,
            title: capacityRow.notes || 'Производственная мощность, не фактическая добыча.',
          }
        : UNCONFIRMED_CELL,
      origin: 'supabase',
      sourceUrl: row.source?.url || null,
    }
  })

  return { matched: true, assets }
}

const INDUSTRY_PRODUCTION_SOURCE = 'bnsIndustryCoalProduction'
const INDUSTRY_SERIES_YEARS = [2020, 2021, 2022, 2023, 2024, 2025]
const INDUSTRY_REGION_CODES_2025 = [
  'pavlodar',
  'karaganda',
  'abai',
  'ulytau',
  'zhambyl',
  'east-kazakhstan',
]

function isIndustryNationalRow(row) {
  return (
    !row.asset_id &&
    !row.company_id &&
    !row.region_id &&
    row.measure_kind === 'actual' &&
    row.data_status === 'official' &&
    row.unit === 'млн т' &&
    row.source?.code === INDUSTRY_PRODUCTION_SOURCE
  )
}

function isIndustryRegionalRow(row) {
  return (
    !row.asset_id &&
    !row.company_id &&
    Boolean(row.region_id) &&
    row.measure_kind === 'actual' &&
    row.data_status === 'official' &&
    row.unit === 'млн т' &&
    row.year === 2025 &&
    row.source?.code === INDUSTRY_PRODUCTION_SOURCE
  )
}

function mapGeographyMetric(row, extras = {}) {
  return {
    id: row.id,
    value: row.value,
    unit: row.unit,
    year: row.year,
    period: extras.period || String(row.year),
    sourceId: row.source?.code || INDUSTRY_PRODUCTION_SOURCE,
    name: extras.name || row.region?.name || null,
    regionCode: extras.regionCode || row.region?.code || null,
    regionId: row.region_id || null,
    status: 'Официальные данные',
  }
}

function mapBnsIndustrialSeries(rows) {
  const series = []
  for (const year of INDUSTRY_SERIES_YEARS) {
    const found = findUniqueMatch(
      rows,
      (row) => isIndustryNationalRow(row) && row.year === year,
      `БНС промышленная статистика ${year}`,
    )
    if (found.error) {
      series.push({
        id: null,
        year,
        value: null,
        unit: 'млн т',
        sourceId: INDUSTRY_PRODUCTION_SOURCE,
        period: String(year),
      })
      continue
    }
    series.push({
      id: found.row.id,
      year,
      value: found.row.value,
      unit: found.row.unit,
      sourceId: found.row.source?.code || INDUSTRY_PRODUCTION_SOURCE,
      period: String(year),
    })
  }
  return series
}

function deriveBnsSeriesInsights(series) {
  const present = (series || []).filter((item) => item.value != null)
  if (!present.length) return null
  const byYear = new Map(present.map((item) => [item.year, item]))
  const values = present.map((item) => item.value)
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const maxPoint = present.find((item) => item.value === maxValue)
  const minPoint = present.find((item) => item.value === minValue)
  const v2025 = byYear.get(2025)
  const v2024 = byYear.get(2024)
  const v2020 = byYear.get(2020)

  function change(fromPoint, toPoint) {
    if (!fromPoint || !toPoint || !fromPoint.value) return null
    return {
      fromYear: fromPoint.year,
      toYear: toPoint.year,
      abs: toPoint.value - fromPoint.value,
      pct: ((toPoint.value / fromPoint.value) - 1) * 100,
      note: 'Расчёт Coal Monitor KZ на основе ряда БНС. Не является официальным показателем БНС.',
    }
  }

  return {
    change2025to2024: change(v2024, v2025),
    change2025to2020: change(v2020, v2025),
    max: maxPoint ? { year: maxPoint.year, value: maxPoint.value, unit: maxPoint.unit } : null,
    min: minPoint ? { year: minPoint.year, value: minPoint.value, unit: minPoint.unit } : null,
  }
}

function isMinistryDomestic2025Row(row) {
  const unit = row.volume_unit || row.unit
  return (
    row.trade_type === 'domestic_supply' &&
    row.year === 2025 &&
    unit === 'млн т' &&
    row.data_status === 'official' &&
    !row.hs_code &&
    (row.source?.code === 'minenergo2025'
      || row.series_code === 'ministry_domestic_supply'
      || row.flow === 'domestic_supply')
  )
}

function isMinistryExport2025Row(row) {
  const unit = row.volume_unit || row.unit
  return (
    row.trade_type === 'export' &&
    row.year === 2025 &&
    unit === 'млн т' &&
    row.data_status === 'official' &&
    !row.hs_code &&
    (row.source?.code === 'minenergo2025'
      || row.methodology_scope === 'ministry_coal_exports'
      || row.series_code === 'ministry_coal_exports')
  )
}

function mapMinistry2025Flows(rows) {
  const domesticFound = findUniqueMatch(rows, isMinistryDomestic2025Row, 'Минэнерго внутренний рынок 2025')
  const exportFound = findUniqueMatch(rows, isMinistryExport2025Row, 'Минэнерго экспорт 2025')
  const domesticCatalog = flow2025.find((item) => item.id === 'domesticFlow')
  const exportCatalog = flow2025.find((item) => item.id === 'exportFlow')
  return {
    domestic: domesticFound.row && domesticCatalog
      ? mapCatalogIndicator(domesticCatalog, domesticFound.row, {
          value: domesticFound.row.volume,
          unit: domesticFound.row.volume_unit,
        })
      : null,
    export: exportFound.row && exportCatalog
      ? mapCatalogIndicator(exportCatalog, exportFound.row, {
          value: exportFound.row.volume,
          unit: exportFound.row.volume_unit,
        })
      : null,
  }
}

function buildMinistryBalance(production, domestic, exportFlow) {
  if (!production || !domestic || !exportFlow) return null
  if (!production.value) return null
  return {
    production,
    domestic,
    export: exportFlow,
    domesticShare: domestic.value / production.value,
    exportShare: exportFlow.value / production.value,
    shareNote: 'Расчёт долей Coal Monitor KZ по опубликованным объёмам Минэнерго.',
  }
}

function mapHs2701AnnualNational(rows) {
  return [EXPORT_PERIODS.fy2023, EXPORT_PERIODS.fy2024, EXPORT_PERIODS.fy2025]
    .map((period) => {
      const row = nationalExportRow(rows, period)
      if (!row || row.volume == null) return null
      const millionTons = row.volume_unit === 'млн т' ? row.volume : row.volume / 1_000_000
      const usdMillion =
        row.value_amount == null ? null : row.currency === 'USD' ? row.value_amount / 1_000_000 : null
      return {
        year: period.year,
        millionTons,
        usdMillion,
        volumeUnit: 'млн т',
        sourceId: row.source?.code || 'unComtradeKazHs2701',
      }
    })
    .filter(Boolean)
}

function buildProductionAvailability({ bnsSeries, ministryBalance, hsAnnual, hsYtd2026, plan }) {
  const present = bnsSeries.filter((item) => item.value != null)
  const bnsYears = present.length
    ? `${present[0].year}–${present[present.length - 1].year}`
    : null
  const hsYears = hsAnnual.length
    ? `${hsAnnual[0].year}–${hsAnnual[hsAnnual.length - 1].year}`
    : null
  return [
    {
      id: 'bns-annual',
      state: present.length ? 'available' : 'unpublished',
      stateLabel: present.length ? 'Доступно' : 'Не опубликовано',
      label: 'Годовая добыча',
      context: bnsYears ? `БНС · ${bnsYears}` : 'Нет подтверждённого промышленного ряда',
      action: present.length
        ? { kind: 'anchor', href: '#production-bns-chart', text: 'график выше' }
        : null,
    },
    {
      id: 'minenergo-balance',
      state: ministryBalance ? 'available' : 'unpublished',
      stateLabel: ministryBalance ? 'Доступно' : 'Не опубликовано',
      label: 'Баланс внутренний рынок / экспорт',
      context: ministryBalance
        ? 'Минэнерго · 2025'
        : 'Нет подтверждённых наблюдений 85 и 30 млн т',
      action: ministryBalance
        ? { kind: 'anchor', href: '#production-ministry-balance', text: 'баланс выше' }
        : null,
    },
    {
      id: 'hs2701',
      state: hsAnnual.length ? 'available' : 'unpublished',
      stateLabel: hsAnnual.length ? 'Доступно' : 'Не опубликовано',
      label: 'Внешняя торговля HS2701',
      context: hsYears || 'Нет подтверждённых годовых итогов',
      action: hsAnnual.length
        ? { kind: 'route', to: '/exports', text: 'Экспорт и внешние рынки' }
        : null,
    },
    {
      id: 'hs2701-ytd',
      state: hsYtd2026 ? 'available' : 'unpublished',
      stateLabel: hsYtd2026 ? 'Доступно' : 'Не опубликовано',
      label: 'Jan–Jul 2026 HS2701',
      context: hsYtd2026 ? 'Подтверждённый YTD-ряд' : 'Нет подтверждённого YTD-наблюдения',
      action: hsYtd2026
        ? { kind: 'route', to: '/exports', text: 'Экспорт и внешние рынки' }
        : null,
    },
    {
      id: 'monthly-2026',
      state: 'unpublished',
      stateLabel: 'Не опубликовано',
      label: 'Помесячная добыча 2026',
      context: 'Нет подтверждённого ряда в текущем контуре',
      action: null,
    },
    {
      id: 'fy-2026',
      state: 'unavailable',
      stateLabel: 'Не доступен',
      label: 'Полный год 2026',
      context: 'Годовой подтверждённый факт отсутствует',
      action: null,
    },
    {
      id: 'plan-2026',
      state: plan ? 'plan' : 'unpublished',
      stateLabel: plan ? 'План' : 'Не опубликовано',
      label: 'Добыча 2026',
      context: plan
        ? `Минэнерго · ${formatNumber(plan.value)} ${plan.unit}`
        : 'Нет подтверждённого плана',
      action: plan
        ? { kind: 'anchor', href: '#production-plan', text: 'блок плана выше' }
        : null,
    },
  ]
}

export async function getGeography(filters) {
  const region = filters?.region ?? 'all'
  const [prodRemote, sharesRemote] = await Promise.all([
    fetchPublishedProduction(),
    fetchPublishedMarketShares(),
  ])

  if (!prodRemote.ok) {
    return {
      ok: false,
      error: prodRemote.error || 'Не удалось загрузить данные географии добычи.',
    }
  }

  const seriesRows = []
  for (const year of INDUSTRY_SERIES_YEARS) {
    const found = findUniqueMatch(
      prodRemote.rows,
      (row) => isIndustryNationalRow(row) && row.year === year,
      `БНС промышленная статистика ${year}`,
    )
    if (found.error) {
      return { ok: false, error: found.error }
    }
    seriesRows.push(mapGeographyMetric(found.row, { period: String(year) }))
  }

  const regional = []
  for (const code of INDUSTRY_REGION_CODES_2025) {
    const found = findUniqueMatch(
      prodRemote.rows,
      (row) => isIndustryRegionalRow(row) && row.region?.code === code,
      `БНС область ${code} 2025`,
    )
    if (found.error) {
      return { ok: false, error: found.error }
    }
    regional.push(
      mapGeographyMetric(found.row, {
        name: found.row.region?.name || code,
        regionCode: code,
        period: '2025',
      }),
    )
  }

  const ranking = [...regional].sort((left, right) => right.value - left.value)
  const national2025 = seriesRows.find((row) => row.year === 2025) || null
  const pavlodar = regional.find((row) => row.regionCode === 'pavlodar') || null
  const karaganda = regional.find((row) => row.regionCode === 'karaganda') || null

  let twoRegionShare = null
  if (national2025 && pavlodar && karaganda && national2025.value) {
    twoRegionShare = Number(
      (((pavlodar.value + karaganda.value) / national2025.value) * 100).toFixed(1),
    )
  }

  const first = seriesRows[0]
  const last = seriesRows[seriesRows.length - 1]
  const seriesChange =
    first && last && first.value
      ? {
          abs: Number((last.value - first.value).toFixed(1)),
          pct: Number((((last.value / first.value) - 1) * 100).toFixed(1)),
          fromYear: first.year,
          toYear: last.year,
        }
      : null

  const sharesCmp = sharesRemote.ok ? compareMarketShares(sharesRemote.rows) : null
  const selectedRegional =
    region === 'all' ? null : regional.find((row) => row.regionCode === region) || null

  return {
    ok: true,
    series: seriesRows,
    regional,
    national2025,
    insights: {
      national: national2025,
      pavlodar,
      karaganda,
      selected: selectedRegional,
    },
    twoRegionShare: region === 'all' ? twoRegionShare : null,
    seriesChange,
    sourceId: INDUSTRY_PRODUCTION_SOURCE,
    ranking:
      region === 'all'
        ? ranking
        : ranking.filter((row) => row.regionCode === region),
    segments: region === 'all' && sharesCmp?.matched ? sharesCmp.items : null,
    sharesDataOrigin: sharesCmp?.matched ? 'supabase' : 'unavailable',
    regionSliceMissing: region !== 'all' && !selectedRegional,
    filterRegion: region,
  }
}

function concentrationSliceMatches(segmentId, coalType) {
  if (coalType === 'all') return true
  if (
    (coalType === 'energy' || coalType === 'power')
    && (segmentId === 'energy' || segmentId === 'power')
  ) {
    return true
  }
  return segmentId === coalType
}

function roundShareDelta(fromValue, toValue) {
  return Math.round((toValue - fromValue) * 10) / 10
}

function enrichConcentrationItem(item) {
  const meta = CONCENTRATION_SEGMENT_META[item.id] || {}
  const value2024 = item.values.find((row) => row.year === 2024)?.value ?? null
  const value2025 = item.values.find((row) => row.year === 2025)?.value ?? null
  return {
    ...item,
    ...meta,
    value2024,
    value2025,
    deltaPp:
      value2024 != null && value2025 != null ? roundShareDelta(value2024, value2025) : null,
  }
}

function concentrationQualitative(coalType, items, priceItems = []) {
  return {
    oligopolyNote: AZRK_OLIGOPOLY_NOTE,
    crGuide: AZRK_CR_GUIDE,
    hhiNote: AZRK_HHI_NOTE,
    keyCapacityRule: AZRK_KEY_CAPACITY_RULE,
    factors: AZRK_STRUCTURAL_FACTORS,
    measures: AZRK_MEASURES,
    participantsNote: AZRK_PARTICIPANTS_NOTE,
    deltaNote: AZRK_DELTA_NOTE,
    priceCausalityNote: AZRK_PRICE_CAUSALITY_NOTE,
    unpublishedNote: AZRK_UNPUBLISHED_NOTE,
    historical: AZRK_HISTORICAL_HOUSEHOLD_CR3,
    coverage: [
      {
        id: 'cr',
        state: items.length ? 'available' : 'unpublished',
        stateLabel: items.length ? 'Доступно' : 'Не опубликовано',
        label: 'CR-1 / CR-2',
        context: 'АЗРК · 2024–2025',
        action: items.length
          ? { kind: 'anchor', href: '#concentration-comparison', text: 'Сравнение 2024/2025' }
          : null,
      },
      {
        id: 'participants',
        state: items.length ? 'available' : 'unpublished',
        stateLabel: items.length ? 'Доступно' : 'Не опубликовано',
        label: 'Ключевые участники',
        context: 'АЗРК · 2025',
        action: items.length
          ? { kind: 'anchor', href: '#key-participants', text: 'Участники' }
          : null,
      },
      {
        id: 'key-capacity',
        state: 'available',
        stateLabel: 'Доступно',
        label: 'Ключевая мощность',
        context: 'АЗРК · анализ 2024–2025',
        action: { kind: 'anchor', href: '#key-capacity', text: 'Ключевая мощность' },
      },
      {
        id: 'prices',
        state: 'available',
        stateLabel: 'Доступно',
        label: 'Ценовой контекст',
        context: 'АЗРК · 2022–2025',
        action: { kind: 'route', to: '/dynamics', text: 'Динамика цен' },
      },
      {
        id: 'historical',
        state: 'historical',
        stateLabel: 'Исторический контур',
        label: 'CR-3',
        context: 'АЗРК · 2022–2023',
        action: { kind: 'anchor', href: '#historical-concentration', text: 'Исторический контекст' },
      },
      {
        id: 'hhi',
        state: 'undisclosed',
        stateLabel: 'Не раскрыто',
        label: 'HHI',
        context: 'АЗРК · опубликованное заключение 2024–2025',
        action: {
          kind: 'why',
          text: 'Почему?',
          explanation:
            'HHI в опубликованной версии заключения АЗРК не раскрыт. Coal Monitor KZ не восстанавливает показатель из агрегированных CR-1/CR-2.',
        },
      },
      {
        id: 'individual',
        state: 'undisclosed',
        stateLabel: 'Не раскрыто',
        label: 'Индивидуальные доли участников',
        context: 'АЗРК · 2024–2025',
        action: {
          kind: 'why',
          text: 'Почему?',
          explanation:
            'Опубликованы совокупные доли соответствующих участников/групп. Индивидуальные значения не разделяются Coal Monitor KZ без исходных официальных данных.',
        },
      },
    ],
  }
}

export async function getConcentration(filters) {
  const coalType = filters?.coalType ?? 'all'
  const [sharesRemote, pricesRemote] = await Promise.all([
    fetchPublishedMarketShares(),
    fetchPublishedPrices(),
  ])
  const growth = applyPriceGrowth(
    priceGrowth.filter((item) => concentrationSliceMatches(item.segmentId, coalType)),
    pricesRemote,
  )

  const emptyNote = `${SLICE_EMPTY} В АЗРК есть доли для коммунально-бытового угля, угля для энергопроизводящих организаций и угля для промышленных нужд.`
  const base = {
    items: [],
    emptyNote,
    disclaimer:
      'Доли крупнейших участников соответствующих сегментов рынка первичной оптовой реализации угля. Не являются долями всего угольного рынка Казахстана.',
    priceGrowthCaption: 'Накопленный рост цен первичной оптовой реализации за период 2022–2025 гг.',
    priceItems: growth.priceItems,
    growthDataOrigin: growth.growthDataOrigin,
    pricesError: growth.pricesError,
    pricesRemoteCount: growth.pricesRemoteCount,
    ...concentrationQualitative(coalType, [], growth.priceItems),
  }

  if (!sharesRemote.ok) {
    return {
      ...base,
      sharesDataOrigin: 'unavailable',
      sharesError: sharesRemote.error,
    }
  }

  const comparison = compareMarketShares(sharesRemote.rows)
  if (!comparison.matched) {
    return {
      ...base,
      sharesDataOrigin: 'unavailable',
      sharesError: comparison.reason,
      sharesRemoteCount: sharesRemote.count,
    }
  }

  const items = comparison.items
    .filter((item) => concentrationSliceMatches(item.segmentId, coalType))
    .map(enrichConcentrationItem)
  return {
    ...base,
    items,
    emptyNote: items.length === 0 ? emptyNote : null,
    sharesDataOrigin: 'supabase',
    sharesRemoteCount: sharesRemote.count,
    ...concentrationQualitative(coalType, items, growth.priceItems),
  }
}

function compareMarketShares(rows) {
  const used = new Set()
  const items = []

  for (const catalogItem of concentration) {
    const values = []
    for (const expected of catalogItem.values) {
      const match = rows.find((row) => {
        if (used.has(row.id)) return false
        return (
          row.market_segment === catalogItem.segment &&
          row.company_or_group === catalogItem.actors &&
          row.year === expected.year &&
          valuesClose(row.share_percent, expected.value) &&
          row.source?.code === 'azrkConcentration' &&
          row.data_status === 'official'
        )
      })
      if (!match) {
        return {
          matched: false,
          reason: `Не совпала доля сегмента «${catalogItem.segment}» за ${expected.year}.`,
        }
      }
      used.add(match.id)
      values.push({ year: match.year, value: match.share_percent })
    }
    items.push({
      ...catalogItem,
      actors: catalogItem.actors,
      values,
      sourceId: 'azrkConcentration',
      origin: 'supabase',
    })
  }

  const extra = rows.filter((row) => !used.has(row.id))
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В market_shares есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
  }

  return { matched: true, items }
}

const ENERGY_COMPOSITION_CODES = [
  'industry',
  'transport',
  'commercial',
  'residential',
  'agri_forestry_fishing',
  'other_unspecified',
]

function resolveEnergySector(raw) {
  if (!raw || raw === 'all') return 'all'
  if (ENERGY_ROLE_SECTOR_IDS.has(raw)) return raw
  return 'all'
}

function isNationalEnergyRow(row) {
  return row.year === 2025 && row.observation_scope === 'national'
}

function findEnergyObservation(rows, dimension, sectorCode, measureKind) {
  return rows.find(
    (row) =>
      isNationalEnergyRow(row) &&
      row.dimension === dimension &&
      row.sector_code === sectorCode &&
      row.measure_kind === measureKind,
  )
}

function mapEnergyVolume(row, shareRow = null) {
  if (!row) return null
  const formatted = formatEnergyKtoe(row.value)
  return {
    code: row.sector_code,
    officialLabel: row.official_label || row.indicator,
    value: row.value,
    unit: row.unit,
    year: row.year,
    sourceId: row.source?.code || 'bnsTeb2025Xlsx',
    isDerived: Boolean(row.is_derived),
    denominatorCode: shareRow?.denominator_code || row.denominator_code || null,
    share: shareRow && typeof shareRow.value === 'number' ? shareRow.value : null,
    shareUnit: shareRow?.unit || '%',
    compact: formatted.compact,
    unitCompact: formatted.unitCompact,
    detail: formatted.detail,
    unitDetail: formatted.unitDetail,
  }
}

function listEnergyVolumes(rows, dimension, shareDimension = dimension) {
  const volumes = rows.filter(
    (row) =>
      isNationalEnergyRow(row) &&
      row.dimension === dimension &&
      row.measure_kind === 'volume',
  )
  return volumes
    .map((row) =>
      mapEnergyVolume(
        row,
        findEnergyObservation(rows, shareDimension, row.sector_code, 'share'),
      ),
    )
    .sort((a, b) => b.value - a.value)
}

function buildEnergyPhase6(rows) {
  const tfc = mapEnergyVolume(findEnergyObservation(rows, 'final_total', 'tfc_total', 'volume'))
  const composition = ENERGY_COMPOSITION_CODES.map((code) =>
    mapEnergyVolume(
      findEnergyObservation(rows, 'final_sector', code, 'volume'),
      findEnergyObservation(rows, 'final_sector', code, 'share'),
    ),
  )
  if (!tfc || composition.some((item) => !item)) {
    return {
      ok: false,
      reason: 'В опубликованном ТЭБ нет полного национального набора секторов 2025 года.',
    }
  }

  const industry = mapEnergyVolume(
    findEnergyObservation(rows, 'final_sector', 'industry', 'volume'),
    findEnergyObservation(rows, 'final_sector', 'industry', 'share'),
  )
  const transport = mapEnergyVolume(
    findEnergyObservation(rows, 'final_sector', 'transport', 'volume'),
    findEnergyObservation(rows, 'final_sector', 'transport', 'share'),
  )
  const industrySubsectors = listEnergyVolumes(rows, 'industry_subsector')
  const transportSubsectors = listEnergyVolumes(rows, 'transport_subsector')
  const fuels = listEnergyVolumes(rows, 'final_fuel')

  if (industrySubsectors.length !== 13) {
    return { ok: false, reason: 'Неполный набор подсекторов промышленности в ТЭБ 2025.' }
  }
  if (industrySubsectors.some((item) => item.share == null)) {
    return { ok: false, reason: 'Нет сохранённых долей подсекторов промышленности.' }
  }
  if (transportSubsectors.length !== 6) {
    return { ok: false, reason: 'Неполный набор подсекторов транспорта в ТЭБ 2025.' }
  }
  if (fuels.length !== 6 || fuels.some((item) => item.share == null)) {
    return { ok: false, reason: 'Неполный набор видов топлива конечного потребления.' }
  }

  const byCode = Object.fromEntries(
    ['residential', 'commercial', 'agri_forestry_fishing', 'other_unspecified'].map((code) => [
      code,
      mapEnergyVolume(
        findEnergyObservation(rows, 'final_sector', code, 'volume'),
        findEnergyObservation(rows, 'final_sector', code, 'share'),
      ),
    ]),
  )

  return {
    ok: true,
    tfc,
    composition,
    industry,
    transport,
    industrySubsectors,
    transportSubsectors,
    fuels,
    sectors: { industry, transport, ...byCode },
  }
}

function energyFailPayload(reason, extra = {}) {
  return {
    ok: false,
    mode: 'error',
    items: [],
    quote: null,
    otherFuels: null,
    energyDataOrigin: 'none',
    energyError: reason,
    emptyNote: 'Нет подтвержденных данных по топливно-энергетическому балансу.',
    scope: 'unavailable',
    ...extra,
  }
}

function mapHouseholdVolumeKpi(row) {
  const shown = formatHouseholdCoalKg(row.value)
  return {
    id: `household-volume-${row.id}`,
    label: 'Потребление каменного угля домашними хозяйствами',
    value: row.value,
    display: shown.text,
    unit: shown.unit,
    altDisplay: `${formatNumber(row.value, 0)} кг по первоисточнику`,
    period: '2022 год',
    status: INDICATOR_STATUS.official,
    sourceId: row.source?.code || 'bnsHouseholdFuelSurvey2022',
    note: 'БНС, выборочное обследование домашних хозяйств, 2022. Оценка обследования, распространённая на генеральную совокупность; не административный учёт 2025 года.',
  }
}

function mapHouseholdAverageKpi(row) {
  return {
    id: `household-avg-${row.id}`,
    label: 'Среднее потребление каменного угля',
    value: row.value,
    display: formatNumber(row.value, 0),
    unit: 'кг на одно домохозяйство в среднем за год',
    period: '2022 год',
    status: INDICATOR_STATUS.official,
    sourceId: row.source?.code || 'bnsHouseholdFuelSurvey2022',
    note: 'Официальный показатель «на одно домохозяйство в среднем за год». Не является потреблением на человека.',
  }
}

function groupPowerConsumers(rows) {
  const byName = new Map()
  for (const row of rows) {
    const name = row.consumer_name
    if (!name) continue
    if (typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value <= 0) continue
    const current = byName.get(name) || {
      name,
      sourceId: row.source?.code || 'samrukEnergyAr2025MarketReview',
      unit: row.unit || 'млн т',
      years: {},
    }
    if (row.year === 2023 || row.year === 2024 || row.year === 2025) {
      current.years[row.year] = {
        value: row.value,
        display: formatNumber(row.value, 2),
      }
    }
    byName.set(name, current)
  }
  return [...byName.values()]
    .map((item) => ({
      ...item,
      series: [2023, 2024, 2025].map((year) => ({
        year,
        value: item.years[year]?.value ?? null,
        display: item.years[year]?.display ?? null,
      })),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

function mapRegionalProductionKpi(row) {
  const volume = formatCoalVolume(row.value)
  return {
    id: `regional-production-${row.regionCode || row.id}`,
    label: 'Промышленная добыча угля',
    value: row.value,
    display: volume.text,
    unit: volume.unit,
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: row.sourceId,
    note: 'Региональная промышленная добыча БНС. Не является показателем регионального ТЭБ и не получена распределением национального энергопотребления.',
  }
}

function mapRegionalShareKpi(shareValue, sourceId) {
  return {
    id: 'regional-production-share',
    label: 'Доля региона в национальной добыче угля',
    value: shareValue,
    display: formatNumber(shareValue, 1),
    unit: '%',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId,
    note: 'Derived: региональная добыча / национальная добыча БНС 2025. Не доля угля в энергопотреблении области и не показатель ТЭБ.',
  }
}

async function buildRegionalMarketPayload({ region, energySector, slice, base }) {
  const [geo, resources, regionalEnergy] = await Promise.all([
    getGeography({ region }),
    getResources({ region, coalType: 'all' }),
    fetchPublishedRegionalCoalEnergy(),
  ])

  const publicationStatus = GEOGRAPHY_STATUS_2025[region] || null
  const selected = geo?.ok ? geo.insights?.selected : null
  const national = geo?.ok ? geo.national2025 : null

  let productionState = 'unpublished'
  let productionKpi = null
  let shareKpi = null

  if (publicationStatus === 'confidential') {
    productionState = 'confidential'
  } else if (selected && typeof selected.value === 'number' && Number.isFinite(selected.value)) {
    productionState = 'published'
    productionKpi = mapRegionalProductionKpi(selected)
    if (national && typeof national.value === 'number' && Number.isFinite(national.value) && national.value > 0) {
      shareKpi = mapRegionalShareKpi((selected.value / national.value) * 100, selected.sourceId)
    }
  } else if (geo?.ok === false) {
    productionState = 'unavailable'
  }

  const assets = Array.isArray(resources?.assets) ? resources.assets : []

  const regionRows = (regionalEnergy.ok ? regionalEnergy.rows : []).filter(
    (row) =>
      row.observation_scope !== 'national' &&
      row.region?.code === region &&
      typeof row.value === 'number' &&
      Number.isFinite(row.value) &&
      row.value > 0 &&
      row.is_derived !== true,
  )

  const householdVolume = regionRows.find(
    (row) =>
      row.metric_type === 'household_coal_consumption' &&
      row.measure_kind === 'total_volume' &&
      row.year === 2022,
  )
  const householdAverage = regionRows.find(
    (row) =>
      row.metric_type === 'household_coal_consumption' &&
      row.measure_kind === 'average_per_household' &&
      row.year === 2022,
  )
  const powerRows = regionRows.filter(
    (row) => row.metric_type === 'power_coal_supply' && row.measure_kind === 'total_volume',
  )
  const powerConsumers = groupPowerConsumers(powerRows)

  let householdState = 'unpublished'
  if (!regionalEnergy.ok) householdState = 'unavailable'
  else if (householdVolume || householdAverage) householdState = 'published'

  let powerState = 'unpublished'
  if (!regionalEnergy.ok) powerState = 'unavailable'
  else if (powerConsumers.length > 0) powerState = 'published'

  return {
    ...base,
    mode: 'regional-profile',
    items: [],
    quote: null,
    otherFuels: null,
    tfc: null,
    composition: null,
    fuels: null,
    sector: null,
    regionTitle: 'Энергетический профиль региона',
    regionalNotice:
      'Для регионов используется набор независимых верифицированных показателей. Полный региональный ТЭБ, сопоставимый с национальным балансом БНС, в используемых источниках не опубликован.',
    productionState,
    productionLabel:
      productionState === 'confidential'
        ? GEOGRAPHY_STATUS_LABEL.confidential
        : productionState === 'unpublished'
          ? GEOGRAPHY_STATUS_LABEL.unpublished
          : productionState === 'unavailable'
            ? geo?.error || 'Нет подтвержденных данных по региональной добыче.'
            : null,
    productionKpi,
    shareKpi,
    assets,
    assetsEmpty:
      assets.length === 0
        ? 'В текущем верифицированном наборе активы не представлены.'
        : null,
    assetsDataOrigin: resources?.assetsDataOrigin || null,
    productionSourceId: geo?.sourceId || INDUSTRY_PRODUCTION_SOURCE,
    householdState,
    householdVolumeKpi: householdVolume ? mapHouseholdVolumeKpi(householdVolume) : null,
    householdAverageKpi: householdAverage ? mapHouseholdAverageKpi(householdAverage) : null,
    householdSourceId:
      householdVolume?.source?.code ||
      householdAverage?.source?.code ||
      'bnsHouseholdFuelSurvey2022',
    householdEmpty:
      householdState === 'unavailable'
        ? regionalEnergy.error || 'Не удалось загрузить данные обследования домашних хозяйств.'
        : 'В текущем наборе нет опубликованного числового наблюдения по потреблению каменного угля домашними хозяйствами этого региона. Отсутствие публикации не означает, что потребление равно нулю.',
    powerState,
    powerConsumers,
    powerSourceId: powerConsumers[0]?.sourceId || 'samrukEnergyAr2025MarketReview',
    powerEmpty:
      powerState === 'unavailable'
        ? regionalEnergy.error || 'Не удалось загрузить данные о поставках энергопотребителям.'
        : 'В текущем наборе нет подтверждённых данных о поставках отдельным энергопотребителям региона.',
    regionalEnergyCount: regionalEnergy.ok ? regionRows.length : null,
    showKazakhstanCta: true,
    nationalHint:
      energySector !== 'all'
        ? 'Национальные данные по выбранному сектору ТЭБ доступны при просмотре Казахстана. Сектор ТЭБ не применяется к региональному срезу.'
        : 'Национальная аналитика ТЭБ доступна при выборе Казахстана.',
    methodology: [
      'Household 2022, промышленная добыча 2025 и поставки энергопотребителям 2023–2025 — независимые ряды. Их нельзя складывать.',
      'Поставки названным предприятиям не являются полным потреблением угля региона и не суммируются в региональный итог.',
      'Национальные доли угля в первичном и конечном потреблении энергии не относятся к выбранной области и здесь не показываются.',
      'Конфиденциальные, отсутствующие и обозначенные в источнике как «явление отсутствует» наблюдения не заменяются нулём.',
    ],
    sliceLabel: slice,
  }
}

export async function getEnergyRole(filters) {
  const region = filters?.region ?? 'all'
  const energySector = resolveEnergySector(filters?.coalType ?? filters?.segment ?? 'all')
  const slice = energySliceLabel(region, energySector)

  const base = {
    ok: true,
    energyDataOrigin: 'supabase',
    energyRemoteCount: null,
    energyError: null,
    sliceLabel: slice,
    region,
    energySector,
    year: 2025,
    scope: region === 'all' ? 'national' : 'unavailable',
  }

  if (region !== 'all') {
    return buildRegionalMarketPayload({ region, energySector, slice, base })
  }

  const remote = await fetchPublishedEnergyBalance()
  if (!remote.ok) {
    return energyFailPayload(remote.error)
  }

  const comparison = compareEnergyBalance(remote.rows)
  if (!comparison.matched) {
    return energyFailPayload(comparison.reason, { energyRemoteCount: remote.count })
  }

  const phase6 = buildEnergyPhase6(remote.rows)
  if (!phase6.ok) {
    return energyFailPayload(phase6.reason, { energyRemoteCount: remote.count })
  }

  base.energyRemoteCount = remote.count

  if (energySector === 'all') {
    return {
      ...base,
      mode: 'overview',
      items: comparison.items,
      quote: energyRoleQuote,
      tfc: phase6.tfc,
      composition: phase6.composition,
      fuels: phase6.fuels,
      methodology: [
        'Секторная структура относится к конечному потреблению энергии Республики Казахстан за 2025 год. Она не является структурой потребления только угля.',
        'Доли видов топлива рассчитаны относительно общего конечного энергопотребления.',
      ],
      otherFuels:
        'Структура по видам топлива описывает всё конечное энергопотребление, а не только уголь. Официально округлённая доля угля в конечном потреблении — 13,3%; детальная доля топлива «уголь» в том же знаменателе сохранена отдельно.',
    }
  }

  const selected = phase6.sectors[energySector]
  if (!selected) {
    return energyFailPayload('Нет observation по выбранному сектору ТЭБ.', {
      energyRemoteCount: remote.count,
    })
  }

  const sectorName = energySectors.find((item) => item.id === energySector)?.name || selected.officialLabel
  const payload = {
    ...base,
    mode: 'sector',
    items: [],
    quote: null,
    sector: selected,
    sectorShortName: sectorName,
    methodology: [
      'Секторная структура относится к конечному потреблению энергии Республики Казахстан за 2025 год. Она не является структурой потребления только угля.',
    ],
  }

  if (energySector === 'industry') {
    payload.children = phase6.industrySubsectors
    payload.childKind = 'industry'
    payload.methodology.push(
      'Доля подсектора рассчитана относительно конечного энергопотребления промышленности, а не всего энергопотребления Казахстана.',
      'Доли подсекторов рассчитаны относительно конечного энергопотребления промышленности.',
    )
  } else if (energySector === 'transport') {
    payload.children = phase6.transportSubsectors
    payload.childKind = 'transport'
  }

  return payload
}

function applyPriceGrowth(jsItems, remote) {
  if (!remote.ok) {
    return {
      priceItems: [],
      growthDataOrigin: 'unavailable',
      pricesError: remote.error,
    }
  }

  const comparison = comparePrices(remote.rows)
  if (!comparison.matched) {
    return {
      priceItems: [],
      growthDataOrigin: 'unavailable',
      pricesError: comparison.reason,
      pricesRemoteCount: remote.count,
    }
  }

  const byId = new Map(comparison.growthItems.map((item) => [item.id, item]))
  return {
    priceItems: jsItems.map((item) => byId.get(item.id)).filter(Boolean),
    growthDataOrigin: 'supabase',
    pricesRemoteCount: remote.count,
  }
}

const HISTORICAL_PRICE_MARKET_LEVELS = new Set([
  'producer_weighted',
  'producer_list_price',
  'siding_range',
])

const ENERGY_PRICE_SERIES = [
  { key: 'bogatyr-komir', name: 'Богатырь Комир', color: '#c4a056' },
  { key: 'eek', name: 'ЕЭК', color: '#8b9bb3' },
  { key: 'karazhyra', name: 'Каражыра', color: '#5b7c99' },
  { key: 'kazakhmys-coal', name: 'Kazakhmys Coal', color: '#6e8b74' },
  { key: 'angrensor-energo', name: 'Ангренсор Энерго', color: '#a67c6a' },
]

const HOUSEHOLD_PRICE_SERIES = [
  { key: 'shubarkol-komir', name: 'Шубарколь Комир', color: '#c4a056' },
  { key: 'karazhyra', name: 'Каражыра', color: '#8b9bb3' },
  { key: 'maikuben-west', name: 'Майкубен-Вест', color: '#5b7c99' },
  { key: 'sat-komir', name: 'Sat Komir', color: '#6e8b74' },
]

function isoDay(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function weightedPeriodMeta(row) {
  const start = isoDay(row.period_start)
  const end = isoDay(row.period_end)
  if (start === '2022-01-01' && end === '2022-06-30') {
    return { key: '2022-h1', label: 'I пол. 2022', order: 2022.5 }
  }
  if (/^\d{4}-01-01$/.test(start) && /^\d{4}-12-31$/.test(end) && start.slice(0, 4) === end.slice(0, 4)) {
    const year = Number(start.slice(0, 4))
    return { key: String(year), label: String(year), order: year }
  }
  return null
}

function listPeriodLabel(day) {
  const months = {
    '2022-08-01': 'Авг 2022',
    '2022-09-01': 'Сен 2022',
    '2022-10-01': 'Окт 2022',
    '2022-11-01': 'Ноя 2022',
    '2022-12-01': 'Дек 2022',
    '2023-01-01': 'Янв 2023',
  }
  return months[day] || day
}

function azrkHistorySource(row) {
  return row.source?.code || row.sources?.code || 'azrkCompetition2022'
}

function buildWeightedChart(rows, coalType, series) {
  const points = rows.filter(
    (row) =>
      row.market_level === 'producer_weighted' &&
      row.indicator_kind === 'level' &&
      row.coal_type === coalType &&
      azrkHistorySource(row) === 'azrkCompetition2022',
  )
  const byPeriod = new Map()
  for (const row of points) {
    const period = weightedPeriodMeta(row)
    if (!period || row.price == null) continue
    if (!byPeriod.has(period.key)) {
      byPeriod.set(period.key, {
        periodKey: period.key,
        period: period.label,
        order: period.order,
      })
    }
    byPeriod.get(period.key)[row.coal_product] = row.price
  }
  const chartRows = [...byPeriod.values()].sort((a, b) => a.order - b.order)
  return {
    rows: chartRows,
    series,
    unit: 'тг/т',
    vat: 'без НДС',
    sourceId: 'azrkCompetition2022',
  }
}

function mapAzrkPriceHistory(rows) {
  const list = rows
    .filter(
      (row) =>
        row.market_level === 'producer_list_price' &&
        row.coal_product === 'bogatyr-komir' &&
        azrkHistorySource(row) === 'azrkCompetition2022' &&
        row.price != null,
    )
    .map((row) => {
      const day = isoDay(row.period_start)
      return { day, period: listPeriodLabel(day), value: row.price, order: day }
    })
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))

  const rangeRow = rows.find(
    (row) =>
      row.market_level === 'siding_range' &&
      row.coal_type === 'household' &&
      azrkHistorySource(row) === 'azrkCompetition2022' &&
      row.price != null,
  )

  return {
    energy: buildWeightedChart(rows, 'energy', ENERGY_PRICE_SERIES),
    household: buildWeightedChart(rows, 'household', HOUSEHOLD_PRICE_SERIES),
    bogatyrList: {
      rows: list,
      sourceId: 'azrkCompetition2022',
      unit: 'тг/т',
    },
    sidingRange: rangeRow
      ? {
          min: rangeRow.price,
          max: rangeRow.price_max,
          unit: rangeRow.unit,
          period: '2022 год',
          sourceId: 'azrkCompetition2022',
          note: rangeRow.notes,
        }
      : null,
  }
}

export async function getPriceDynamics(filters) {
  const coalType = filters?.coalType ?? 'all'
  const jsItems = priceGrowth.filter((item) => segmentMatches(item.segmentId, coalType))
  const remote = await fetchPublishedPrices()
  const growth = applyPriceGrowth(jsItems, remote)
  const history = mapAzrkPriceHistory(remote.ok ? remote.rows : [])
  return {
    items: growth.priceItems,
    emptyNote:
      jsItems.length === 0
        ? `${SLICE_EMPTY} В АЗРК есть накопленный рост цен для коммунально-бытового и энергетического угля, не для выбранного сегмента.`
        : null,
    disclaimer: 'Накопленный рост цен первичной оптовой реализации за период 2022–2025 гг.',
    dynamicsDataOrigin: growth.growthDataOrigin,
    pricesError: growth.pricesError,
    pricesRemoteCount: growth.pricesRemoteCount,
    history,
    historyAvailable: Boolean(history.energy.rows.length || history.household.rows.length),
    sourceId: 'azrkCompetition2022',
  }
}

export async function getRetailPrices(filters) {
  const region = filters?.region ?? 'all'
  if (region !== 'all' && region !== 'astana') {
    return {
      items: [],
      disclaimer: null,
      emptyNote: unavailable.astanaOnly,
      pricesDataOrigin: 'unavailable',
    }
  }

  const remote = await fetchPublishedPrices()
  const shell = {
    items: [],
    disclaimer:
      'Средние розничные цены в г. Астана. Не являются средними ценами по Республике Казахстан.',
    emptyNote: 'Нет подтверждённых данных',
  }

  if (!remote.ok) {
    return { ...shell, pricesDataOrigin: 'unavailable', pricesError: remote.error }
  }

  const comparison = comparePrices(remote.rows)
  if (!comparison.matched) {
    return {
      ...shell,
      pricesDataOrigin: 'unavailable',
      pricesError: comparison.reason,
      pricesRemoteCount: remote.count,
    }
  }

  return {
    ...shell,
    items: comparison.retailItems,
    emptyNote: null,
    pricesDataOrigin: 'supabase',
    pricesRemoteCount: remote.count,
  }
}

export async function getRetailCoalObservations() {
  const remote = await fetchPublishedRetailCoalObservations()
  if (!remote.ok) {
    return {
      items: [],
      count: 0,
      ok: false,
      error: remote.error,
    }
  }

  return {
    ok: true,
    count: remote.count,
    items: remote.rows.map((row) => ({
      id: row.id,
      region: row.region
        ? { id: row.region.id, code: row.region.code, name: row.region.name }
        : null,
      locality: row.locality || null,
      seller: row.seller || null,
      brand: row.coal_brand,
      variant: row.coal_variant || null,
      price: row.price,
      priceMin: row.price_min,
      priceMax: row.price_max,
      currency: row.currency,
      unit: row.unit,
      stockTonnes: row.stock_tonnes,
      observationDate: row.observation_date || null,
      publicationDate: row.publication_date || null,
      periodStart: row.period_start || null,
      periodEnd: row.period_end || null,
      publicationUrl: row.publication_url || row.source?.url || null,
      observationType: row.observation_type,
      geographicScope: row.geographic_scope,
      methodologyScope: row.methodology_scope || null,
      notes: row.notes || null,
      source: row.source
        ? {
            id: row.source.id,
            code: row.source.code,
            organization: row.source.organization,
            title: row.source.publication_title,
            url: row.source.url,
          }
        : null,
    })),
  }
}

const RETAIL_SUPPLY_SOURCE_CODES = [
  'etsShubarkol2026',
  'ccxKarazhyraPlan2026',
  'kaenkHouseholdCoal2026',
  'vkoOskemenCoal2026',
]

function coverageYear(value) {
  if (!value) return null
  const year = Number(String(value).slice(0, 4))
  return Number.isFinite(year) ? year : null
}

function maxDate(values) {
  const dates = values.filter(Boolean).map((value) => String(value)).sort()
  return dates.length ? dates[dates.length - 1] : null
}

export async function getRetailCoverageMeta() {
  const payload = await getRetailCoalObservations()
  if (!payload.ok) {
    return { ok: false, error: payload.error, astana: null, regional: null, stock: null }
  }
  const items = payload.items
  const astana = items.filter((item) => item.region?.code === 'astana')
  const stock = items.filter((item) => item.stockTonnes != null)
  const regional = items.filter((item) => item.region?.code !== 'astana')
  const years = items.flatMap((item) => [
    coverageYear(item.observationDate),
    coverageYear(item.publicationDate),
    coverageYear(item.periodStart),
  ]).filter(Boolean)

  return {
    ok: true,
    latestObservationDate: maxDate(items.map((item) => item.observationDate)),
    latestPublicationDate: maxDate(items.map((item) => item.publicationDate)),
    latestYear: years.length ? Math.max(...years) : null,
    astana: {
      count: astana.length,
      latestObservationDate: maxDate(astana.map((item) => item.observationDate)),
      latestPublicationDate: maxDate(astana.map((item) => item.publicationDate)),
      latestYear: astana
        .flatMap((item) => [coverageYear(item.observationDate), coverageYear(item.publicationDate)])
        .filter(Boolean)
        .reduce((max, year) => (max == null || year > max ? year : max), null),
    },
    regional: {
      count: regional.length,
      latestYear: regional
        .flatMap((item) => [
          coverageYear(item.observationDate),
          coverageYear(item.publicationDate),
          coverageYear(item.periodStart),
        ])
        .filter(Boolean)
        .reduce((max, year) => (max == null || year > max ? year : max), null),
    },
    stock: {
      count: stock.length,
      latestObservationDate: maxDate(stock.map((item) => item.observationDate)),
    },
  }
}

export async function getRetailSupplyContext() {
  const [indicatorsRemote, sourcesRemote] = await Promise.all([
    fetchPublishedIndustryIndicators(),
    fetchPublishedSources(),
  ])
  if (!indicatorsRemote.ok) {
    return { ok: false, items: [], error: indicatorsRemote.error }
  }
  const sourceById = new Map((sourcesRemote.ok ? sourcesRemote.rows : []).map((row) => [row.id, row]))
  const allowedIds = new Set(
    (sourcesRemote.ok ? sourcesRemote.rows : [])
      .filter((row) => RETAIL_SUPPLY_SOURCE_CODES.includes(row.code))
      .map((row) => row.id),
  )
  const items = indicatorsRemote.rows
    .filter((row) => allowedIds.has(row.source_id))
    .map((row) => {
      const source = sourceById.get(row.source_id)
      return {
        id: row.id,
        indicator: row.indicator,
        value: row.value,
        unit: row.unit,
        periodStart: row.period_start || null,
        periodEnd: row.period_end || null,
        dataStatus: row.data_status,
        approximate: Boolean(row.is_approximate),
        notes: row.notes || null,
        source: source
          ? {
              id: source.id,
              code: source.code,
              organization: source.organization,
              title: source.publication_title,
              url: source.url,
            }
          : null,
      }
    })
  return { ok: true, items, count: items.length }
}

export async function getRetailPage(filters) {
  const region = filters?.region ?? 'all'
  const [observations, supply] = await Promise.all([
    getRetailCoalObservations(),
    getRetailSupplyContext(),
  ])

  if (!observations.ok) {
    return {
      ok: false,
      error: observations.error,
      items: [],
      empty: true,
    }
  }

  const all = observations.items
  const filtered = filterRetailByRegion(all, region)
  const coverageAll = coverageMeta(all)
  const coverage = coverageMeta(filtered)
  const astanaHistory = astanaSnapshotSeries(all)
  const astanaLatest = latestAstanaSnapshot(all)
  const oskemen = oskemen2026Retail(filtered)
  const supplyItems = classifySupplyItems(supply.ok ? supply.items : [])
  const nationalSupply = supplyItems.filter((item) => item.group !== 'local-plan')
  const localSupply =
    region === 'all' || region === 'east-kazakhstan'
      ? supplyItems.filter((item) => item.group === 'local-plan')
      : []

  return {
    ok: true,
    error: null,
    empty: filtered.length === 0,
    emptyNote:
      'Для выбранного региона подтверждённых розничных наблюдений в базе нет.',
    region,
    coverageAll,
    coverage,
    items: filtered,
    astanaHistory,
    astanaLatest:
      region === 'all' || region === 'astana' ? astanaLatest : { brands: [], dated: false },
    showAstanaHistory: region === 'all' || region === 'astana',
    oskemen2026: oskemen,
    brands: brandRanges(filtered),
    geo: geoPoints(filtered),
    stock: stockPoints(filtered),
    nationalSupply,
    localSupply,
    supplyError: supply.ok ? null : supply.error,
  }
}

function comparePrices(rows) {
  const expectedRetail = astanaRetailPrices.map((item) => ({
    product: item.product,
    value: item.value,
    unit: item.unit,
    catalogItem: item,
  }))
  const used = new Set()
  const retailMapped = []

  for (const item of expectedRetail) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
      return (
        row.indicator_kind === 'level' &&
        row.market_level === 'retail' &&
        row.currency === 'KZT' &&
        row.unit === item.unit &&
        row.coal_product === item.product &&
        valuesClose(row.price, item.value) &&
        row.data_status === 'regional' &&
        row.source?.code === 'astanaAkimat' &&
        row.region?.code === 'astana'
      )
    })
    if (!match) {
      return { matched: false, reason: `Не совпала розничная цена «${item.product}».` }
    }
    used.add(match.id)
    retailMapped.push({ expected: item, row: match })
  }

  const expectedGrowth = [
    {
      id: 'householdPriceGrowth',
      coal_type: 'household',
      price: 30,
      price_max: 35,
      unit: '%',
    },
    {
      id: 'energyPriceGrowth',
      coal_type: 'energy',
      price: 45,
      price_max: null,
      unit: '%',
    },
  ]

  const growthMapped = []
  for (const item of expectedGrowth) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
      const maxOk =
        item.price_max === null
          ? row.price_max === null
          : valuesClose(row.price_max, item.price_max)
      return (
        row.indicator_kind === 'cumulative_growth' &&
        row.market_level === 'wholesale_primary' &&
        row.unit === item.unit &&
        row.coal_type === item.coal_type &&
        valuesClose(row.price, item.price) &&
        maxOk &&
        row.source?.code === 'azrkConcentration'
      )
    })
    if (!match) {
      return { matched: false, reason: `Не совпал накопленный рост цен ${item.id}.` }
    }
    used.add(match.id)
    growthMapped.push({ expected: item, row: match })
  }

  const extra = rows.filter(
    (row) => !used.has(row.id) && !HISTORICAL_PRICE_MARKET_LEVELS.has(row.market_level),
  )
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В prices есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
  }

  const retailItems = retailMapped.map(({ expected, row }) => ({
    ...expected.catalogItem,
    value: row.price,
    unit: row.unit,
    product: row.coal_product,
    sourceId: row.source?.code || expected.catalogItem.sourceId,
    coverage: 'astana',
    note:
      row.notes ||
      'Средние розничные цены в г. Астана. Не являются средними ценами по Республике Казахстан.',
    origin: 'supabase',
    geography: row.region?.name || 'г. Астана',
    marketLevel: row.market_level,
  }))

  const growthItems = growthMapped.map(({ expected, row }) => {
    const catalogItem = priceGrowth.find((item) => item.id === expected.id)
    return {
      ...catalogItem,
      min: row.price,
      max: row.price_max === null ? row.price : row.price_max,
      display: catalogItem.display,
      sourceId: row.source?.code || catalogItem.sourceId,
      note: row.notes || catalogItem.note,
      origin: 'supabase',
    }
  })

  return { matched: true, retailItems, growthItems }
}

export async function getSourcesCatalog() {
  const [
    remote,
    production,
    observations,
    energy,
    concentration,
    geography,
    reservesRemote,
    outlook,
  ] = await Promise.all([
    fetchPublishedSources(),
    getProduction(),
    getRetailCoalObservations(),
    getEnergyRole({ region: 'all' }),
    getConcentration({ region: 'all', coalType: 'all' }),
    getGeography({ region: 'all' }),
    fetchPublishedReserves(),
    getOutlook().catch(() => null),
  ])

  const sourceByCode = {}
  if (remote.ok) {
    for (const row of remote.rows) {
      if (!row.code) continue
      sourceByCode[row.code] = {
        organization: row.organization,
        publication: row.publication_title,
        title: row.publication_title,
        url: row.url,
        notes: row.notes || null,
      }
    }
  }

  const reservesCmp = reservesRemote.ok ? compareReserves(reservesRemote.rows) : null
  const quality = assembleDataQuality({
    production,
    reserves: reservesCmp?.matched ? reservesCmp : null,
    energy,
    concentration,
    observations,
    geography,
    outlook,
    sourceByCode,
  })

  const rawItems = remote.ok
    ? remote.rows.map((row) => ({
        id: row.code || row.id,
        organization: row.organization,
        publication: row.publication_title,
        period: row.published_at || null,
        url: row.url,
        sourceStatus: sourceStatusFromType(row.source_type),
        notes: row.notes || null,
        origin: 'supabase',
      }))
    : sourceList

  const items = attachSourceUsage(mergeSourceCatalog(rawItems), quality.contours)

  return {
    items,
    quality,
    sourcesDataOrigin: remote.ok ? 'supabase' : 'js-fallback',
    sourcesRemoteCount: remote.ok ? remote.count : null,
  }
}

function sourceStatusFromType(type) {
  if (type === 'company') return SOURCE_STATUS.company
  if (type === 'regional') return 'Региональные данные'
  return SOURCE_STATUS.official
}

const PHASE5_COMPANY_CODES = [
  'bogatyr-komir',
  'shubarkol-komir',
  'karazhyra',
  'maikuben-west',
  'kazakhmys-coal',
]

function unavailablePayload(error) {
  return {
    ok: false,
    error: error || 'Подключение к данным временно недоступно.',
  }
}

function periodById(periodId) {
  return Object.values(EXPORT_PERIODS).find((item) => item.id === periodId) || null
}

function nationalExportRow(rows, period) {
  return rows.find(
    (row) =>
      matchExportPeriod(row, period) &&
      (row.observation_scope === 'national' || (!row.partner_code && !row.destination_country)),
  ) || null
}

function partnerExportRows(rows, period) {
  return rows
    .filter(
      (row) =>
        matchExportPeriod(row, period) &&
        (row.observation_scope === 'partner' || Boolean(row.partner_code || row.destination_country)),
    )
    .sort((left, right) => (right.volume || 0) - (left.volume || 0))
}

export async function getCompanyProfiles() {
  const [companiesRemote, productionRemote] = await Promise.all([
    fetchPublishedCompanies(),
    fetchPublishedProduction(),
  ])
  if (!companiesRemote.ok) return unavailablePayload(companiesRemote.error)
  if (!productionRemote.ok) return unavailablePayload(productionRemote.error)

  const items = PHASE5_COMPANY_CODES.map((code) => {
    const company = companiesRemote.rows.find((row) => row.code === code)
    if (!company) return null
    const observations = productionRemote.rows.filter((row) => row.company?.code === code)
    return {
      id: company.id,
      code: company.code,
      name: company.name,
      shortName: company.short_name,
      companyType: company.company_type,
      notes: company.notes,
      observationCount: observations.length,
    }
  }).filter(Boolean)

  return { ok: true, items }
}

export async function getCompanyProduction(companyId) {
  const remote = await fetchPublishedProduction()
  if (!remote.ok) return unavailablePayload(remote.error)

  const rows = remote.rows.filter((row) => {
    if (row.company_id !== companyId && row.company?.id !== companyId && row.company?.code !== companyId) {
      return false
    }
    return true
  })

  const conflicts = []
  const byKey = new Map()
  for (const row of rows) {
    const key = `${row.year || 'na'}|${row.measure_kind}|${row.unit}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(row)
  }
  for (const group of byKey.values()) {
    const original = group.filter((row) => row.series_role === 'original')
    const revised = group.filter((row) => row.series_role === 'revised')
    if (original.length && revised.length) {
      conflicts.push({
        year: original[0].year,
        measureKind: original[0].measure_kind,
        original: original.map((row) => ({ id: row.id, value: row.value, notes: row.notes, sourceId: row.source?.code })),
        revised: revised.map((row) => ({ id: row.id, value: row.value, notes: row.notes, sourceId: row.source?.code })),
      })
    }
  }

  const chartSeries = rows.filter((row) => row.series_role !== 'original')

  return {
    ok: true,
    companyId,
    observations: rows,
    chartSeries,
    conflicts,
  }
}

export async function getCompanyAssets(companyId) {
  const remote = await fetchPublishedCoalAssets()
  if (!remote.ok) return unavailablePayload(remote.error)
  const items = remote.rows.filter(
    (row) =>
      row.operator_company_id === companyId ||
      row.operator?.id === companyId ||
      row.operator?.code === companyId,
  )
  return { ok: true, companyId, items }
}

export async function getExportPeriods() {
  const remote = await fetchPublishedTrade()
  if (!remote.ok) return unavailablePayload(remote.error)
  if (!remote.rows.some((row) => isHs2701ExportRow(row))) {
    return unavailablePayload('Ряд экспорта HS 2701 пока недоступен.')
  }
  return {
    ok: true,
    items: Object.values(EXPORT_PERIODS).map((period) => ({
      ...period,
      yoyAgainstFullYearForbidden: period.is_full_year === false,
    })),
  }
}

export async function getExportAnnualTotals() {
  const remote = await fetchPublishedTrade()
  if (!remote.ok) return unavailablePayload(remote.error)
  const items = [EXPORT_PERIODS.fy2023, EXPORT_PERIODS.fy2024, EXPORT_PERIODS.fy2025].map((period) => {
    const row = nationalExportRow(remote.rows, period)
    const ministry =
      period.id === 'fy-2025'
        ? remote.rows.find(
            (item) =>
              item.trade_type === 'export' &&
              item.methodology_scope === 'ministry_coal_exports' &&
              item.year === 2025,
          )
        : null
    return {
      period,
      netWeightTonnes: row?.volume ?? null,
      tradeValueUsd: row?.value_amount ?? null,
      sourceId: row?.source?.code || null,
      ministryCoalExportsTonnesMillion: ministry ? ministry.volume : null,
      notes: row?.notes || null,
    }
  })
  if (items.some((item) => item.netWeightTonnes == null)) {
    return unavailablePayload('Неполные годовые итоги HS 2701.')
  }
  return { ok: true, items }
}

export async function getExportByCountry(periodId) {
  const period = periodById(periodId)
  if (!period) return unavailablePayload('Неизвестный период экспорта.')
  const remote = await fetchPublishedTrade()
  if (!remote.ok) return unavailablePayload(remote.error)
  const national = nationalExportRow(remote.rows, period)
  if (!national) return unavailablePayload('Нет национального итога HS 2701 для периода.')
  const partners = partnerExportRows(remote.rows, period)
  return {
    ok: true,
    period,
    national: {
      netWeightTonnes: national.volume,
      tradeValueUsd: national.value_amount,
      sourceId: national.source?.code || null,
    },
    partners: partners.map((row) => ({
      partnerCode: row.partner_code,
      partnerCountry: row.destination_country,
      netWeightTonnes: row.volume,
      tradeValueUsd: row.value_amount,
      declaredPartnerMayBeTransit: Boolean(row.declared_partner_may_be_transit),
      sourceId: row.source?.code || null,
    })),
  }
}

export async function getExportCountryHistory(country) {
  const needle = String(country || '').toLowerCase()
  const remote = await fetchPublishedTrade()
  if (!remote.ok) return unavailablePayload(remote.error)
  const items = Object.values(EXPORT_PERIODS).map((period) => {
    const row = partnerExportRows(remote.rows, period).find(
      (item) =>
        item.partner_code === needle ||
        String(item.destination_country || '').toLowerCase() === needle,
    )
    return {
      period,
      observation: row
        ? {
            netWeightTonnes: row.volume,
            tradeValueUsd: row.value_amount,
            declaredPartnerMayBeTransit: Boolean(row.declared_partner_may_be_transit),
          }
        : null,
    }
  })
  return { ok: true, country, items }
}

export async function getExportPeriodComparison(currentPeriodId, previousPeriodId) {
  const current = periodById(currentPeriodId)
  const previous = periodById(previousPeriodId)
  if (!current || !previous) return unavailablePayload('Неизвестный период экспорта.')
  if (current.is_full_year !== previous.is_full_year) {
    return unavailablePayload('Нельзя сравнивать Jan–Jul с full year как YoY.')
  }
  if (current.measure_kind !== previous.measure_kind) {
    return unavailablePayload('Нельзя сравнивать разные measure_kind как YoY.')
  }

  const remote = await fetchPublishedTrade()
  if (!remote.ok) return unavailablePayload(remote.error)
  const currentNational = nationalExportRow(remote.rows, current)
  const previousNational = nationalExportRow(remote.rows, previous)
  if (!currentNational || !previousNational) {
    return unavailablePayload('Нет сопоставимых национальных итогов HS 2701.')
  }

  const currentPartners = partnerExportRows(remote.rows, current)
  const previousPartners = partnerExportRows(remote.rows, previous)
  const previousByCode = new Map(previousPartners.map((row) => [row.partner_code, row]))
  const currentCodes = new Set(currentPartners.map((row) => row.partner_code))

  const countries = currentPartners.map((row) => {
    const prev = previousByCode.get(row.partner_code)
    const volume = ratioChange(row.volume, prev?.volume)
    const value = ratioChange(row.value_amount, prev?.value_amount)
    return {
      partnerCode: row.partner_code,
      partnerCountry: row.destination_country,
      currentTonnes: row.volume,
      previousTonnes: prev?.volume ?? null,
      volumeYoy: volume,
      valueYoy: value,
      declaredPartnerMayBeTransit: Boolean(row.declared_partner_may_be_transit),
    }
  })

  for (const prev of previousPartners) {
    if (currentCodes.has(prev.partner_code)) continue
    countries.push({
      partnerCode: prev.partner_code,
      partnerCountry: prev.destination_country,
      currentTonnes: null,
      previousTonnes: prev.volume,
      volumeYoy: ratioChange(null, prev.volume),
      valueYoy: ratioChange(null, prev.value_amount),
      declaredPartnerMayBeTransit: Boolean(prev.declared_partner_may_be_transit),
    })
  }

  return {
    ok: true,
    currentPeriod: current,
    previousPeriod: previous,
    volumeYoy: ratioChange(currentNational.volume, previousNational.volume),
    valueYoy: ratioChange(currentNational.value_amount, previousNational.value_amount),
    currentNational: {
      netWeightTonnes: currentNational.volume,
      tradeValueUsd: currentNational.value_amount,
    },
    previousNational: {
      netWeightTonnes: previousNational.volume,
      tradeValueUsd: previousNational.value_amount,
    },
    countries,
  }
}

export async function loadOutlookWorkspace() {
  const [outlook, exportTotals] = await Promise.all([getOutlook(), getExportAnnualTotals()])
  return { outlook, exportTotals }
}

export async function getExportConcentration(periodId) {
  const byCountry = await getExportByCountry(periodId)
  if (!byCountry.ok) return byCountry
  const total = byCountry.national.netWeightTonnes
  if (!total) return unavailablePayload('Нет национального объёма для концентрации.')
  const ranked = byCountry.partners
  const topN = (n) => {
    const slice = ranked.slice(0, n)
    const sum = slice.reduce((acc, row) => acc + (row.netWeightTonnes || 0), 0)
    return { n, share: (sum / total) * 100, partners: slice.map((row) => row.partnerCode) }
  }
  return {
    ok: true,
    period: byCountry.period,
    top3: topN(3),
    top5: topN(5),
  }
}

export async function getConstraints() {
  const [outlook, geography, byCountry, concentration] = await Promise.all([
    getOutlook(),
    getGeography(),
    getExportByCountry('ytd-2026-01-07'),
    getExportConcentration('ytd-2026-01-07'),
  ])

  const total = byCountry?.ok ? byCountry.national?.netWeightTonnes : null
  const russia = byCountry?.ok
    ? byCountry.partners?.find((row) => row.partnerCode === 'russia')
    : null
  const russiaShare =
    russia?.netWeightTonnes != null && total
      ? (russia.netWeightTonnes / total) * 100
      : null

  const capacity = outlook.nationalProject?.indicators?.find(
    (row) => row.indicator_kind === 'capacity' && row.unit === 'ГВт',
  )
  const newCount = outlook.nationalProject?.indicators?.find(
    (row) => row.indicator_kind === 'count' && String(row.label || '').toLowerCase().includes('новые'),
  )
  const modernizeCount = outlook.nationalProject?.indicators?.find(
    (row) =>
      row.indicator_kind === 'count' && String(row.label || '').toLowerCase().includes('действующ'),
  )

  return {
    outlook,
    geography: geography?.ok ? geography : { ok: false, error: geography?.error },
    exportYtd: {
      ok: Boolean(byCountry?.ok),
      error: byCountry?.ok ? null : byCountry?.error,
      russiaShare,
      russiaSourceId: russia?.sourceId || 'bnsTradeYtd2026',
      top3: concentration?.ok ? concentration.top3 : null,
      top5: concentration?.ok ? concentration.top5 : null,
      period: byCountry?.period || concentration?.period || null,
    },
    generation: {
      capacity,
      newCount,
      modernizeCount,
      projects: outlook.nationalProject?.projects || [],
      program: outlook.nationalProject?.program || null,
    },
  }
}

export async function getMarketIntelligence() {
  const [production, exportCmp, concentration, observations, sourcesRemote] = await Promise.all([
    getProduction(),
    getExportPeriodComparison(EXPORT_PERIODS.ytd2026.id, EXPORT_PERIODS.ytd2025.id),
    getConcentration({ region: 'all', coalType: 'all' }),
    getRetailCoalObservations(),
    fetchPublishedSources(),
  ])

  const sourceByCode = {}
  if (sourcesRemote.ok) {
    for (const row of sourcesRemote.rows) {
      if (!row.code) continue
      sourceByCode[row.code] = {
        organization: row.organization,
        publication: row.publication_title,
        title: row.publication_title,
        url: row.url,
        notes: row.notes || null,
      }
    }
  }

  return assembleMarketIntelligence({
    production,
    exportCmp,
    concentration,
    observations,
    sourceByCode,
  })
}

getOverview.searchRemoteKey = 'overview'
getProduction.searchRemoteKey = 'production'
getCompanyProfiles.searchRemoteKey = 'companies'
getExportAnnualTotals.searchRemoteKey = 'exportTotals'
getExportByCountry.searchRemoteKey = 'exportPartners'

export { sources }
export { loadInfrastructureGraph } from '../services/infrastructureService.js'
