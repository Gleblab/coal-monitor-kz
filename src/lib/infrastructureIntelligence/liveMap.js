import { INFRA_CLASS, INFRA_PRODUCERS } from './registry.js'

function unwrapEmbed(value) {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function producerIdFromCompanyUuid(companyId) {
  return INFRA_PRODUCERS.find((item) => item.companyUuid === companyId)?.id || null
}

function sourceRecord(row, byId = new Map()) {
  const embedded = unwrapEmbed(row.sources) || unwrapEmbed(row.source)
  if (embedded?.code) return embedded
  if (row.source_id && byId.has(row.source_id)) return byId.get(row.source_id)
  return null
}

function rememberSource(bag, source) {
  if (!source?.code) return
  if (bag[source.code]) return
  bag[source.code] = {
    id: source.code,
    organization: source.organization || source.code,
    publication: source.publication_title || source.publication || source.code,
    url: source.url || null,
  }
}

function isNonCurrentObservation(row) {
  return (
    row.evidence_classification === INFRA_CLASS.HISTORICAL ||
    row.period_type === 'historical' ||
    row.period_type === 'project'
  )
}

export function mapLiveInfrastructure(raw = {}, sourceById = new Map()) {
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : []
  const links = Array.isArray(raw.links) ? raw.links : []
  const observations = Array.isArray(raw.observations) ? raw.observations : []
  const nodeByUuid = new Map(nodes.map((row) => [row.id, row]))
  const linkByUuid = new Map(links.map((row) => [row.id, row]))
  const sources = {}

  const mappedNodes = nodes
    .map((row) => {
      const source = sourceRecord(row, sourceById)
      rememberSource(sources, source)
      return {
        id: row.code,
        producerId: producerIdFromCompanyUuid(row.company_id),
        nodeType: row.node_type,
        displayName: row.display_name,
        categoryLabel: row.category_label,
        chainOrder: row.chain_order == null ? null : Number(row.chain_order),
        classification: row.evidence_classification,
        sourceId: source?.code || null,
        notes: row.notes || null,
        limitations: row.limitations || null,
      }
    })
    .filter((row) => row.id && row.producerId)

  const mappedLinks = links
    .map((row) => {
      const from = nodeByUuid.get(row.from_node_id)
      const to = nodeByUuid.get(row.to_node_id)
      const source = sourceRecord(row, sourceById)
      rememberSource(sources, source)
      return {
        id: row.code,
        producerId: producerIdFromCompanyUuid(from?.company_id),
        fromId: from?.code || null,
        toId: to?.code || null,
        relationshipType: row.relationship_type,
        classification: row.evidence_classification,
        sourceId: source?.code || null,
        statement: row.evidence_statement,
        limitations: row.limitations || null,
      }
    })
    .filter((row) => row.id && row.producerId && row.fromId && row.toId)

  const mappedObservations = observations
    .map((row) => {
      const node = row.node_id ? nodeByUuid.get(row.node_id) : null
      const link = row.link_id ? linkByUuid.get(row.link_id) : null
      const owner = node || (link ? nodeByUuid.get(link.from_node_id) : null)
      const source = sourceRecord(row, sourceById)
      rememberSource(sources, source)
      const historical = isNonCurrentObservation(row)
      const value = row.value == null || row.value === '' ? null : Number(row.value)
      return {
        id: row.code,
        producerId: producerIdFromCompanyUuid(owner?.company_id),
        nodeId: node?.code || null,
        linkId: link?.code || null,
        value: Number.isFinite(value) ? value : null,
        unit: row.unit || null,
        qualifier: row.value_qualifier || 'exact',
        label: row.official_label,
        measureKind: row.measure_kind,
        periodLabel: row.period_label,
        classification: row.evidence_classification,
        sourceId: source?.code || null,
        statement: row.evidence_statement,
        limitations: row.limitations,
        current: !historical,
        primary: Boolean(row.primary),
      }
    })
    .filter((row) => row.id && row.producerId)

  return {
    nodes: mappedNodes,
    links: mappedLinks,
    observations: mappedObservations,
    sources,
  }
}
