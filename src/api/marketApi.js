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
  coalAssets,
  resourceGuide,
  regions,
  reserveAccounts,
  unavailable,
} from '../data/catalog'
import { INDICATOR_STATUS, SOURCE_STATUS, sourceList, sources } from '../data/sources'
import {
  fetchPublishedCoalAssets,
  fetchPublishedCompanies,
  fetchPublishedEnergyBalance,
  fetchPublishedIndustryIndicators,
  fetchPublishedMarketShares,
  fetchPublishedPrices,
  fetchPublishedChemistryDirections,
  fetchPublishedGenerationProjects,
  fetchPublishedProduction,
  fetchPublishedProgramIndicators,
  fetchPublishedProgramMeasures,
  fetchPublishedRegions,
  fetchPublishedReserves,
  fetchPublishedSources,
  fetchPublishedStrategicPrograms,
  fetchPublishedTrade,
  numericValue,
} from '../services/coalDataService'
import { formatNumber } from '../lib/format'

function segmentMatches(itemSegmentId, coalType) {
  if (coalType === 'all') return true
  return itemSegmentId === coalType
}

export async function getFiltersMeta() {
  return { regions, coalTypes }
}

export async function getOverview(filters) {
  const region = filters?.region ?? 'all'
  const coalType = filters?.coalType ?? 'all'
  const notes = []
  if (region === 'astana') {
    notes.push(
      'Карточки ниже — республиканские показатели. По г. Астана они не пересчитываются: в источниках нет такой разбивки.',
    )
  }
  if (coalType !== 'all') {
    notes.push(
      'Выбранный сегмент не изменяет карточки главной страницы: БНС и Минэнерго не публикуют эти итоги в данной разбивке.',
    )
  }

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
  const allSupabase = mapped.every((item) => item.origin === 'supabase')

  return {
    kpis: mapped,
    regionalNote: notes.join(' '),
    kpisDataOrigin: allSupabase ? 'supabase' : mapped.some((item) => item.origin === 'supabase') ? 'mixed' : 'js-fallback',
  }
}

function overlayOverviewKpi(catalogItem, remote) {
  if (!remote) {
    return { ...catalogItem, origin: 'js-fallback' }
  }
  return {
    ...catalogItem,
    value: remote.value,
    unit: remote.unit || catalogItem.unit,
    sourceId: remote.sourceId || catalogItem.sourceId,
    status: remote.status || catalogItem.status,
    origin: 'supabase',
  }
}

