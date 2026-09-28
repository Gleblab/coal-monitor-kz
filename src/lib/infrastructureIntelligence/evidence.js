import { GAP_TYPE, INFRA_CLASS, INFRA_NODE_TYPE } from './registry.js'
import { findSelection } from './selection.js'
import { INFRASTRUCTURE_SOURCES } from './fixture.js'
import { sources } from '../../data/sources.js'

function resolveSource(sourceId, extra = INFRASTRUCTURE_SOURCES) {
  if (!sourceId) return null
  const found = extra[sourceId] || sources[sourceId]
  if (!found) return { id: sourceId, organization: 'Источник', publication: 'Источник' }
  return {
    ...found,
    id: found.id || sourceId,
    organization: found.organization || 'Источник',
    publication: found.publication || found.publication_title || found.organization || 'Источник',
  }
}

function classLabel(classification) {
  if (classification === INFRA_CLASS.QUANTITATIVE_VERIFIED) return 'подтверждено цифрами'
  if (classification === INFRA_CLASS.RELATIONSHIP_VERIFIED) return 'подтверждённая связь'
  if (classification === INFRA_CLASS.HISTORICAL) return 'исторический контекст'
  if (classification === INFRA_CLASS.PARTIAL) return 'частичное наблюдение'
  if (classification === INFRA_CLASS.CONTEXT_ONLY) return 'только контекст'
  if (classification === INFRA_CLASS.DATA_GAP) return 'пробел данных'
  return classification
}

function gapPanel(graph, node) {
  const gap = graph.gaps.find((item) => item.nodeId === node.id) || graph.gaps[0]
  const last = graph.lastVerified
  const stop = 'Здесь заканчивается подтвержденная цепочка.'
  return {
    title: node.displayName,
    category: node.categoryLabel,
    classification: INFRA_CLASS.DATA_GAP,
    known: last ? `${stop} Подтверждено до узла «${last.displayName}».` : stop,
    figures: [],
    howToRead:
      'Пробел — аналитический результат. Он показывает, где доказанная связь обрывается, а не скрытую мощность.',
    cannotConclude:
      'Нельзя продолжить маршрут до границы, терминала или рынка. Нельзя рассчитать ограничение пропускной способности, запас мощности или выполнимость сценария.',
    missing: gap?.missing || node.limitations,
    needed: gap?.required,
    afterData: gap?.afterData,
    sources: [],
    technical: {
      nodeId: node.id,
      classification: INFRA_CLASS.DATA_GAP,
      gapTypes: graph.gaps.map((item) => item.type),
      lastVerifiedId: last?.id || null,
    },
    isGap: true,
  }
}

export function buildEvidencePanel(graph, selectionId) {
  const picked = findSelection(graph, selectionId)
  const record = picked.record
  if (!record) return null

  if (picked.kind === 'gap' || record.nodeType === INFRA_NODE_TYPE.DATA_GAP) {
    return gapPanel(graph, record)
  }

  if (picked.kind === 'link') {
    const source = resolveSource(record.sourceId, graph.sources)
    return {
      title: `${record.from?.displayName || ''} → ${record.to?.displayName || ''}`.trim(),
      category: record.relationshipType,
      classification: record.classification,
      known: record.statement,
      figures: [],
      howToRead: record.solid
        ? 'Сплошная линия означает подтверждённое отношение. Она не кодирует тоннаж.'
        : 'Прерывистое соединение не является доказанной связью.',
      cannotConclude: record.limitations || 'Связь не доказывает пропускную способность или выполнимость сценария.',
      missing: graph.gaps.find((item) => item.type === GAP_TYPE.MISSING_CAPACITY)?.missing,
      needed: graph.gaps.find((item) => item.type === GAP_TYPE.MISSING_CAPACITY)?.required,
      sources: source ? [source] : [],
      technical: {
        linkId: record.id,
        relationshipType: record.relationshipType,
        classification: record.classification,
        sourceId: record.sourceId,
        materialFlow: record.materialFlow,
      },
      isGap: false,
    }
  }

  const observations = record.observations || graph.observations.filter((item) => item.nodeId === record.id)
  const figures = observations.filter((item) => typeof item.value === 'number')
  const sources = [...new Set(figures.map((item) => item.sourceId).concat(record.sourceId).filter(Boolean))]
    .map((id) => resolveSource(id, graph.sources))
    .filter(Boolean)

  const cannotFromObs = figures.map((item) => item.limitations).filter(Boolean)
  const historical = figures.filter((item) => item.classification === INFRA_CLASS.HISTORICAL)

  return {
    title: record.displayName,
    category: record.categoryLabel,
    classification: record.classification,
    known: record.notes || `${classLabel(record.classification)}: ${record.displayName}.`,
    figures,
    howToRead: howToReadNode(record, figures),
    cannotConclude:
      cannotFromObs[0] ||
      record.limitations ||
      'Наблюдение не доказывает годовую инфраструктурную мощность, ограничение пропускной способности или выполнимость сценария.',
    missing: graph.gaps.find((item) => item.type === GAP_TYPE.MISSING_CAPACITY)?.missing,
    needed: graph.gaps.find((item) => item.type === GAP_TYPE.MISSING_CAPACITY)?.required,
    historicalNote: historical.length
      ? 'Исторические и проектные числа показаны как HISTORICAL / NON_CURRENT и не являются текущей мощностью.'
      : null,
    sources,
    technical: {
      nodeId: record.id,
      nodeType: record.nodeType,
      classification: record.classification,
      observationIds: figures.map((item) => item.id),
      sourceIds: sources.map((item) => item.id),
      measureKinds: figures.map((item) => item.measureKind),
      periods: figures.map((item) => item.periodLabel),
      limitations: record.limitations,
    },
    isGap: false,
  }
}

