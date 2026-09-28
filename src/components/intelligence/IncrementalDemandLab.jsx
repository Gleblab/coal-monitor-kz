import { useMemo, useState } from 'react'
import { LoadErrorState } from '../ui'
import { MetricTraceButton } from '../traceability/MetricTraceButton'
import { formatNumber, formatQualifiedNumber } from '../../lib/formatCore.js'
import { EVIDENCE_CLASS } from '../../lib/scenarioEvidence.js'
import { ANALYSIS_ID, CALCULATION_ID, READINESS } from '../../lib/scenarioLab/index.js'
import { useScenario } from '../../context/ScenarioContext'
import {
  SLIDER_STEP_PERCENT,
  allocationFromM1,
  bindIncrementalDemandOfficial,
  demandReadinessDrawer,
  evaluateDemandAb,
  evaluateDemandLab,
  parsePercentToShare,
} from '../../lib/scenarioLab/demandSlice.js'
import { bindProductionProducer } from '../../lib/scenarioLab/productionSlice.js'
import { AnimatedNumber } from './ScenarioMotion'

const GATE_LABEL = {
  [ANALYSIS_ID.DEMAND_SCENARIO]: 'Дополнительный спрос',
  [ANALYSIS_ID.LOGISTICS]: 'Логистика',
  [ANALYSIS_ID.NETBACK]: 'Netback',
  [ANALYSIS_ID.INVESTMENT]: 'Инвестиционная модель',
}

function qty(metric) {
  if (!metric || typeof metric.value !== 'number') return '—'
  return formatQualifiedNumber(metric.value, metric.qualifier, metric.approx)
}

function ClassMark({ kind }) {
  const label = kind === EVIDENCE_CLASS.OFFICIAL ? 'OFFICIAL' : kind === EVIDENCE_CLASS.ASSUMPTION ? 'ASSUMPTION' : 'MODEL'
  return <span className={`sw-class is-${kind}`}>{label}</span>
}