export async function getResources(filters) {
  const region = filters?.region ?? 'all'
  const coalType = filters?.coalType ?? 'all'
  const jsPayload = jsResourcesPayload(region, coalType, 'js-catalog')

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
      reservesDataOrigin: 'js-fallback',
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
      extractionDataOrigin: 'js-fallback',
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
  } else if (reservesCmp?.matched) {
    payload = {
      ...payload,
      assets: applyCompanyReserves(jsPayload.assets, reservesCmp.companyRows),
      assetsDataOrigin: 'js-fallback',
      assetsRemoteCount: assetsRemote.count,
    }
  } else {
    payload = {
      ...payload,
      assetsDataOrigin: 'js-fallback',
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
        ? 'Нет подтвержденных данных по выбранному срезу в каталоге ключевых угольных активов.'
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

  let payload = jsProductionPayload('js-catalog')

  if (!prodRemote.ok) {
    payload = {
      ...payload,
      productionDataOrigin: 'js-fallback',
      productionError: prodRemote.error,
    }
  } else {
    const comparison = compareNationalProduction(prodRemote.rows)
    if (!comparison.matched) {
      payload = {
        ...payload,
        productionDataOrigin: 'js-fallback',
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
      flowsDataOrigin: 'js-fallback',
      flowsError: tradeRemote.error,
    }
  } else {
    const comparison = compareTrade(tradeRemote.rows)
    if (!comparison.matched) {
      payload = {
        ...payload,
        flowsDataOrigin: 'js-fallback',
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
      indicatorsDataOrigin: 'js-fallback',
      indicatorsError: industryRemote.error,
    }
  } else {
    const comparison = compareIndustryIndicators(industryRemote.rows)
    if (!comparison.matched) {
      payload = {
        ...payload,
        indicatorsDataOrigin: 'js-fallback',
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

  return payload
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

  const nationalActual2025 = productionRows.find(
    (row) =>
      !row.asset_id &&
      !row.company_id &&
      row.measure_kind === 'actual' &&
      row.year === 2025,
  )
  const nationalPlan2026 = productionRows.find(
    (row) =>
      !row.asset_id &&
      !row.company_id &&
      row.measure_kind === 'plan' &&
      row.year === 2026,
  )
  const companyPlan2026 = productionRows.find(
    (row) => row.company_id && row.measure_kind === 'plan' && row.year === 2026,
  )
  const companyCapacity = companyPlan2026
    ? productionRows.find(
        (row) =>
          row.company_id === companyPlan2026.company_id && row.measure_kind === 'capacity',
      )
    : null

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

  const nationalProgram = programs.find((row) => row.program_type === 'national_project') || null
  const companyProgram = programs.find((row) => row.program_type === 'company_strategy') || null
  const chemistryProgram = programs.find((row) => row.program_type === 'roadmap') || null
  const heatingProgram = programs.find((row) => row.program_type === 'seasonal_plan') || null

  const nationalIndicators = nationalProgram
    ? indicators.filter((row) => row.program_id === nationalProgram.id)
    : []
  const companyIndicators = companyProgram
    ? indicators.filter((row) => row.program_id === companyProgram.id)
    : []
  const heatingIndicators = heatingProgram
    ? indicators.filter((row) => row.program_id === heatingProgram.id)
    : []

  const investmentParent = companyIndicators.find(
    (row) => row.indicator_kind === 'investment' && !row.parent_indicator_id,
  )
  const investmentChildren = investmentParent
    ? companyIndicators.filter((row) => row.parent_indicator_id === investmentParent.id)
    : []

  const heatingTotal = heatingIndicators.find(
    (row) => row.indicator_kind === 'demand' && !row.parent_indicator_id,
  )
  const heatingParts = heatingTotal
    ? heatingIndicators.filter((row) => row.parent_indicator_id === heatingTotal.id)
    : []
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
  const companyMeasures = companyProgram
    ? measures.filter((row) => row.program_id === companyProgram.id)
    : []
  const chemistryMeasures = chemistryProgram
    ? measures.filter((row) => row.program_id === chemistryProgram.id)
    : []

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
      actualExtraction: mapOutlookMetric(nationalActual2025, {
        status: 'ФАКТ',
        period: nationalActual2025 ? String(nationalActual2025.year) : null,
        note: 'Фактическая добыча. Не план 2026 года.',
      }),
      plannedExtraction: mapOutlookMetric(nationalPlan2026, {
        status: 'ПЛАН',
        period: nationalPlan2026 ? String(nationalPlan2026.year) : null,
        note: 'План добычи Казахстана. Не факт 2026 года и не сумма с планом отдельного предприятия.',
      }),
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
      companyPlan: mapOutlookMetric(companyPlan2026, {
        status: 'ПЛАН',
        period: companyPlan2026 ? String(companyPlan2026.year) : null,
        label: companyPlan2026
          ? `План добычи ${companyPlan2026.company?.short_name || companyPlan2026.company?.name || 'предприятия'}`
          : null,
        note: 'План предприятия внутри национального рынка. Не складывается с республиканским планом.',
      }),
    },
    nationalProject: nationalProgram
      ? {
          program: mapOutlookProgram(nationalProgram),
          indicators: nationalIndicators.map((row) =>
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
      program: companyProgram ? mapOutlookProgram(companyProgram) : null,
      plan: mapOutlookMetric(companyPlan2026, {
        status: 'ПЛАН',
        period: companyPlan2026 ? String(companyPlan2026.year) : null,
        note: 'План добычи на календарный год. Не производственная мощность.',
      }),
      capacity: mapOutlookMetric(companyCapacity, {
        status: 'Данные предприятия',
        period: companyCapacity
          ? `${companyCapacity.year ?? ''}`.trim() || null
          : null,
        note: 'Указанная производственная мощность в источнике этапа 1. Не план добычи.',
      }),
      investmentParent: mapOutlookMetric(investmentParent, {
        status: companyProgram ? roleFromProgram(companyProgram) : 'ПЛАН',
        period: companyProgram ? programHorizon(companyProgram) : null,
        note: investmentParent?.methodology_note,
      }),
      investmentParts: investmentChildren.map((row) =>
        mapOutlookMetric(row, {
          status: 'ПЛАН',
          period: companyProgram ? programHorizon(companyProgram) : null,
          note: row.methodology_note,
          parentId: row.parent_indicator_id,
        }),
      ),
      measures: companyMeasures.map(mapOutlookMeasure),
    },
    heating: heatingProgram
      ? {
          program: mapOutlookProgram(heatingProgram),
          total: mapOutlookMetric(heatingTotal, {
            status: 'СЕЗОННАЯ ПОТРЕБНОСТЬ',
            period: programHorizon(heatingProgram),
            note: heatingTotal?.methodology_note,
          }),
          parts: heatingParts.map((row) =>
            mapOutlookMetric(row, {
              status: 'СЕЗОННАЯ ПОТРЕБНОСТЬ',
              period: programHorizon(heatingProgram),
              note: row.methodology_note,
              parentId: row.parent_indicator_id,
            }),
          ),
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
    period: extras.period || null,
    status: extras.status,
    sourceId: row.source?.code || null,
    source_id: row.source_id,
    approx: Boolean(row.is_approximate),
    note: extras.note || row.methodology_note || row.notes || null,
    company_id: row.company_id || null,
    program_id: row.program_id || null,
    parent_indicator_id: extras.parentId || row.parent_indicator_id || null,
    indicator_kind: row.indicator_kind || null,
    measure_kind: row.measure_kind || null,
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
    extraction: extractionAccounts,
    flows: flow2025,
    investments,
    users: kpis.find((item) => item.id === 'subsoilUsers'),
    plan: kpis.find((item) => item.id === 'plan2026'),
    missingMonthly: [unavailable.monthlyProduction2026, unavailable.monthlyExport2026],
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

function isNationalVolumeRow(row) {
  return (
    !row.asset_id &&
    !row.company_id &&
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

  const national = rows.filter(isNationalVolumeRow)
  const used = new Set()
  const mapped = []

  for (const item of expected) {
    const match = national.find((row) => {
      if (used.has(row.id)) return false
      return (
        valuesClose(row.value, item.value) &&
        row.year === item.year &&
        row.unit === item.unit &&
        row.measure_kind === item.measure_kind &&
        row.data_status === item.data_status &&
        row.source?.code === item.sourceCode
      )
    })
    if (!match) {
      return {
        matched: false,
        reason: `Не совпал показатель ${item.catalogId}.`,
      }
    }
    used.add(match.id)
    mapped.push({ expected: item, row: match })
  }

  const extraNational = national.filter((row) => !used.has(row.id))
  if (extraNational.length > 0) {
    return {
      matched: false,
      reason: `В production есть дополнительные национальные записи actual/plan, которых нет в JS-каталоге: ${extraNational.length}.`,
    }
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

  const extra = rows.filter((row) => !used.has(row.id))
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
  const used = new Set()
  const mapped = []

  for (const item of expected) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
      return (
        row.indicator === item.catalogItem.label &&
        valuesClose(row.value, item.value) &&
        row.unit === item.catalogItem.unit &&
        row.year === item.year &&
        row.data_status === item.data_status &&
        Boolean(row.is_approximate) === item.is_approximate &&
        row.source?.code === 'minenergo2025'
      )
    })
    if (!match) {
      return {
        matched: false,
        reason: `Не совпал отраслевой показатель «${item.catalogItem.label}».`,
      }
    }
    used.add(match.id)
    mapped.push({
      kind: item.kind,
      item: mapCatalogIndicator(item.catalogItem, match, {
        value: match.value,
        unit: match.unit,
        approx: Boolean(match.is_approximate),
      }),
    })
  }

  const extra = rows.filter((row) => !used.has(row.id))
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В industry_indicators есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
  }

  return {
    matched: true,
    investments: mapped.filter((row) => row.kind === 'investment').map((row) => row.item),
    users: mapped.find((row) => row.kind === 'users').item,
  }
}

function compareEnergyBalance(rows) {
  const used = new Set()
  const items = []

  for (const catalogItem of energyRole) {
    const match = rows.find((row) => {
      if (used.has(row.id)) return false
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
    used.add(match.id)
    items.push({
      ...mapCatalogIndicator(catalogItem, match, {
        value: match.value,
        unit: match.unit,
      }),
      display: catalogItem.display,
    })
  }

  const extra = rows.filter((row) => !used.has(row.id))
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В energy_balance есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
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
  { code: 'shubarkol-company', value: 12.54, unit: 'млн т в год' },
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
      const expectedCoalType = catalogItem.segmentIds.includes('household') ? 'household' : 'energy'
      return (
        row.code === catalogItem.id &&
        row.name === catalogItem.name &&
        row.coal_type === expectedCoalType &&
        regionCode === catalogRegion &&
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
  if (extra.length > 0) {
    return {
      matched: false,
      reason: `В coal_assets есть дополнительные записи, которых нет в JS-каталоге: ${extra.length}.`,
    }
  }

  let capacitiesByCode = new Map()
  if (productionOk) {
    const capUsed = new Set()
    for (const item of EXPECTED_CAPACITIES) {
      const match = capacityRows.find((row) => {
        if (capUsed.has(row.id)) return false
        return (
          row.coal_asset?.code === item.code &&
          valuesClose(row.value, item.value) &&
          row.unit === item.unit &&
          row.measure_kind === 'capacity'
        )
      })
      if (!match) {
        return { matched: false, reason: `Не совпала мощность актива ${item.code}.` }
      }
      capUsed.add(match.id)
      capacitiesByCode.set(item.code, match)
    }
    const extraCap = capacityRows.filter((row) => !capUsed.has(row.id))
    if (extraCap.length > 0) {
      return {
        matched: false,
        reason: `В production есть дополнительные мощности, которых нет в каталоге: ${extraCap.length}.`,
      }
    }
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
        : catalogItem.reserves,
      capacity: capacityRow
        ? {
            display: `${formatNumber(capacityRow.value)} ${capacityRow.unit}`,
            title: capacityRow.notes || 'Производственная мощность, не фактическая добыча.',
          }
        : productionOk
          ? UNCONFIRMED_CELL
          : catalogItem.capacity,
      origin: 'supabase',
      sourceUrl: row.source?.url || null,
    }
  })

  return { matched: true, assets }
}

export async function getConcentration(filters) {
  const coalType = filters?.coalType ?? 'all'
  const jsPayload = jsConcentrationPayload(coalType)
  const [sharesRemote, pricesRemote] = await Promise.all([
    fetchPublishedMarketShares(),
    fetchPublishedPrices(),
  ])
  const growth = applyPriceGrowth(jsPayload.priceItems, pricesRemote)

  let payload = {
    ...jsPayload,
    priceItems: growth.priceItems,
    growthDataOrigin: growth.growthDataOrigin,
    pricesError: growth.pricesError,
    pricesRemoteCount: growth.pricesRemoteCount,
  }

  if (!sharesRemote.ok) {
    return {
      ...payload,
      sharesDataOrigin: 'js-fallback',
      sharesError: sharesRemote.error,
    }
  }

  const comparison = compareMarketShares(sharesRemote.rows)
  if (!comparison.matched) {
    return {
      ...payload,
      sharesDataOrigin: 'js-fallback',
      sharesError: comparison.reason,
      sharesRemoteCount: sharesRemote.count,
    }
  }

  const items = comparison.items.filter((item) => segmentMatches(item.segmentId, coalType))
  return {
    ...payload,
    items,
    emptyNote: items.length === 0 ? jsPayload.emptyNote : null,
    sharesDataOrigin: 'supabase',
    sharesRemoteCount: sharesRemote.count,
  }
}

function jsConcentrationPayload(coalType) {
  const items = concentration.filter((item) => segmentMatches(item.segmentId, coalType))
  return {
    items,
    emptyNote:
      items.length === 0
        ? 'Нет подтвержденных данных по выбранному сегменту. Показатели АЗРК относятся к сегментам первичной оптовой реализации, а не к произвольной классификации.'
        : null,
    disclaimer:
      'Доли крупнейших участников соответствующих сегментов рынка первичной оптовой реализации угля. Не являются долями всего угольного рынка Казахстана.',
    priceGrowthCaption: 'Накопленный рост цен первичной оптовой реализации за период 2022–2025 гг.',
    priceItems: priceGrowth.filter((item) => segmentMatches(item.segmentId, coalType)),
    sharesDataOrigin: 'js-catalog',
    growthDataOrigin: 'js-catalog',
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

export async function getEnergyRole() {
  const jsPayload = jsEnergyPayload('js-catalog')
  const remote = await fetchPublishedEnergyBalance()

  if (!remote.ok) {
    return {
      ...jsPayload,
      energyDataOrigin: 'js-fallback',
      energyError: remote.error,
    }
  }

  const comparison = compareEnergyBalance(remote.rows)
  if (!comparison.matched) {
    return {
      ...jsPayload,
      energyDataOrigin: 'js-fallback',
      energyError: comparison.reason,
      energyRemoteCount: remote.count,
    }
  }

  return {
    ...jsPayload,
    items: comparison.items,
    energyDataOrigin: 'supabase',
    energyRemoteCount: remote.count,
  }
}

function jsEnergyPayload(origin, extra = {}) {
  return {
    items: energyRole,
    quote: energyRoleQuote,
    otherFuels:
      'Доли других источников энергии в этой публикации в текущую модель данных не включены, поэтому здесь не отображаются.',
    energyDataOrigin: origin,
    ...extra,
  }
}

function applyPriceGrowth(jsItems, remote) {
  if (!remote.ok) {
    return {
      priceItems: jsItems,
      growthDataOrigin: 'js-fallback',
      pricesError: remote.error,
    }
  }

  const comparison = comparePrices(remote.rows)
  if (!comparison.matched) {
    return {
      priceItems: jsItems,
      growthDataOrigin: 'js-fallback',
      pricesError: comparison.reason,
      pricesRemoteCount: remote.count,
    }
  }

  const byId = new Map(comparison.growthItems.map((item) => [item.id, item]))
  return {
    priceItems: jsItems.map((item) => byId.get(item.id) || item),
    growthDataOrigin: 'supabase',
    pricesRemoteCount: remote.count,
  }
}

export async function getPriceDynamics(filters) {
  const coalType = filters?.coalType ?? 'all'
  const jsItems = priceGrowth.filter((item) => segmentMatches(item.segmentId, coalType))
  const remote = await fetchPublishedPrices()
  const growth = applyPriceGrowth(jsItems, remote)
  return {
    items: growth.priceItems,
    emptyNote:
      jsItems.length === 0
        ? 'Нет подтвержденных данных по накопленному росту цен для выбранного сегмента.'
        : null,
    disclaimer: 'Накопленный рост цен первичной оптовой реализации за период 2022–2025 гг.',
    dynamicsDataOrigin: growth.growthDataOrigin,
    pricesError: growth.pricesError,
    pricesRemoteCount: growth.pricesRemoteCount,
  }
}

export async function getRetailPrices(filters) {
  const region = filters?.region ?? 'all'
  if (region !== 'all' && region !== 'astana') {
    return {
      items: [],
      disclaimer: null,
      emptyNote: unavailable.astanaOnly,
      pricesDataOrigin: 'js-catalog',
    }
  }

  const jsPayload = jsRetailPayload()
  const remote = await fetchPublishedPrices()

  if (!remote.ok) {
    return { ...jsPayload, pricesDataOrigin: 'js-fallback', pricesError: remote.error }
  }

  const comparison = comparePrices(remote.rows)
  if (!comparison.matched) {
    return {
      ...jsPayload,
      pricesDataOrigin: 'js-fallback',
      pricesError: comparison.reason,
      pricesRemoteCount: remote.count,
    }
  }

  return {
    ...jsPayload,
    items: comparison.retailItems,
    pricesDataOrigin: 'supabase',
    pricesRemoteCount: remote.count,
  }
}

function jsRetailPayload() {
  return {
    items: astanaRetailPrices,
    disclaimer:
      'Средние розничные цены в г. Астана. Не являются средними ценами по Республике Казахстан.',
    emptyNote: null,
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

  const extra = rows.filter((row) => !used.has(row.id))
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
  const remote = await fetchPublishedSources()
  if (!remote.ok) {
    return {
      items: sourceList,
      sourcesDataOrigin: 'js-fallback',
    }
  }

  const items = remote.rows.map((row) => ({
    id: row.code || row.id,
    organization: row.organization,
    publication: row.publication_title,
    period: row.published_at || null,
    url: row.url,
    sourceStatus: sourceStatusFromType(row.source_type),
    notes: row.notes || null,
    origin: 'supabase',
  }))

  return {
    items,
    sourcesDataOrigin: 'supabase',
    sourcesRemoteCount: remote.count,
  }
}

function sourceStatusFromType(type) {
  if (type === 'company') return SOURCE_STATUS.company
  if (type === 'regional') return 'Региональные данные'
  return SOURCE_STATUS.official
}

export { sources }
