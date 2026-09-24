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

const PRODUCTION_EMBED_FIELDS = `${PRODUCTION_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), companies!company_id ( id, name, short_name ), coal_assets!asset_id ( id, code, name, asset_type ), regions!region_id ( id, name )`

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
    'id, name, short_name',
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
    'id, name',
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
    let { data, error } = await supabase.from('production').select(PRODUCTION_EMBED_FIELDS)

    if (error) {
      const plain = await supabase.from('production').select(PRODUCTION_BASE_FIELDS)
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

export function fetchPublishedEnergyBalance() {
  return fetchPublishedRows(
    'energy_balance',
    'id, indicator, value, unit, year, source_id, data_status, is_verified, is_published, notes',
    (row) => ({
      ...row,
      value: numericValue(row.value),
      year: Number(row.year),
    }),
  )
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

export function fetchPublishedTrade() {
  return fetchPublishedRows(
    'trade',
    'id, trade_type, destination_country, volume, volume_unit, value_amount, currency, period_start, period_end, source_id, data_status, is_verified, is_published, notes',
    (row) => ({
      ...row,
      volume: numericValue(row.volume),
      year: yearFromPeriod(row),
    }),
  )
}

export function fetchPublishedStrategicPrograms() {
  return fetchPublishedLinkedRows(
    'strategic_programs',
    'id, name, program_type, status, start_year, end_year, company_id, source_id, methodology_note, is_verified, is_published',
    (row) => ({
      ...row,
      start_year: Number(row.start_year),
      end_year: Number(row.end_year),
    }),
  )
}

export function fetchPublishedProgramIndicators() {
  return fetchPublishedLinkedRows(
    'program_indicators',
    'id, program_id, name, value, unit, indicator_kind, period_start, period_end, company_id, region_id, parent_indicator_id, source_id, status, methodology_note, is_verified, is_published',
    (row) => ({
      ...row,
      value: numericValue(row.value),
      year: yearFromPeriod(row),
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

const COAL_ASSETS_EMBED_FIELDS = `${COAL_ASSETS_BASE_FIELDS}, sources!source_id ( id, code, organization, publication_title, url, source_type ), regions!region_id ( id, code, name ), companies!operator_company_id ( id, code, name, short_name )`

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
    let { data, error } = await supabase.from('coal_assets').select(COAL_ASSETS_EMBED_FIELDS)

    if (error) {
      const plain = await supabase.from('coal_assets').select(COAL_ASSETS_BASE_FIELDS)
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
