import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase'

const PUBLISHED_SOURCE_FIELDS =
  'id, code, organization, publication_title, url, source_type, published_at, retrieved_at, notes, is_published'

export function sanitizePublicError(error) {
  const raw = error?.message || String(error || 'Неизвестная ошибка')
  return raw
    .replace(/https?:\/\/[^\s)'"]+/gi, '[адрес скрыт]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[ключ скрыт]')
}

export async function fetchPublishedSources() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('sources')
      .select(PUBLISHED_SOURCE_FIELDS)
      .eq('is_published', true)

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = Array.isArray(data) ? data : []
    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

const PRODUCTION_BASE_FIELDS =
  'id, value, unit, period_start, period_end, period_type, measure_kind, data_status, is_verified, is_published, is_approximate, notes, source_id, asset_id, company_id, region_id'

const PRODUCTION_BASE_FIELDS_V2 = `${PRODUCTION_BASE_FIELDS}, series_role`

const PRODUCTION_EMBED_FIELDS = `${PRODUCTION_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), companies!company_id ( id, code, name, short_name ), coal_assets!asset_id ( id, code, name, asset_type ), regions!region_id ( id, code, name )`

const PRODUCTION_EMBED_FIELDS_V2 = `${PRODUCTION_BASE_FIELDS_V2}, sources!source_id ( id, code, organization, publication_title, url, source_type ), companies!company_id ( id, code, name, short_name ), coal_assets!asset_id ( id, code, name, asset_type ), regions!region_id ( id, code, name )`

function unwrapEmbed(value) {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

async function loadByIds(supabase, table, ids, fields) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase.from(table).select(fields).in('id', unique)
  if (error) throw error
  return new Map((data || []).map((row) => [row.id, row]))
}

async function attachRelatedRecords(supabase, rows) {
  const sources = await loadByIds(
    supabase,
    'sources',
    rows.map((row) => row.source_id),
    'id, code, organization, publication_title, url, source_type',
  )
  const companies = await loadByIds(
    supabase,
    'companies',
    rows.map((row) => row.company_id),
    'id, code, name, short_name',
  )
  const assets = await loadByIds(
    supabase,
    'coal_assets',
    rows.map((row) => row.asset_id),
    'id, code, name, asset_type',
  )
  const regions = await loadByIds(
    supabase,
    'regions',
    rows.map((row) => row.region_id),
    'id, code, name',
  )
  return rows.map((row) => ({
    ...row,
    sources: sources.get(row.source_id) || null,
    companies: companies.get(row.company_id) || null,
    coal_assets: assets.get(row.asset_id) || null,
    regions: regions.get(row.region_id) || null,
  }))
}

export function yearFromPeriod(row) {
  const raw = row?.period_end || row?.period_start
  if (!raw) return null
  const year = Number(String(raw).slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export function numericValue(value) {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export async function fetchPublishedProduction() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('production').select(PRODUCTION_EMBED_FIELDS_V2)

    if (error) {
      ;({ data, error } = await supabase.from('production').select(PRODUCTION_EMBED_FIELDS))
    }

    if (error) {
      const plainV2 = await supabase.from('production').select(PRODUCTION_BASE_FIELDS_V2)
      const plain = plainV2.error
        ? await supabase.from('production').select(PRODUCTION_BASE_FIELDS)
        : plainV2
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      data = await attachRelatedRecords(supabase, plain.data || [])
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      value: numericValue(row.value),
      year: yearFromPeriod(row),
      source: unwrapEmbed(row.sources),
      company: unwrapEmbed(row.companies),
      coal_asset: unwrapEmbed(row.coal_assets),
      region: unwrapEmbed(row.regions),
    }))

    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

const RESERVES_BASE_FIELDS =
  'id, value, unit, reserve_type, period_date, methodology_note, data_status, is_verified, is_published, source_id, asset_id'

const RESERVES_EMBED_FIELDS = `${RESERVES_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), coal_assets!asset_id ( id, name, asset_type, code, operator_company_id, region_id )`

async function attachReserveRelatedRecords(supabase, rows) {
  const sources = await loadByIds(
    supabase,
    'sources',
    rows.map((row) => row.source_id),
    'id, code, organization, publication_title, url, source_type',
  )
  const assets = await loadByIds(
    supabase,
    'coal_assets',
    rows.map((row) => row.asset_id),
    'id, name, asset_type, code, operator_company_id, region_id',
  )
  const companies = await loadByIds(
    supabase,
    'companies',
    [...assets.values()].map((asset) => asset.operator_company_id),
    'id, name, short_name',
  )
  const regions = await loadByIds(
    supabase,
    'regions',
    [...assets.values()].map((asset) => asset.region_id),
    'id, name',
  )
  return rows.map((row) => {
    const asset = assets.get(row.asset_id) || null
    return {
      ...row,
      sources: sources.get(row.source_id) || null,
      coal_assets: asset,
      companies: asset ? companies.get(asset.operator_company_id) || null : null,
      regions: asset ? regions.get(asset.region_id) || null : null,
    }
  })
}

export async function fetchPublishedReserves() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('reserves').select(RESERVES_EMBED_FIELDS)

    if (error) {
      const plain = await supabase.from('reserves').select(RESERVES_BASE_FIELDS)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      data = await attachReserveRelatedRecords(supabase, plain.data || [])
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) => {
      const asset = unwrapEmbed(row.coal_assets)
      const periodYear = row.period_date ? Number(String(row.period_date).slice(0, 4)) : null
      return {
        ...row,
        value: numericValue(row.value),
        year: Number.isFinite(periodYear) ? periodYear : null,
        source: unwrapEmbed(row.sources),
        coal_asset: asset,
        company: unwrapEmbed(row.companies) || null,
        region: unwrapEmbed(row.regions) || null,
      }
    })

    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

const PRICES_BASE_FIELDS =
  'id, asset_id, region_id, coal_product, coal_type, price, price_max, currency, unit, market_level, indicator_kind, period_start, period_end, source_id, data_status, is_verified, is_published, notes'

const PRICES_EMBED_FIELDS = `${PRICES_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), regions!region_id ( id, name, code ), coal_assets!asset_id ( id, name, asset_type, code )`

async function attachPriceRelatedRecords(supabase, rows) {
  const sources = await loadByIds(
    supabase,
    'sources',
    rows.map((row) => row.source_id),
    'id, code, organization, publication_title, url, source_type',
  )
  const regions = await loadByIds(
    supabase,
    'regions',
    rows.map((row) => row.region_id),
    'id, name, code',
  )
  const assets = await loadByIds(
    supabase,
    'coal_assets',
    rows.map((row) => row.asset_id),
    'id, name, asset_type, code',
  )
  return rows.map((row) => ({
    ...row,
    sources: sources.get(row.source_id) || null,
    regions: regions.get(row.region_id) || null,
    coal_assets: assets.get(row.asset_id) || null,
  }))
}

export async function fetchPublishedPrices() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('prices').select(PRICES_EMBED_FIELDS)

    if (error) {
      const plain = await supabase.from('prices').select(PRICES_BASE_FIELDS)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      data = await attachPriceRelatedRecords(supabase, plain.data || [])
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      price: numericValue(row.price),
      price_max:
        row.price_max === null || row.price_max === undefined ? null : numericValue(row.price_max),
      source: unwrapEmbed(row.sources),
      region: unwrapEmbed(row.regions),
      coal_asset: unwrapEmbed(row.coal_assets),
    }))

    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

