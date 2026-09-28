import { GAP_TYPE, INFRA_CLASS, INFRA_NODE_TYPE, carriesMaterialFlow, infraProducerById, isSolidConnector } from './registry.js'
import { INFRASTRUCTURE_FIXTURE } from './fixture.js'
import { infrastructureCapabilities } from './capabilities.js'
import { buildEvidencePanel, provenanceForSelection } from './evidence.js'
import { describeInfrastructureHandoff } from './handoff.js'

function byProducer(rows, producerId) {
  return rows.filter((row) => row.producerId === producerId)
}

function attachObservations(node, observations) {
  const bound = observations.filter((item) => item.nodeId === node.id)
  const current = bound.filter((item) => item.classification !== INFRA_CLASS.HISTORICAL && item.current !== false)
  const primary = current.find((item) => item.primary) || current[0] || null
  return {
    ...node,
    observations: bound,
    currentObservations: current,
    primaryObservation: primary,
    isGap: node.nodeType === INFRA_NODE_TYPE.DATA_GAP,
    inChain: node.chainOrder != null,
  }
}

function deriveGaps(producer, chainNodes) {
  const lastVerified = [...chainNodes].reverse().find((node) => !node.isGap)
  const gapNode = chainNodes.find((node) => node.isGap)
  const hasCurrentThroughput = chainNodes.some((node) =>
    node.currentObservations?.some(
      (item) =>
        item.classification === INFRA_CLASS.QUANTITATIVE_VERIFIED &&
        (item.measureKind === 'monthly_loading' || item.measureKind === 'wagon_rate'),
    ),
  )
  const gaps = []
  if (gapNode) {
    gaps.push({
      id: `${producer.id}-missing-relationship`,
      type: GAP_TYPE.MISSING_RELATIONSHIP,
      nodeId: gapNode.id,
      afterNodeId: lastVerified?.id || null,
      afterLabel: lastVerified?.displayName || null,
      title: 'Дальнейшая связь не подтверждена',
      missing: 'Именованная граница, терминал или конечный рынок с привязкой к этому производителю.',
      required: 'Первичный источник, явно называющий обе стороны связи для этого производителя.',
      afterData:
        'Появилась бы возможность продолжить цепочку. Сопоставление со сценарием по-прежнему требует отдельного наблюдения текущей мощности.',
    })
  }
  gaps.push({
    id: `${producer.id}-missing-capacity`,
    type: GAP_TYPE.MISSING_CAPACITY,
    nodeId: gapNode?.id || lastVerified?.id || null,
    afterNodeId: lastVerified?.id || null,
    afterLabel: lastVerified?.displayName || null,
    title: 'Нет текущей инфраструктурной мощности',
    missing: 'Текущая паспортная/проектная пропускная способность именованного ж/д узла или звена за сопоставимый период.',
    required: 'Официальное наблюдение заявленной / проектной пропускной способности именованного узла с тем же производителем и сопоставимым периодом.',
    afterData: 'Можно проверить возможность сопоставления со сценарием добычи. Это не делает сценарий выполнимым.',
  })
  if (!hasCurrentThroughput || producer.id === 'maikuben') {
    gaps.push({
      id: `${producer.id}-missing-throughput`,
      type: GAP_TYPE.MISSING_THROUGHPUT,
      nodeId: lastVerified?.id || null,
      afterNodeId: lastVerified?.id || null,
      afterLabel: lastVerified?.displayName || null,
      title: producer.id === 'maikuben' ? 'Текущая фактическая нагрузка отсутствует' : 'Нет годового пропуска',
      missing:
        producer.id === 'maikuben'
          ? 'Текущее операционное наблюдение погрузки или пропуска по именованному узлу.'
          : 'Годовой полный поток через измеренное звено, сопоставимый со сценарием.',
      required: 'Опубликованный пропуск или объём обработки именованного узла за сопоставимый период и охват.',
      afterData: 'Можно обсуждать количественное сопоставление только после проверки сопоставимости операндов.',
    })
  }
  return gaps
}

export function assembleInfrastructure(producerId, raw = INFRASTRUCTURE_FIXTURE, scenarioContext = null) {
  const producer = infraProducerById(producerId)
  const nodesRaw = byProducer(raw.nodes, producer.id)
  const linksRaw = byProducer(raw.links, producer.id)
  const observations = byProducer(raw.observations, producer.id)
  const chainNodes = nodesRaw
    .filter((node) => node.chainOrder != null)
    .sort((a, b) => a.chainOrder - b.chainOrder)
    .map((node) => attachObservations(node, observations))
  const contextNodes = nodesRaw
    .filter((node) => node.chainOrder == null && node.nodeType !== INFRA_NODE_TYPE.PRODUCER)
    .map((node) => attachObservations(node, observations))
  const identity = nodesRaw.find((node) => node.nodeType === INFRA_NODE_TYPE.PRODUCER) || null

  const links = linksRaw.map((item) => {
    const from = chainNodes.find((node) => node.id === item.fromId)
    const to = chainNodes.find((node) => node.id === item.toId)
    const solid = isSolidConnector(item.classification) && to?.nodeType !== INFRA_NODE_TYPE.DATA_GAP
    return {
      ...item,
      solid,
      quantified: item.classification === INFRA_CLASS.QUANTITATIVE_VERIFIED,
      historical: item.classification === INFRA_CLASS.HISTORICAL,
      materialFlow: solid && carriesMaterialFlow(item.classification, to?.nodeType),
      from,
      to,
    }
  })

  const lastVerified = [...chainNodes].reverse().find((node) => !node.isGap) || null
  const gapNode = chainNodes.find((node) => node.isGap) || null
  const verifiedCount = chainNodes.filter((node) => !node.isGap).length
  const gaps = deriveGaps(producer, chainNodes)
  const capabilities = infrastructureCapabilities()

  const graph = {
    producer,
    identity,
    nodes: chainNodes,
    contextNodes,
    links,
    observations,
    gaps,
    lastVerified,
    gapNode,
    verifiedCount,
    sources: raw.sources,
    capabilities,
    scenarioContext: scenarioContext && scenarioContext.contextVersion ? scenarioContext : null,
    handoffDisplay: describeInfrastructureHandoff(scenarioContext),
    comparabilityNote: 'Инфраструктурная сопоставимость не подтверждена',
    terminationCaption: 'Здесь заканчивается подтвержденная цепочка.',
  }

  return {
    ...graph,
    panelFor: (selectionId) => buildEvidencePanel(graph, selectionId),
    provenanceFor: (selectionId) => provenanceForSelection(graph, selectionId),
  }
}

export function listInfrastructureProducers(raw = INFRASTRUCTURE_FIXTURE) {
  return (raw.nodes ? ['bogatyr', 'shubarkol', 'karazhyra', 'maikuben'] : []).map((id) => {
    const assembled = assembleInfrastructure(id, raw)
    return {
      ...assembled.producer,
      verifiedCount: assembled.verifiedCount,
      hasGap: Boolean(assembled.gapNode),
    }
  })
}

export { findSelection } from './selection.js'
