import { INFRA_NODE_TYPE } from './registry.js'

export function findSelection(graph, selectionId) {
  if (!graph || !selectionId) return { kind: 'none', record: graph?.nodes?.[0] || null }
  const node = [...(graph.nodes || []), ...(graph.contextNodes || []), graph.identity].find(
    (item) => item?.id === selectionId,
  )
  if (node) return { kind: node.isGap || node.nodeType === INFRA_NODE_TYPE.DATA_GAP ? 'gap' : 'node', record: node }
  const link = graph.links?.find((item) => item.id === selectionId)
  if (link) return { kind: 'link', record: link }
  const observation = graph.observations?.find((item) => item.id === selectionId)
  if (observation) return { kind: 'observation', record: observation }
  const gap = graph.gaps?.find((item) => item.id === selectionId)
  if (gap) return { kind: 'gap', record: { ...graph.gapNode, gap } }
  return { kind: 'none', record: graph.nodes?.[0] || null }
}