const RETAIL_COAL_BASE_FIELDS =
  'id, source_id, region_id, locality, seller, coal_brand, coal_variant, price, price_min, price_max, currency, unit, stock_tonnes, observation_date, publication_date, publication_url, observation_type, geographic_scope, methodology_scope, period_start, period_end, notes, is_verified, is_published'

const RETAIL_COAL_EMBED_FIELDS = `${RETAIL_COAL_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), regions!region_id ( id, name, code )`

async function attachRetailCoalRelatedRecords(supabase, rows) {
  const sources = await loadByIds(
    supabase,
    'sources',
    rows.map((row) => row.source_id),
    'id, code, organization, publication_title, url, source_type',
  )
  const regions = await loadByIds(
    supabase,
    'regions',
    rows.map((row) => row.region_id),
    'id, name, code',
  )
  return rows.map((row) => ({
    ...row,
    sources: sources.get(row.source_id) || null,
    regions: regions.get(row.region_id) || null,
  }))
}

export async function fetchPublishedRetailCoalObservations() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('retail_coal_observations').select(RETAIL_COAL_EMBED_FIELDS)

    if (error) {
      const plain = await supabase.from('retail_coal_observations').select(RETAIL_COAL_BASE_FIELDS)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      data = await attachRetailCoalRelatedRecords(supabase, plain.data || [])
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      price: numericValue(row.price),
      price_min: numericValue(row.price_min),
      price_max: numericValue(row.price_max),
      stock_tonnes: numericValue(row.stock_tonnes),
      source: unwrapEmbed(row.sources),
      region: unwrapEmbed(row.regions),
    }))

    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