function howToReadNode(record, figures) {
  if (record.id === 'karazhyra-degelen') {
    return 'Публикация фиксирует различие между заявкой и наблюдаемой погрузкой. Это два независимых операционных наблюдения, а не расчёт дефицита.'
  }
  if (record.id === 'shubarkol-direction') {
    return 'Июнь 2025 описывает направления погрузки в публикации КТЖ. Экспортный объём не именует границу или терминал.'
  }
  if (record.id === 'maikuben-internal') {
    return 'Текущая фактическая нагрузка не опубликована. Проектные 40 км и 2,5 млн т/год относятся к 1988–1989 и не являются текущей мощностью.'
  }
  if (record.id === 'bogatyr-astana-trial') {
    return 'Пробная поставка 2022 — отдельное историческое свидетельство, не канонический маршрут цепочки.'
  }
  if (figures.some((item) => item.classification === INFRA_CLASS.QUANTITATIVE_VERIFIED)) {
    return 'Цифра принадлежит указанному узлу, периоду и источнику. Единицы первоисточника сохранены без перевода в годовые млн т.'
  }
  return 'Подтверждена топологическая связь. Количественное сравнение со сценарием недоступно, пока нет сопоставимой мощности.'
}

export function provenanceForSelection(graph, selectionId) {
  const panel = buildEvidencePanel(graph, selectionId)
  const picked = findSelection(graph, selectionId)
  const record = picked.record
  const claims = []

  if (graph.scenarioContext?.modelResult) {
    claims.push({
      id: 'scenario-result',
      kind: 'scenario',
      title: 'Результат сценария',
      text: `${graph.producer.selectorLabel}: ${graph.scenarioContext.modelResult.value} ${graph.scenarioContext.modelResult.unit || ''}`.trim(),
      children: (graph.scenarioContext.operands
        ? Object.entries(graph.scenarioContext.operands)
            .filter(([, value]) => value)
            .map(([key, value]) => ({
              id: `scenario-operand-${key}`,
              kind: 'operand',
              title:
                key === 'actual'
                  ? 'Факт'
                  : key === 'plan'
                    ? 'План'
                    : key === 'target'
                      ? 'Цель'
                      : key === 'capacity'
                        ? 'Заявленная мощность'
                        : key,
              text: `${value.value} ${value.unit || ''} · ${value.year || ''}`.trim(),
              children: value.sourceId
                ? [
                    {
                      id: `scenario-source-${key}`,
                      kind: 'source',
                      title: 'Источник',
                      text:
                        resolveSource(value.sourceId, graph.sources)?.publication ||
                        resolveSource(value.sourceId, graph.sources)?.organization ||
                        'Источник',
                      sourceId: value.sourceId,
                      children: [],
                    },
                  ]
                : [],
            }))
        : []),
    })
  }

  const figures = panel?.figures || []
  const infraChildren = figures.length
    ? figures.map((item) => ({
        id: item.id,
        kind: 'observation',
        title: item.label,
        text: `${item.value} ${item.unit} · ${item.periodLabel}`,
        children: item.sourceId
          ? [
                {
                  id: `src-${item.id}`,
                  kind: 'source',
                  title: 'Источник',
                  text: resolveSource(item.sourceId, graph.sources)?.publication || resolveSource(item.sourceId, graph.sources)?.organization || 'Источник',
                  sourceId: item.sourceId,
                  children: [],
                },
            ]
          : [],
      }))
    : [
        {
          id: `${record?.id || 'claim'}-source`,
          kind: 'source',
          title: 'Источник',
          text: record?.sourceId
            ? resolveSource(record.sourceId, graph.sources)?.publication ||
              resolveSource(record.sourceId, graph.sources)?.organization ||
              'Источник'
            : 'Источник связи не указан — пробел.',
          sourceId: record?.sourceId || null,
          children: [],
        },
      ]

  claims.push({
    id: `infra-${record?.id || 'selection'}`,
    kind: record?.isGap ? 'gap' : 'claim',
    title: panel?.title || 'Инфраструктурное свидетельство',
    text: panel?.known,
    children: infraChildren,
  })

  return {
    separated: true,
    note: 'Семантического ребра между результатом сценария и инфраструктурным наблюдением нет: расчёт сопоставимости недоступен.',
    branches: claims,
  }
}
