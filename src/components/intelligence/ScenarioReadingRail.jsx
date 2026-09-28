import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LoadErrorState } from '../ui'
import { useScenario } from '../../context/ScenarioContext'
import { useSources } from '../../context/SourceContext'
import { getSource } from '../../data/catalog.js'
import { bindScenario } from '../../lib/scenarioEngine.js'
import { infrastructureSearch } from '../../lib/infrastructureIntelligence'
import {
  RAIL_CAPTION,
  RAIL_NODE_TITLES,
  mapExportTotalsToMetrics,
  pickRailPrimary,
  railEmptyLabel,
  railKindLabel,
} from '../../lib/scenarioRail.js'
import { formatQualifiedNumber } from '../../lib/format.js'
import { AnimatedNumber, useReducedMotion } from './ScenarioMotion'

const STAGE_COPY = Object.freeze({
  production: {
    summary: 'План и последний доступный факт',
    shows: 'Показывает опубликованные показатели добычи в выбранном охвате и горизонте.',
    reads:
      'План и факт подтверждают разные состояния показателя. Если периоды различаются, это контроль ориентира, а не подтверждение выполнения плана.',
    targetId: 'outlook-production-detail',
  },
  energyDemand: {
    summary: 'Спрос выбранного горизонта',
    shows: 'Показывает, есть ли для выбранного контура и горизонта подтверждённое наблюдение спроса энергетики.',
    reads:
      'Отсутствие сопоставимого наблюдения отображается прямо. Ориентиры разных горизонтов не складываются и не переносятся на регион или актив.',
    targetId: 'outlook-energy-demand-detail',
  },
  exports: {
    summary: 'Внешнеторговый контур',
    shows: 'Показывает доступные официальные наблюдения экспорта угля и их опубликованный охват.',
    reads:
      'Национальный внешний торговый показатель не описывает экспорт конкретного региона или производителя и сам по себе не доказывает причинную связь с добычей.',
    targetId: null,
    noTarget: 'Отдельный детальный блок экспорта пока не представлен в этом контуре.',
  },
  railLogistics: {
    summary: 'Опубликованная ж/д нагрузка',
    shows: 'Показывает опубликованный логистический показатель, доступный для выбранного охвата.',
    reads:
      'Показатель в единицах в сутки описывает опубликованную ж/д нагрузку. Он не является автоматически пропускной способностью или полной железнодорожной мощностью.',
    targetId: 'outlook-rail-detail',
  },
  constraints: {
    summary: 'Оговорки и пробелы данных',
    shows: 'Собирает документированные ограничения сопоставимости, охвата и интерпретации текущего контура.',
    reads:
      'Ограничения поясняют, где вывод недоступен. Они не масштабируют, не корректируют и не заменяют официальные значения.',
    targetId: 'outlook-constraints-detail',
  },
})

function sourceLabel(sourceId, remoteByCode) {
  const source = remoteByCode?.[sourceId] || getSource(sourceId)
  if (!source) return sourceId
  return [source.organization, source.publication].filter(Boolean).join(' · ') || sourceId
}