const MARKET_SHARES_BASE_FIELDS =
  'id, company_or_group, market_segment, share_percent, year, source_id, data_status, is_verified, is_published, notes'

const MARKET_SHARES_EMBED_FIELDS = `${MARKET_SHARES_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type )`

async function attachShareRelatedRecords(supabase, rows) {
  const sources = await loadByIds(
    supabase,
    'sources',
    rows.map((row) => row.source_id),
    'id, code, organization, publication_title, url, source_type',
  )
  return rows.map((row) => ({
    ...row,
    sources: sources.get(row.source_id) || null,
  }))
}

export async function fetchPublishedMarketShares() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('market_shares').select(MARKET_SHARES_EMBED_FIELDS)

    if (error) {
      const plain = await supabase.from('market_shares').select(MARKET_SHARES_BASE_FIELDS)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      data = await attachShareRelatedRecords(supabase, plain.data || [])
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      share_percent: numericValue(row.share_percent),
      year: Number(row.year),
      source: unwrapEmbed(row.sources),
    }))

    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

async function fetchPublishedRows(table, baseFields, mapRow) {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  const embedFields = `${baseFields}, sources!source_id ( id, code, organization, publication_title, url, source_type )`
  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from(table).select(embedFields)

    if (error) {
      const plain = await supabase.from(table).select(baseFields)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      const sources = await loadByIds(
        supabase,
        'sources',
        (plain.data || []).map((row) => row.source_id),
        'id, code, organization, publication_title, url, source_type',
      )
      data = (plain.data || []).map((row) => ({
        ...row,
        sources: sources.get(row.source_id) || null,
      }))
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) =>
      mapRow({
        ...row,
        source: unwrapEmbed(row.sources),
      }),
    )
    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

const ENERGY_BALANCE_BASE_FIELDS =
  'id, indicator, value, unit, year, source_id, data_status, is_verified, is_published, notes'

const ENERGY_BALANCE_SECTOR_FIELDS = `${ENERGY_BALANCE_BASE_FIELDS}, official_label, dimension, sector_code, parent_sector_code, observation_scope, measure_kind, is_derived, denominator_code`

function mapEnergyBalanceRow(row) {
  return {
    ...row,
    value: numericValue(row.value),
    year: Number(row.year),
    is_derived: Boolean(row.is_derived),
  }
}

export async function fetchPublishedEnergyBalance() {
  const withSectors = await fetchPublishedRows(
    'energy_balance',
    ENERGY_BALANCE_SECTOR_FIELDS,
    mapEnergyBalanceRow,
  )
  if (withSectors.ok) return withSectors
  return fetchPublishedRows('energy_balance', ENERGY_BALANCE_BASE_FIELDS, mapEnergyBalanceRow)
}

