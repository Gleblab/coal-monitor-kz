import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from '../components/intelligence/ScenarioMotion'
import { InfrastructureCanvas } from '../components/intelligence/InfrastructureCanvas'
import {
  InfrastructureEvidencePanel,
  InfrastructureProvenance,
} from '../components/intelligence/InfrastructureEvidencePanel'
import { DataSkeleton } from '../components/DataSkeleton'
import { LoadErrorState } from '../components/ui'
import { formatQualifiedNumber } from '../lib/formatCore.js'
import {
  describeInfrastructureHandoff,
  infraProducerById,
  INFRA_PRODUCERS,
  isValidHandoff,
  parseInfrastructureSearch,
  resolveInfraProducerId,
} from '../lib/infrastructureIntelligence'
import { loadInfrastructureGraph } from '../services/infrastructureService'
import { sanitizePublicError } from '../services/coalDataService'
import { useScenario } from '../context/ScenarioContext'
import { LAB_QUESTION_IDS } from '../lib/scenarioLab/productionSlice.js'

function useMaxWidth(px) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => {}
      const query = window.matchMedia(`(max-width: ${px}px)`)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${px}px)`).matches,
    () => false,
  )
}

export function InfrastructureIntelligencePage() {
  const reduced = useReducedMotion()
  const inlineEvidence = useMaxWidth(430)
  const { setProductionProducerId, setQuestionId } = useScenario()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const parsed = parseInfrastructureSearch(params)
  const handoff = isValidHandoff(location.state?.infrastructureHandoff)
    ? location.state.infrastructureHandoff
    : null
  const producerId =
    resolveInfraProducerId(parsed.producerId) || resolveInfraProducerId(handoff?.producerId) || 'bogatyr'
  const scenarioContext = handoff?.producerId === producerId ? handoff : null
  const [mode, setMode] = useState('chain')
  const [entered, setEntered] = useState(() => reduced)
  const [selectedId, setSelectedId] = useState(null)
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (reduced) {
      setEntered(true)
      return undefined
    }
    setEntered(false)
    const timer = window.setTimeout(() => setEntered(true), 780)
    return () => window.clearTimeout(timer)
  }, [reduced, producerId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setGraph(null)
    loadInfrastructureGraph(producerId, scenarioContext)
      .then((next) => {
        if (cancelled) return
        setGraph(next)
        setLoading(false)
      })
      .catch((caught) => {
        if (cancelled) return
        setGraph(null)
        setError(sanitizePublicError(caught))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [producerId, scenarioContext, reloadToken])

  useEffect(() => {
    if (!graph) {
      setSelectedId(null)
      return
    }
    const preferred =
      parsed.focus === 'gaps'
        ? graph.gapNode?.id
        : graph.nodes.find((node) => !node.isGap)?.id
    setSelectedId(preferred || graph.nodes[0]?.id || null)
  }, [producerId, parsed.focus, graph])

  const panel = graph ? graph.panelFor(selectedId) : null
  const provenance = graph ? graph.provenanceFor(selectedId) : null
  const producer = infraProducerById(producerId)
  const handoffDisplay = graph?.handoffDisplay || describeInfrastructureHandoff(scenarioContext)

  useEffect(() => {
    setProductionProducerId(producerId)
    if (scenarioContext) setQuestionId(LAB_QUESTION_IDS.PRODUCTION_SCENARIO)
  }, [producerId, scenarioContext, setProductionProducerId, setQuestionId])

  function switchProducer(id) {
    setProductionProducerId(id)
    setParams({ producer: id, ...(parsed.focus === 'gaps' ? { focus: 'gaps' } : {}) }, { replace: true })
  }

  return (
    <section
      className={`ii-workspace${reduced ? ' is-reduced' : ''}${entered ? ' is-settled' : ' is-enter'}`}
      aria-label="Инфраструктура"
    >
      <header className="ii-head">
        <p className="ii-kicker">Сценарий · Инфраструктура</p>
        <div className="ii-head-row">
          <h1>Инфраструктура</h1>
          <Link
            className="ii-back"
            to="/outlook#sw-workbench"
            onClick={() => {
              setProductionProducerId(producerId)
              if (scenarioContext?.comparisonId) setQuestionId(LAB_QUESTION_IDS.PRODUCTION_SCENARIO)
            }}
          >
            Вернуться к сценарию
          </Link>
        </div>
        <p className="ii-lede">
          Нет источника — нет цифры. Нет доказанной связи — нет линии. Нет сопоставимых операндов — нет вывода.
        </p>
      </header>

      <div className="ii-producers" role="radiogroup" aria-label="Производитель">
        {INFRA_PRODUCERS.map((item) => {
          const active = item.id === producer.id
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`ii-producer${active ? ' is-active' : ''}`}
              onClick={() => switchProducer(item.id)}
            >
              <strong>{item.selectorLabel}</strong>
              <span>{item.depthLine}</span>
            </button>
          )
        })}
      </div>

      {handoffDisplay ? (
        <div className="ii-scenario" role="status">
          <p className="ii-scenario-kicker">Сценарий</p>
          <p className="ii-scenario-line">
            {handoffDisplay.producerLabel}
            {handoffDisplay.horizonLine ? ` · ${handoffDisplay.horizonLine}` : ''}
            {' · '}
            {handoffDisplay.resultValue > 0 ? '+' : ''}
            {formatQualifiedNumber(handoffDisplay.resultValue)}{' '}
            {handoffDisplay.resultUnit}
          </p>
          {handoffDisplay.resultLabel ? (
            <p className="ii-scenario-label">{handoffDisplay.resultLabel}</p>
          ) : null}
          {handoffDisplay.comparabilityStatus === 'NON_COMPARABLE' ? (
            <p className="ii-scenario-compare">
              Несопоставимо
              {handoffDisplay.comparabilityReason ? ` · ${handoffDisplay.comparabilityReason}` : ''}
            </p>
          ) : null}
          {handoffDisplay.comparabilityStatus === 'NON_COMPARABLE' && handoffDisplay.limitations[0] ? (
            <p className="ii-scenario-limit">{handoffDisplay.limitations[0]}</p>
          ) : null}
          <p className="ii-scenario-gate">{handoffDisplay.infrastructureGate}</p>
        </div>
      ) : (
        <p className="ii-explore">Исследование текущих свидетельств производителя. Сценарный расчёт не восстанавливается.</p>
      )}

      <div className="ii-modes" role="tablist" aria-label="Режим">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'chain'}
          className={mode === 'chain' ? 'is-active' : ''}
          onClick={() => setMode('chain')}
        >
          Цепочка
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'evidence'}
          className={mode === 'evidence' ? 'is-active' : ''}
          onClick={() => setMode('evidence')}
        >
          Доказательства
        </button>
      </div>

      {loading ? (
        <div className="ii-body" aria-busy="true" aria-label="Данные загружаются">
          <p className="ii-status-copy">Данные загружаются</p>
          <DataSkeleton variant="content" />
        </div>
      ) : error ? (
        <div className="ii-body">
          <LoadErrorState onRetry={() => setReloadToken((value) => value + 1)} />
        </div>
      ) : !graph ? (
        <div className="ii-body">
          <p className="ii-status-copy" role="status">Данные отсутствуют</p>
        </div>
      ) : (
        <div className="ii-body" key={`${producerId}-${mode}`}>
          {mode === 'chain' ? (
            <InfrastructureCanvas
              graph={graph}
              selectedId={selectedId}
              onSelect={setSelectedId}
              producerKey={producerId}
              evidencePanel={inlineEvidence ? <InfrastructureEvidencePanel panel={panel} /> : null}
            />
          ) : (
            <InfrastructureProvenance tree={provenance} />
          )}
          {!inlineEvidence || mode === 'evidence' ? <InfrastructureEvidencePanel panel={panel} /> : null}
        </div>
      )}
    </section>
  )
}