function signalMetrics(node) {
  const seen = new Set()
  return [...(node?.officialMetrics || []), ...(node?.contextMetrics || [])]
    .filter((metric) => {
      const key = metric.id || `${metric.sourceId}-${metric.year}-${metric.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return typeof metric.value === 'number'
    })
    .slice(0, 3)
}

function NodeValue({ metric, emptyLabel }) {
  if (!metric) {
    return (
      <p className="ci-node-value is-empty">
        <span className="ci-node-empty">{emptyLabel}</span>
      </p>
    )
  }
  return (
    <p className="ci-node-value">
      <span className="ci-node-number">{formatQualifiedNumber(metric.value, metric.qualifier, metric.approx)}</span>
      {metric.unit ? <span className="ci-node-unit">{metric.unit}</span> : null}
    </p>
  )
}

function SkeletonLine({ className }) {
  return <span className={`sk-bone ${className}`} />
}

function RailSkeleton() {
  return (
    <div className="ci-rail is-loading" aria-busy="true" aria-label="Данные загружаются">
      <p className="ci-rail-caption">Контекст · {RAIL_CAPTION}</p>
      <ol className="ci-rail-track">
        {['01', '02', '03', '04', '05'].map((index) => (
          <li key={index} className="ci-node-wrap">
            <div className="ci-node is-skeleton">
              <span className="ci-node-index" aria-hidden="true">
                {index}
              </span>
              <span className="ci-node-head">
                <SkeletonLine className="ci-skel-title" />
                <SkeletonLine className="ci-skel-kind" />
              </span>
              <span className="ci-node-value">
                <SkeletonLine className="ci-skel-value" />
              </span>
              <span className="ci-node-statement">
                <SkeletonLine className="ci-skel-copy" />
                <SkeletonLine className="ci-skel-copy is-short" />
              </span>
              <span className="ci-node-more">
                <SkeletonLine className="ci-skel-more" />
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="ci-stage-detail is-skeleton" aria-hidden="true">
        <header className="ci-stage-detail-head">
          <span>01</span>
          <SkeletonLine className="ci-skel-detail-title" />
        </header>
        <div className="ci-stage-detail-grid">
          <section>
            <SkeletonLine className="ci-skel-kind" />
            <SkeletonLine className="ci-skel-copy" />
            <SkeletonLine className="ci-skel-copy is-short" />
          </section>
          <section>
            <SkeletonLine className="ci-skel-kind" />
            <SkeletonLine className="ci-skel-copy" />
            <SkeletonLine className="ci-skel-copy is-short" />
          </section>
        </div>
      </div>
    </div>
  )
}

function ScenarioNode({ node, index, selected, onSelect, viewMode, horizon }) {
  const title = RAIL_NODE_TITLES[node.id] || node.title
  const primary = pickRailPrimary(node, { viewMode, horizon })
  const kind = railKindLabel(primary)
  const kindLine = [kind, primary?.year].filter(Boolean).join(' · ')
  const empty = !primary
  const emptyLabel = railEmptyLabel(node)
  const stageNumber = String(index).padStart(2, '0')
  const label = `${stageNumber} ${title}`
  const statusNote = empty ? emptyLabel : kindLine
  const copy = STAGE_COPY[node.id]

  function activate() {
    onSelect(node.id)
  }

  return (
    <li className="ci-node-wrap">
      <button
        type="button"
        className={`ci-node${selected ? ' is-selected' : ''}${empty ? ' is-empty' : ''}`}
        aria-current={selected ? 'true' : undefined}
        aria-pressed={selected}
        aria-controls="ci-stage-detail"
        aria-label={`${label}. ${statusNote}. ${node.statement || ''}`}
        onClick={activate}
      >
        <span className="ci-node-index" aria-hidden="true">
          {stageNumber}
        </span>
        <span className="ci-node-head">
          <span className="ci-node-title">{title}</span>
          {kindLine ? <span className="ci-node-kind">{kindLine}</span> : null}
        </span>
        <NodeValue metric={primary} emptyLabel={emptyLabel} />
        <p className="ci-node-statement">{copy?.summary || node.statement}</p>
        <span className="ci-node-more">Подробнее</span>
      </button>
    </li>
  )
}

function StageDetail({ node, index, remoteByCode, onGoToData, producerId, onOpenSource }) {
  const title = RAIL_NODE_TITLES[node.id] || node.title
  const number = String(index).padStart(2, '0')
  const copy = STAGE_COPY[node.id]
  const metrics = signalMetrics(node)
  const sources = node.sources || []

  return (
    <div
      id="ci-stage-detail"
      className="ci-stage-detail"
      key={node.id}
      role="region"
      aria-live="polite"
      aria-labelledby="ci-stage-detail-title"
    >
      <header className="ci-stage-detail-head">
        <span>{number}</span>
        <h3 id="ci-stage-detail-title">{title}</h3>
      </header>

      <div className="ci-stage-detail-grid">
        <section>
          <h4>Что показывает этот этап</h4>
          <p>{copy?.shows}</p>
        </section>
        <section>
          <h4>Текущий сигнал</h4>
          <p>{node.statement}</p>
          {metrics.length ? (
            <ul className="ci-stage-metrics">
              {metrics.map((metric) => (
                <li key={metric.id || `${metric.sourceId}-${metric.year}-${metric.value}`}>
                  <span>{metric.label}</span>
                  <strong>
                    <AnimatedNumber
                      value={metric.value}
                      qualifier={metric.qualifier}
                      approx={metric.approx}
                      animationKey={`${node.id}-${metric.id || metric.year}`}
                    />{' '}
                    {metric.unit || ''}
                  </strong>
                  <em>
                    {[railKindLabel(metric), metric.year].filter(Boolean).join(' · ')}
                  </em>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section>
          <h4>Как читать</h4>
          <p>{copy?.reads}</p>
          {node.limitations?.length ? (
            <ul className="ci-stage-limitations">
              {node.limitations.slice(0, 3).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : null}
        </section>
        <section>
          <h4>Данные / источник</h4>
          {sources.length ? (
            <ul className="ci-stage-sources">
              {sources.map(({ sourceId }) => (
                <li key={sourceId}>
                  <button type="button" className="ci-stage-source" onClick={() => onOpenSource(sourceId)}>
                    {sourceLabel(sourceId, remoteByCode)}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Данные отсутствуют для выбранного сигнала в текущем срезе.</p>
          )}
        </section>
      </div>

      {copy?.targetId ? (
        <button type="button" className="ci-stage-go" onClick={() => onGoToData(copy.targetId)}>
          Перейти к данным <span aria-hidden="true">↓</span>
        </button>
      ) : (
        <p className="ci-stage-no-target">{copy?.noTarget}</p>
      )}
      {node.id === 'railLogistics' ? (
        <Link className="ci-stage-go" to={infrastructureSearch({ producerId, focus: 'chain' })}>
          Исследовать инфраструктуру
        </Link>
      ) : null}
      {node.id === 'constraints' ? (
        <Link className="ci-stage-go" to={infrastructureSearch({ producerId, focus: 'gaps' })}>
          Проверить инфраструктурные пробелы
        </Link>
      ) : null}
    </div>
  )
}

export function ScenarioReadingRail({ outlook, exportTotals, loading, error, onRetry }) {
  const slice = useScenario()
  const { remoteByCode, openSource } = useSources()
  const reduced = useReducedMotion()

  const bundle = useMemo(() => {
    if (!outlook) return null
    return bindScenario({
      viewMode: slice.viewMode,
      horizon: slice.horizon,
      regionId: slice.regionId,
      assetId: slice.assetId,
      companyId: slice.companyId,
      outlook,
      exportMetrics: mapExportTotalsToMetrics(exportTotals),
    })
  }, [outlook, exportTotals, slice.viewMode, slice.horizon, slice.regionId, slice.assetId, slice.companyId])

  if (loading) return <RailSkeleton />
  if (error) return <LoadErrorState onRetry={onRetry} />
  if (!bundle) return null

  const activeId = bundle.nodes.some((node) => node.id === slice.selectedNodeId)
    ? slice.selectedNodeId
    : 'production'
  const activeIndex = bundle.nodes.findIndex((node) => node.id === activeId)
  const activeNode = bundle.nodes[activeIndex] || bundle.nodes[0]

  function goToData(targetId) {
    const target = document.getElementById(targetId)
    if (!target) return
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
  }

  return (
    <section
      className={`ci-rail${reduced ? ' is-reduced' : ''}`}
      aria-label="Порядок чтения контура"
    >
      <p className="ci-rail-caption">Контекст · {RAIL_CAPTION}</p>
      <ol className="ci-rail-track">
        {bundle.nodes.map((node, index) => (
          <ScenarioNode
            key={node.id}
            node={node}
            index={index + 1}
            selected={activeId === node.id}
            onSelect={slice.setSelectedNodeId}
            viewMode={slice.viewMode}
            horizon={slice.horizon}
          />
        ))}
      </ol>
      {activeNode ? (
        <StageDetail
          node={activeNode}
          index={activeIndex + 1}
          remoteByCode={remoteByCode}
          onGoToData={goToData}
          producerId={slice.demandLab.productionProducerId}
          onOpenSource={openSource}
        />
      ) : null}
    </section>
  )
}