const REGIONAL_COAL_ENERGY_FIELDS =
  'id, region_id, source_id, year, metric_type, consumer_name, value, unit, official_label, methodology_scope, observation_scope, measure_kind, data_status, is_derived, is_verified, is_published, notes'

function mapRegionalCoalEnergyRow(row) {
  return {
    ...row,
    value: numericValue(row.value),
    year: Number(row.year),
    is_derived: Boolean(row.is_derived),
    source: unwrapEmbed(row.sources),
    region: unwrapEmbed(row.regions),
  }
}

export async function fetchPublishedRegionalCoalEnergy() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  const embedFields = `${REGIONAL_COAL_ENERGY_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), regions!region_id ( id, code, name )`

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('regional_coal_energy').select(embedFields)

    if (error) {
      const plain = await supabase.from('regional_coal_energy').select(REGIONAL_COAL_ENERGY_FIELDS)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      const sources = await loadByIds(
        supabase,
        'sources',
        (plain.data || []).map((row) => row.source_id),
        'id, code, organization, publication_title, url, source_type',
      )
      const regions = await loadByIds(
        supabase,
        'regions',
        (plain.data || []).map((row) => row.region_id),
        'id, code, name',
      )
      data = (plain.data || []).map((row) => ({
        ...row,
        sources: sources.get(row.source_id) || null,
        regions: regions.get(row.region_id) || null,
      }))
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map(mapRegionalCoalEnergyRow)
    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

export function fetchPublishedIndustryIndicators() {
  return fetchPublishedRows(
    'industry_indicators',
    'id, indicator, value, unit, period_start, period_end, source_id, data_status, is_verified, is_published, is_approximate, notes',
    (row) => ({
      ...row,
      value: numericValue(row.value),
      year: yearFromPeriod(row),
    }),
  )
}

const TRADE_BASE_FIELDS =
  'id, trade_type, destination_country, volume, volume_unit, value_amount, currency, period_start, period_end, source_id, data_status, is_verified, is_published, notes'

const TRADE_BASE_FIELDS_V2 = `${TRADE_BASE_FIELDS}, reporter, hs_code, flow, measure_kind, is_full_year, declared_partner_may_be_transit, methodology_scope, series_code, partner_code, observation_scope`

export async function fetchPublishedTrade() {
  const mappedV2 = await fetchPublishedRows('trade', TRADE_BASE_FIELDS_V2, mapTradeRow)
  if (mappedV2.ok) return mappedV2
  return fetchPublishedRows('trade', TRADE_BASE_FIELDS, mapTradeRow)
}

function mapTradeRow(row) {
  return {
    ...row,
    volume: numericValue(row.volume),
    value_amount: row.value_amount == null || row.value_amount === '' ? null : numericValue(row.value_amount),
    year: yearFromPeriod(row),
    is_full_year: row.is_full_year == null ? null : Boolean(row.is_full_year),
    declared_partner_may_be_transit: Boolean(row.declared_partner_may_be_transit),
  }
}

export function fetchPublishedStrategicPrograms() {
  return fetchPublishedLinkedRows(
    'strategic_programs',
    'id, name, program_type, status, start_year, end_year, company_id, source_id, methodology_note, is_verified, is_published',
    (row) => ({
      ...row,
      start_year: row.start_year == null ? null : Number(row.start_year),
      end_year: row.end_year == null ? null : Number(row.end_year),
    }),
  )
}

export function fetchPublishedProgramIndicators() {
  return fetchPublishedLinkedRows(
    'program_indicators',
    'id, program_id, name, value, unit, indicator_kind, period_start, period_end, company_id, region_id, parent_indicator_id, source_id, status, methodology_note, is_verified, is_published, value_qualifier',
    (row) => ({
      ...row,
      value: numericValue(row.value),
      year: yearFromPeriod(row),
      value_qualifier: row.value_qualifier || 'exact',
    }),
  )
}

export function fetchPublishedGenerationProjects() {
  return fetchPublishedRows(
    'generation_projects',
    'id, program_id, name, project_type, capacity_mw, region_id, location_name, source_id, status, start_year, end_year, is_verified, is_published',
    (row) => ({
      ...row,
      capacity_mw: numericValue(row.capacity_mw),
      start_year: row.start_year == null ? null : Number(row.start_year),
      end_year: row.end_year == null ? null : Number(row.end_year),
    }),
  )
}

export function fetchPublishedChemistryDirections() {
  return fetchPublishedRows(
    'chemistry_directions',
    'id, program_id, name, description, source_id, is_verified, is_published',
    (row) => row,
  )
}

export function fetchPublishedProgramMeasures() {
  return fetchPublishedLinkedRows(
    'program_measures',
    'id, program_id, company_id, name, description, measure_type, source_id, is_verified, is_published',
    (row) => row,
  )
}

async function fetchPublishedLinkedRows(table, baseFields, mapRow) {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  const embedFields = `${baseFields}, sources!source_id ( id, code, organization, publication_title, url, source_type ), companies!company_id ( id, code, name, short_name )`
  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from(table).select(embedFields)

    if (error) {
      const plain = await supabase.from(table).select(baseFields)
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      const sources = await loadByIds(
        supabase,
        'sources',
        (plain.data || []).map((row) => row.source_id),
        'id, code, organization, publication_title, url, source_type',
      )
      const companies = await loadByIds(
        supabase,
        'companies',
        (plain.data || []).map((row) => row.company_id),
        'id, code, name, short_name',
      )
      data = (plain.data || []).map((row) => ({
        ...row,
        sources: sources.get(row.source_id) || null,
        companies: companies.get(row.company_id) || null,
      }))
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) =>
      mapRow({
        ...row,
        source: unwrapEmbed(row.sources),
        company: unwrapEmbed(row.companies),
      }),
    )
    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

export function fetchPublishedCompanies() {
  return fetchPublishedDictionary(
    'companies',
    'id, code, name, short_name, company_type, website, notes, is_published',
  )
}

export function fetchPublishedRegions() {
  return fetchPublishedDictionary('regions', 'id, code, name, country, is_published')
}

const COAL_ASSETS_BASE_FIELDS =
  'id, code, name, asset_type, region_id, parent_asset_id, operator_company_id, coal_type, description, source_id, is_published'

const COAL_ASSETS_BASE_FIELDS_V2 = `${COAL_ASSETS_BASE_FIELDS}, mining_method`

const COAL_ASSETS_EMBED_FIELDS = `${COAL_ASSETS_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), regions!region_id ( id, code, name ), companies!operator_company_id ( id, code, name, short_name )`

const COAL_ASSETS_EMBED_FIELDS_V2 = `${COAL_ASSETS_BASE_FIELDS_V2}, sources!source_id ( id, code, organization, publication_title, url, source_type ), regions!region_id ( id, code, name ), companies!operator_company_id ( id, code, name, short_name )`

export async function fetchPublishedCoalAssets() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    let { data, error } = await supabase.from('coal_assets').select(COAL_ASSETS_EMBED_FIELDS_V2)

    if (error) {
      ;({ data, error } = await supabase.from('coal_assets').select(COAL_ASSETS_EMBED_FIELDS))
    }

    if (error) {
      const plainV2 = await supabase.from('coal_assets').select(COAL_ASSETS_BASE_FIELDS_V2)
      const plain = plainV2.error
        ? await supabase.from('coal_assets').select(COAL_ASSETS_BASE_FIELDS)
        : plainV2
      if (plain.error) {
        return {
          ok: false,
          rows: [],
          count: 0,
          error: sanitizePublicError(plain.error),
        }
      }
      const sources = await loadByIds(
        supabase,
        'sources',
        (plain.data || []).map((row) => row.source_id),
        'id, code, organization, publication_title, url, source_type',
      )
      const regions = await loadByIds(
        supabase,
        'regions',
        (plain.data || []).map((row) => row.region_id),
        'id, code, name',
      )
      const companies = await loadByIds(
        supabase,
        'companies',
        (plain.data || []).map((row) => row.operator_company_id),
        'id, code, name, short_name',
      )
      data = (plain.data || []).map((row) => ({
        ...row,
        sources: sources.get(row.source_id) || null,
        regions: regions.get(row.region_id) || null,
        companies: companies.get(row.operator_company_id) || null,
      }))
      error = null
    }

    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }

    const rows = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      source: unwrapEmbed(row.sources),
      region: unwrapEmbed(row.regions),
      operator: unwrapEmbed(row.companies),
    }))
    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

