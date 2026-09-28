import { formatQualifiedNumber } from '../../lib/formatCore.js'
import { INFRA_CLASS } from '../../lib/infrastructureIntelligence/registry.js'
import { AnimatedNumber } from './ScenarioMotion'

function statusLabel(classification, isGap) {
  if (isGap) return 'пробел данных'
  if (classification === INFRA_CLASS.QUANTITATIVE_VERIFIED) return 'есть число'
  if (classification === INFRA_CLASS.RELATIONSHIP_VERIFIED) return 'связь'
  if (classification === INFRA_CLASS.HISTORICAL) return 'историческое'
  if (classification === INFRA_CLASS.PARTIAL) return 'частично'
  if (classification === INFRA_CLASS.CONTEXT_ONLY) return 'контекст'
  return classification
}

function Connector({ link, onSelect, selected }) {
  const quantified = link.quantified
  return (
    <button
      type="button"
      className={`ii-edge${link.solid ? ' is-solid' : ''}${quantified ? ' is-quantified' : ''}${link.historical ? ' is-historical' : ''}${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(link.id)}
      aria-pressed={selected}
      aria-label={`Связь ${link.from?.displayName || ''} — ${link.to?.displayName || ''}. ${statusLabel(link.classification)}.`}
    >
      <span className="ii-edge-line" aria-hidden="true" />
      {link.materialFlow ? (
        <span className="ii-flow" aria-hidden="true">
          <span className="ii-particle" />
          <span className="ii-particle" />
          <span className="ii-particle" />
        </span>
      ) : null}
    </button>
  )
}

function NodeCard({ node, selected, onSelect, animationKey }) {
  const signal = node.primaryObservation
  return (
    <button
      type="button"
      className={`ii-node${selected ? ' is-selected' : ''}${node.isGap ? ' is-gap' : ''}`}
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${node.categoryLabel}. ${node.displayName}. ${statusLabel(node.classification, node.isGap)}.`}
    >
      <span className="ii-node-cat">{node.categoryLabel}</span>
      <span className="ii-node-name">{node.displayName}</span>
      <span className="ii-node-state">{statusLabel(node.classification, node.isGap)}</span>
      {signal && typeof signal.value === 'number' && !node.isGap ? (
        <span className="ii-node-signal">
          <AnimatedNumber
            value={signal.value}
            qualifier={signal.qualifier}
            approx={signal.qualifier === 'about'}
            animationKey={`${animationKey}-${signal.id}`}
          />
          <span className="ii-node-unit">{signal.unit}</span>
          <span className="ii-node-signal-label">{signal.label}</span>
        </span>
      ) : node.isGap ? (
        <span className="ii-node-signal is-empty">Здесь заканчивается подтвержденная цепочка.</span>
      ) : null}
    </button>
  )
}

export function InfrastructureCanvas({ graph, selectedId, onSelect, producerKey, evidencePanel = null }) {
  const chain = graph.nodes

  return (
    <ol className="ii-chain" aria-label="Инфраструктурная цепочка">
      {chain.map((node, index) => {
        const previous = chain[index - 1]
        const link = previous
          ? graph.links.find((item) => item.fromId === previous.id && item.toId === node.id)
          : null
        const showGapBreak = node.isGap && previous && !previous.isGap
        const linkSelected = Boolean(link && selectedId === link.id)
        const nodeSelected = selectedId === node.id
        return (
          <li key={node.id} className={`ii-chain-item${nodeSelected || linkSelected ? ' has-inline-evidence' : ''}`}>
            {link && !showGapBreak ? (
              <Connector link={link} onSelect={onSelect} selected={linkSelected} />
            ) : null}
            {showGapBreak ? (
              <div className="ii-terminator" aria-label="Связь не подтверждена">
                <span className="ii-edge-line is-gap" />
                <span className="ii-gap-mark">обрыв</span>
              </div>
            ) : null}
            {linkSelected ? evidencePanel : null}
            <NodeCard
              node={node}
              selected={nodeSelected}
              onSelect={onSelect}
              animationKey={producerKey}
            />
            {nodeSelected ? evidencePanel : null}
          </li>
        )
      })}
    </ol>
  )
}

export function formatInfraValue(observation) {
  if (!observation || typeof observation.value !== 'number') return '—'
  return `${formatQualifiedNumber(observation.value, observation.qualifier, observation.qualifier === 'about')} ${observation.unit}`
}
