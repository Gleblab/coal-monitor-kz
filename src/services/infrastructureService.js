import { assembleInfrastructure } from '../lib/infrastructureIntelligence'
import { mapLiveInfrastructure } from '../lib/infrastructureIntelligence/liveMap.js'
import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase'
import { sanitizePublicError } from './coalDataService'

const SOURCE_EMBED = 'sources!source_id ( id, code, organization, publication_title, url, source_type )'
const NODE_FIELDS =
  'id, code, node_type, display_name, category_label, company_id, coal_asset_id, region_id, chain_order, source_id, evidence_classification, notes, limitations, is_verified, is_published'
const LINK_FIELDS =
  'id, code, from_node_id, to_node_id, relationship_type, source_id, evidence_classification, period_start, period_end, evidence_statement, limitations, is_verified, is_published'
const OBS_FIELDS =
  'id, code, node_id, link_id, value, unit, value_qualifier, official_label, measure_kind, period_start, period_end, period_type, period_label, observation_scope, methodology_scope, source_id, evidence_classification, evidence_statement, limitations, data_status, is_verified, is_published'

function fail(error) {
  throw new Error(sanitizePublicError(error) || 'Подключение к данным временно недоступно.')
}

async function loadByIds(supabase, table, ids, fields) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase.from(table).select(fields).in('id', unique)
  if (error) fail(error)
  return new Map((data || []).map((row) => [row.id, row]))
}

async function selectTable(supabase, table, fields) {
  const embedded = `${fields}, ${SOURCE_EMBED}`
  let { data, error } = await supabase.from(table).select(embedded).order('code')
  if (error) {
    const plain = await supabase.from(table).select(fields).order('code')
    if (plain.error) fail(plain.error)
    data = plain.data
    error = null
  }
  if (error) fail(error)
  return Array.isArray(data) ? data : []
}

export async function fetchLiveInfrastructureRaw() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    fail('Подключение к данным временно недоступно.')
  }

  let supabase
  try {
    supabase = getSupabaseClient()
  } catch (error) {
    fail(error)
  }

  const [nodes, links, observations] = await Promise.all([
    selectTable(supabase, 'infrastructure_nodes', NODE_FIELDS),
    selectTable(supabase, 'infrastructure_links', LINK_FIELDS),
    selectTable(supabase, 'infrastructure_observations', OBS_FIELDS),
  ])

  if (!nodes.length) {
    fail('Инфраструктурные данные не опубликованы.')
  }

  const sourceIds = [
    ...nodes.map((row) => row.source_id),
    ...links.map((row) => row.source_id),
    ...observations.map((row) => row.source_id),
  ]
  const sourceById = await loadByIds(
    supabase,
    'sources',
    sourceIds,
    'id, code, organization, publication_title, url, source_type',
  )

  return mapLiveInfrastructure({ nodes, links, observations }, sourceById)
}

export async function loadInfrastructureGraph(producerId, scenarioContext = null) {
  const raw = await fetchLiveInfrastructureRaw()
  const graph = assembleInfrastructure(producerId, raw, scenarioContext)
  if (!graph.nodes.length) {
    fail(`Инфраструктурная цепочка производителя недоступна.`)
  }
  return graph
}