async function fetchPublishedDictionary(table, fields) {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: 'Подключение к данным временно недоступно.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from(table).select(fields)
    if (error) {
      return {
        ok: false,
        rows: [],
        count: 0,
        error: sanitizePublicError(error),
      }
    }
    const rows = Array.isArray(data) ? data : []
    return {
      ok: true,
      rows,
      count: rows.length,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      error: sanitizePublicError(error),
    }
  }
}

export const HS2701 = '2701'

export const EXPORT_PERIODS = {
  fy2023: {
    id: 'fy-2023',
    label: '2023',
    year: 2023,
    period_start: '2023-01-01',
    period_end: '2023-12-31',
    is_full_year: true,
    measure_kind: 'actual',
    comparable_period_id: null,
  },
  fy2024: {
    id: 'fy-2024',
    label: '2024',
    year: 2024,
    period_start: '2024-01-01',
    period_end: '2024-12-31',
    is_full_year: true,
    measure_kind: 'actual',
    comparable_period_id: 'fy-2023',
  },
  fy2025: {
    id: 'fy-2025',
    label: '2025',
    year: 2025,
    period_start: '2025-01-01',
    period_end: '2025-12-31',
    is_full_year: true,
    measure_kind: 'actual',
    comparable_period_id: 'fy-2024',
  },
  ytd2025: {
    id: 'ytd-2025-01-07',
    label: '2025 Jan–Jul',
    year: 2025,
    period_start: '2025-01-01',
    period_end: '2025-07-31',
    is_full_year: false,
    measure_kind: 'ytd_actual',
    comparable_period_id: null,
  },
  ytd2026: {
    id: 'ytd-2026-01-07',
    label: '2026 Jan–Jul',
    year: 2026,
    period_start: '2026-01-01',
    period_end: '2026-07-31',
    is_full_year: false,
    measure_kind: 'ytd_actual',
    comparable_period_id: 'ytd-2025-01-07',
  },
}

export function isHs2701ExportRow(row) {
  return (
    row?.trade_type === 'export' &&
    row?.hs_code === HS2701 &&
    (row?.flow === 'export' || row?.flow == null)
  )
}

export function sameCalendarDay(left, right) {
  if (!left || !right) return false
  return String(left).slice(0, 10) === String(right).slice(0, 10)
}

export function matchExportPeriod(row, period) {
  if (!isHs2701ExportRow(row)) return false
  if (row.measure_kind && row.measure_kind !== period.measure_kind) return false
  if (period.is_full_year) {
    if (row.is_full_year === false) return false
  } else if (row.is_full_year === true) {
    return false
  }
  return (
    sameCalendarDay(row.period_start, period.period_start) &&
    sameCalendarDay(row.period_end, period.period_end)
  )
}

export function ratioChange(current, previous) {
  const cur = numericValue(current)
  const prev = numericValue(previous)
  if (prev == null || prev === 0) {
    if (cur != null && cur > 0) {
      return { status: 'new', pct: null }
    }
    return { status: 'unavailable', pct: null }
  }
  if (cur == null || cur === 0) {
    return { status: 'no_current_export', pct: null }
  }
  return { status: 'ok', pct: (cur / prev - 1) * 100 }
}