function CompactShare({ id, label, value, onChange, invalid }) {
  const parsed = parsePercentToShare(value)
  const unset = parsed.empty
  return (
    <div className={`sw-share${unset ? ' is-unset' : ''}${invalid ? ' is-invalid' : ''}`}>
      <label className="sw-share-label" htmlFor={id}>
        {label}
      </label>
      <div className="sw-share-row">
        <input
          id={id}
          className="sw-share-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          value={value}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="sw-share-unit" aria-hidden="true">
          %
        </span>
      </div>
      <input
        className={`sw-share-slider${unset ? ' is-unset' : ''}`}
        type="range"
        min="0"
        max="100"
        step={SLIDER_STEP_PERCENT}
        aria-label={`${label}, ползунок`}
        aria-valuetext={parsed.ok ? `${formatNumber(parsed.share * 100)} процентов` : 'значение не задано'}
        disabled={invalid}
        value={parsed.ok ? parsed.share * 100 : 0}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-hint`} className="sw-share-hint">
        {unset ? 'Задайте долю' : invalid ? '' : <ClassMark kind={EVIDENCE_CLASS.ASSUMPTION} />}
      </p>
    </div>
  )
}

function AllocationTrack({ official, model, label }) {
  const view = allocationFromM1(official, model)
  if (!view) return null
  const fill = view.modelValue == null ? 0 : view.fillPercent
  return (
    <div className="sw-alloc" aria-label={label}>
      <div className="sw-alloc-scale">
        <span>0</span>
        <span>
          {qty(official)} {official.unit}
        </span>
      </div>
      <div className="sw-alloc-track">
        <div className="sw-alloc-fill" style={{ width: `${fill}%` }} />
      </div>
    </div>
  )
}

function OperandLine({ role, metric }) {
  if (!metric) return null
  return (
    <li>
      <ClassMark kind={metric.evidenceClass} />
      <span>
        {role}: {qty(metric)} {metric.unit || ''}
        {metric.year != null ? ` · ${metric.year}` : ''}
        {metric.sourceId ? ` · ${metric.sourceId}` : ''}
        {metric.scope ? ` · ${metric.scope}` : ''}
      </span>
    </li>
  )
}

export function IncrementalDemandLab({ outlook, loading, error, onRetry, embedded = false }) {
  const {
    demandLab,
    setDemandPercent,
    setDemandPercentA,
    setDemandPercentB,
    setDemandCompareOpen,
  } = useScenario()
  const [whyOpen, setWhyOpen] = useState(false)
  const [readyOpen, setReadyOpen] = useState(false)

  const official = useMemo(() => bindIncrementalDemandOfficial(outlook), [outlook])
  const producerCtx = useMemo(
    () => bindProductionProducer(outlook, demandLab.productionProducerId),
    [outlook, demandLab.productionProducerId],
  )
  const lab = useMemo(() => evaluateDemandLab({ official, percentText: demandLab.percent }), [official, demandLab.percent])
  const ab = useMemo(
    () => evaluateDemandAb({ official, percentA: demandLab.percentA, percentB: demandLab.percentB }),
    [official, demandLab.percentA, demandLab.percentB],
  )
  const drawer = useMemo(() => demandReadinessDrawer(official, demandLab.percent), [official, demandLab.percent])
  const shareParsed = parsePercentToShare(demandLab.percent)
  const invalid = Boolean(lab.error && !lab.blockedBaseline && !lab.awaitingAssumption)
  const rawDemand = outlook?.industryOutlook?.additionalDemand

  if (!embedded && loading) {
    return (
      <section className="sw is-loading" aria-busy="true" aria-label="Данные загружаются">
        <p className="sw-kicker">Сценарий</p>
        <span className="sk-line sk-line-kpi-value" />
      </section>
    )
  }

  if (!embedded && error) {
    return (
      <section className="sw">
        <p className="sw-kicker">Сценарий</p>
        <LoadErrorState onRetry={onRetry} />
      </section>
    )
  }

  const inner = (
    <>
      {lab.blockedBaseline ? (
        <p className="sw-missing" role="status">
          Официальный исходный показатель недоступен
          {onRetry ? (
            <button type="button" className="ghost-btn" onClick={onRetry}>
              Повторить
            </button>
          ) : null}
        </p>
      ) : (
        <div className="sw-body">
          <aside className="sw-control">
          <p className="sw-field-kicker">Контур анализа</p>
          <p className="sw-field-value">Казахстан</p>
          <p className="sw-field-note">национальный ориентир дополнительного спроса, не добыча производителя</p>

            <p className="sw-field-kicker">Горизонт</p>
            <p className="sw-field-value">{official.year}</p>

            <p className="sw-field-kicker">
              <ClassMark kind={EVIDENCE_CLASS.OFFICIAL} /> baseline
            </p>
            <p className="sw-official">
              <AnimatedNumber
                value={official.value}
                qualifier={official.qualifier}
                approx={official.approx}
                animationKey="demand-baseline"
              />{' '}
              <span>{official.unit}</span>
            </p>
            <p className="sw-official-meta">
              {official.year}
              {rawDemand ? <MetricTraceButton item={rawDemand} extras={{ id: 'demand2030' }} /> : null}
            </p>

            <CompactShare
              id="sw-share"
              label="Доля ориентира"
              value={demandLab.percent}
              onChange={setDemandPercent}
              invalid={invalid}
            />

            {demandLab.compareOpen ? (
              <div className="sw-compare-controls">
                <CompactShare
                  id="sw-share-a"
                  label="Сценарий A"
                  value={demandLab.percentA}
                  onChange={setDemandPercentA}
                  invalid={Boolean(ab.a.error && !ab.a.awaitingAssumption)}
                />
                <CompactShare
                  id="sw-share-b"
                  label="Сценарий B"
                  value={demandLab.percentB}
                  onChange={setDemandPercentB}
                  invalid={Boolean(ab.b.error && !ab.b.awaitingAssumption)}
                />
                <button type="button" className="sw-text-btn" onClick={() => setDemandCompareOpen(false)}>
                  Закрыть сравнение
                </button>
              </div>
            ) : (
              <button type="button" className="sw-text-btn" onClick={() => setDemandCompareOpen(true)}>
                + Сравнить сценарий
              </button>
            )}
          </aside>

          <div className="sw-canvas">
            <p className="sw-canvas-kicker">Распределение ориентира дополнительного спроса</p>
            <AllocationTrack official={official} model={lab.model} label="Шкала OFFICIAL → MODEL" />

            <div className="sw-hero" aria-live="polite">
              <ClassMark kind={EVIDENCE_CLASS.MODEL} />
              {lab.model ? (
                <>
                  <p className="sw-hero-value">
                    <AnimatedNumber
                      value={lab.model.value}
                      qualifier={lab.model.qualifier}
                      approx={lab.model.approx}
                      duration={560}
                      updateDuration={200}
                      animationKey="demand-model"
                    />
                  </p>
                  <p className="sw-hero-unit">{lab.model.unit}</p>
                  <p className="sw-hero-share">
                    {formatNumber(shareParsed.share * 100)}% от {qty(official)} {official.unit}
                  </p>
                </>
              ) : (
                <p className="sw-hero-await">{invalid ? lab.error?.message : 'Задайте долю'}</p>
              )}
            </div>

            {demandLab.compareOpen ? (
              <div className="sw-ab" aria-label="Сравнение сценариев">
                <p className="sw-canvas-kicker">Один OFFICIAL базис · {qty(official)} {official.unit}</p>
                <div className="sw-ab-row">
                  <span>A</span>
                  <AllocationTrack official={official} model={ab.a.model} label="Сценарий A" />
                  <strong>
                    {ab.a.model ? (
                      <AnimatedNumber
                        value={ab.a.model.value}
                        qualifier={ab.a.model.qualifier}
                        approx={ab.a.model.approx}
                        duration={520}
                        updateDuration={200}
                        animationKey="demand-model-a"
                      />
                    ) : '—'}
                  </strong>
                </div>
                <div className="sw-ab-row">
                  <span>B</span>
                  <AllocationTrack official={official} model={ab.b.model} label="Сценарий B" />
                  <strong>
                    {ab.b.model ? (
                      <AnimatedNumber
                        value={ab.b.model.value}
                        qualifier={ab.b.model.qualifier}
                        approx={ab.b.model.approx}
                        duration={520}
                        updateDuration={200}
                        animationKey="demand-model-b"
                      />
                    ) : '—'}
                  </strong>
                </div>
                <p className="sw-ab-delta">
                  {ab.comparison?.ok && ab.comparison.comparison.difference != null
                    ? `Δ MODEL ${formatQualifiedNumber(ab.comparison.comparison.difference, official.qualifier, official.approx)} ${official.unit}`
                    : 'Δ MODEL —'}
                </p>
              </div>
            ) : null}

            <div className="sw-context">
              <p className="sw-context-kicker">Контекст производителя</p>
              <p className="sw-field-value">{producerCtx.label}</p>
              <p className="sw-context-note">
                Не ось модели. Национальный ориентир дополнительного спроса не является добычей выбранного производителя.
                MODEL не прибавляется к факту.
              </p>
              <ul>
                {producerCtx.actual ? (
                  <li>
                    <span>{producerCtx.actual.year} факт</span>
                    <strong>{qty(producerCtx.actual)}</strong>
                  </li>
                ) : null}
                {producerCtx.plan ? (
                  <li>
                    <span>{producerCtx.plan.year} план</span>
                    <strong>{qty(producerCtx.plan)}</strong>
                  </li>
                ) : null}
                {producerCtx.target ? (
                  <li>
                    <span>{producerCtx.target.year} цель</span>
                    <strong>{qty(producerCtx.target)}</strong>
                  </li>
                ) : null}
                {producerCtx.capacity ? (
                  <li>
                    <span>мощность</span>
                    <strong>
                      {qty(producerCtx.capacity)} {producerCtx.capacity.unit}
                    </strong>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      )}

      {!lab.blockedBaseline ? (
        <footer className="sw-foot">
          <div className="sw-formula" aria-label="Формула">
            <span>
              <ClassMark kind={EVIDENCE_CLASS.OFFICIAL} /> {qty(official)} {official.unit}
            </span>
            <span aria-hidden="true">×</span>
            <span>
              <ClassMark kind={EVIDENCE_CLASS.ASSUMPTION} />{' '}
              {shareParsed.ok ? `${formatNumber(shareParsed.share * 100)}%` : '—'}
            </span>
            <span aria-hidden="true">=</span>
            <span>
              <ClassMark kind={EVIDENCE_CLASS.MODEL} /> {lab.model ? `${qty(lab.model)} ${lab.model.unit}` : '—'}
            </span>
          </div>
          <div className="sw-foot-actions">
            {lab.model ? (
              <button type="button" className="sw-text-btn" aria-expanded={whyOpen} onClick={() => setWhyOpen((v) => !v)}>
                Почему?
              </button>
            ) : null}
            <button type="button" className="sw-text-btn" aria-expanded={readyOpen} onClick={() => setReadyOpen((v) => !v)}>
              Доступные расчёты
            </button>
          </div>
          {whyOpen && lab.model ? (
            <ol className="sw-why">
              <li>
                {lab.model.calculationId || CALCULATION_ID.M1} · {lab.model.formula}
              </li>
              {lab.model.operands.map((op, index) => (
                <OperandLine key={`${op.evidenceClass}-${op.role || op.id || index}`} role={op.role || op.label} metric={op} />
              ))}
              {(lab.model.limitations || []).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ol>
          ) : null}
          {readyOpen ? (
            <ul className="sw-ready">
              {drawer.map((item) => (
                <li key={item.analysisId}>
                  <span>{item.status === READINESS.READY ? '✓' : '○'}</span>
                  <span>{GATE_LABEL[item.analysisId] || item.analysisId}</span>
                  <span className="sw-ready-status">{item.status}</span>
                  {item.status !== READINESS.READY && item.missingInputs?.length ? (
                    <span className="sw-ready-miss">нужны: {item.missingInputs.join(', ')}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </footer>
      ) : null}
    </>
  )

  if (embedded) return inner

  return (
    <section className="sw" aria-labelledby="sw-title">
      <header className="sw-head">
        <p className="sw-kicker">Сценарий</p>
        <div className="sw-questions" role="tablist" aria-label="Аналитический вопрос">
          <button type="button" role="tab" aria-selected="true" className="sw-q is-active">
            Дополнительный спрос
          </button>
        </div>
        <h2 id="sw-title">Какой дополнительный объём следует из выбранной доли ориентира?</h2>
      </header>
      {inner}
    </section>
  )
}
