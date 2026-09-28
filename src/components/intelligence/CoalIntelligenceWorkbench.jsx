import { LoadErrorState } from '../ui'
import { useScenario } from '../../context/ScenarioContext'
import { LAB_QUESTION_IDS } from '../../lib/scenarioLab/productionSlice.js'
import { IncrementalDemandLab } from './IncrementalDemandLab'
import { ProductionScenarioLab } from './ProductionScenarioLab'

const QUESTIONS = [
  {
    id: LAB_QUESTION_IDS.INCREMENTAL_DEMAND,
    tab: 'Дополнительный спрос',
    title: 'Какой дополнительный объём следует из выбранной доли ориентира?',
  },
  {
    id: LAB_QUESTION_IDS.PRODUCTION_SCENARIO,
    tab: 'Производство',
    title: 'Как опубликованные факт, план, цель и заявленная мощность соотносятся между собой для выбранного производителя?',
  },
]

function SkeletonLine({ className }) {
  return <span className={`sk-bone ${className}`} />
}

export function CoalIntelligenceWorkbench({ outlook, loading, error, onRetry }) {
  const { demandLab, setQuestionId } = useScenario()
  const questionId = QUESTIONS.some((item) => item.id === demandLab.questionId)
    ? demandLab.questionId
    : LAB_QUESTION_IDS.INCREMENTAL_DEMAND
  const active = QUESTIONS.find((item) => item.id === questionId)

  if (loading) {
    return (
      <section className="sw is-loading" aria-busy="true" aria-label="Данные загружаются">
        <header className="sw-head">
          <p className="sw-kicker">Сценарий</p>
          <div className="sw-questions sw-mode-switch" aria-hidden="true">
            <span className="sw-q is-skeleton">
              <SkeletonLine className="ci-skel-copy is-short" />
            </span>
            <span className="sw-q is-skeleton">
              <SkeletonLine className="ci-skel-copy is-short" />
            </span>
          </div>
          <SkeletonLine className="ci-skel-detail-title" />
        </header>
        <div className="sw-question-stage">
          <div className="sw-body is-skeleton">
            <aside className="sw-control">
              <SkeletonLine className="ci-skel-kind" />
              <SkeletonLine className="ci-skel-copy" />
              <SkeletonLine className="ci-skel-value" />
              <SkeletonLine className="ci-skel-copy is-short" />
            </aside>
            <div className="sw-canvas">
              <SkeletonLine className="ci-skel-kind" />
              <SkeletonLine className="ci-skel-hero" />
              <SkeletonLine className="ci-skel-copy" />
              <SkeletonLine className="ci-skel-copy is-short" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="sw">
        <p className="sw-kicker">Сценарий</p>
        <LoadErrorState onRetry={onRetry} />
      </section>
    )
  }

  return (
    <section className="sw sw-motion-entry" id="sw-workbench" aria-labelledby="sw-title">
      <header className="sw-head">
        <p className="sw-kicker">Сценарий</p>
        <div className="sw-questions sw-mode-switch" role="tablist" aria-label="Аналитический вопрос">
          {QUESTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={questionId === item.id}
              className={`sw-q${questionId === item.id ? ' is-active' : ''}`}
              onClick={() => setQuestionId(item.id)}
            >
              {item.tab}
            </button>
          ))}
        </div>
        <h2 id="sw-title">{active.title}</h2>
      </header>
      <div className="sw-question-stage" key={questionId}>
        {questionId === LAB_QUESTION_IDS.PRODUCTION_SCENARIO ? (
          <ProductionScenarioLab outlook={outlook} onRetry={onRetry} />
        ) : (
          <IncrementalDemandLab outlook={outlook} onRetry={onRetry} embedded />
        )}
      </div>
    </section>
  )
}
