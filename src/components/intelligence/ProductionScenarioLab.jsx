import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatQualifiedNumber } from '../../lib/formatCore.js'
import { getSource } from '../../data/catalog.js'
import { MEASURE_KIND } from '../../lib/scenarioEvidence.js'
import {
  PRODUCTION_COMPARISON,
  PRODUCTION_UI,
  bindProductionProducer,
  evaluateProductionLab,
  highlightedRoles,
  listProductionProducers,
} from '../../lib/scenarioLab/productionSlice.js'
import { useScenario } from '../../context/ScenarioContext'
import { useSources } from '../../context/SourceContext'
import { MetricTraceButton } from '../traceability/MetricTraceButton'
import { AnimatedNumber } from './ScenarioMotion'
import { infrastructureSearch, snapshotInfrastructureHandoff } from '../../lib/infrastructureIntelligence'

const COMPARISON_OPTIONS = [
  {
    id: PRODUCTION_COMPARISON.PLAN_STEP,
    label: 'Факт → План',
  },
  {
    id: PRODUCTION_COMPARISON.TARGET_GAP,
    label: 'Факт → Цель',
  },
  {
    id: PRODUCTION_COMPARISON.CAPACITY_REF,
    label: 'Факт ↔ Заявленная мощность',
    limit: 'Показатели имеют разный смысл и не интерпретируются как свободная мощность.',
  },
]

const KIND_LABEL = {
  [MEASURE_KIND.ACTUAL]: 'ФАКТ',
  [MEASURE_KIND.PLAN]: 'ПЛАН',
  [MEASURE_KIND.TARGET]: 'ЦЕЛЬ',
  [MEASURE_KIND.CAPACITY]: 'МОЩНОСТЬ',
}

const KIND_MEANING = {
  [MEASURE_KIND.ACTUAL]: 'Фактическая добыча',
  [MEASURE_KIND.PLAN]: 'Опубликованный план добычи',
  [MEASURE_KIND.TARGET]: 'Заявленный целевой уровень',
  [MEASURE_KIND.CAPACITY]: 'Заявленная мощность',
}

function qty(metric) {
  if (!metric || typeof metric.value !== 'number') return '—'
  return formatQualifiedNumber(metric.value, metric.qualifier, metric.approx)
}

function signedQty(metric) {
  if (!metric || typeof metric.value !== 'number') return '—'
  const shown = formatQualifiedNumber(Math.abs(metric.value), metric.qualifier, metric.approx)
  if (metric.value > 0) return `+${shown}`
  if (metric.value < 0) return `−${shown}`
  return shown
}

function displayUnit(unit) {
  if (!unit) return ''
  return String(unit).replace(/\s*в год\s*/u, '/год')
}

function qtyWithUnit(metric) {
  if (!metric || typeof metric.value !== 'number') return '—'
  const unit = displayUnit(metric.unit)
  return unit ? `${qty(metric)} ${unit}` : qty(metric)
}

function AnimatedMetricNumber({ metric, signed = false, duration = 560, animationKey }) {
  if (!metric || typeof metric.value !== 'number') return '—'
  return (
    <AnimatedNumber
      value={metric.value}
      qualifier={metric.qualifier}
      approx={metric.approx}
      signed={signed}
      duration={duration}
      animationKey={animationKey}
    />
  )
}

function readableOrganization(organization) {
  if (!organization) return null
  const text = String(organization).trim()
  if (!text) return null
  if (/самрук-қазына|самрук-казына|samruk.?kazyna/i.test(text)) return 'Самрук-Қазына'
  if (/министерство энергетики/i.test(text)) return 'Министерство энергетики'
  return text
}

function organizationForSource(sourceId, remoteByCode) {
  if (!sourceId) return null
  const record = remoteByCode?.[sourceId] || getSource(sourceId)
  if (!record) return null
  const org = readableOrganization(record.organization || null)
  const publication = record.publication ? String(record.publication).trim() : ''
  if (org && publication) return `${org} · ${publication}`
  return org || publication || null
}

function metricCoverageLine(metric) {
  if (!metric || typeof metric.value !== 'number') return null
  const unit = displayUnit(metric.unit)
  const amount = unit ? `${qty(metric)} ${unit}` : qty(metric)
  return metric.year != null ? `${amount} · ${metric.year}` : amount
}

function operandByRole(model, role) {
  return (model?.operands || []).find((item) => item.role === role) || null
}

function OfficialAnchorTrack({ track, focusRoles, producerLabel, remoteByCode, animationKey }) {
  if (!track?.points?.length) return null
  return (
    <div className="sw-prod-viz">
      <div className={`sw-prod-track${track.timeScale ? ' is-time' : ''}${track.connection === 'none' ? ' is-single' : ''}`} aria-label="Опубликованные показатели">
        {track.connection === 'anchor_readability' ? (
          <div className="sw-prod-axis" aria-hidden="true">
            <span className="sw-prod-link" />
          </div>
        ) : null}
        <ol className="sw-prod-points">
          {track.points.map((point) => {
            const org = organizationForSource(point.sourceId, remoteByCode)
            return (
              <li
                key={point.role}
                className={`sw-prod-point${focusRoles.includes(point.role) ? ' is-focus' : ''}`}
                style={track.timeScale ? { left: `${point.position}%` } : undefined}
              >
                <span className="sw-prod-year">{point.year}</span>
                <span className="sw-prod-kind">{KIND_LABEL[point.measureKind] || point.measureKind}</span>
                <span className="sw-prod-dot" />
                <strong className="sw-prod-val">
                  <AnimatedNumber
                    value={point.value}
                    duration={560}
                    animationKey={`${animationKey}-${point.role}`}
                  />
                  <span className="sw-prod-unit">{displayUnit(point.unit)}</span>
                </strong>
                <span className="sw-prod-meaning">{KIND_MEANING[point.measureKind]}</span>
                <span className="sw-prod-who">{producerLabel}</span>
                {org ? <span className="sw-prod-org">Источник: {org}</span> : null}
              </li>
            )
          })}
        </ol>
      </div>
      {track.connection === 'anchor_readability' ? (
        <p className="sw-prod-link-note">Соединение опубликованных ориентиров для чтения. Не прогноз.</p>
      ) : null}
      {track.capacity ? (
        <div className={`sw-prod-cap${focusRoles.includes('capacity') ? ' is-focus' : ''}`}>
          <p className="sw-prod-cap-kicker">Заявленная мощность</p>
          <p className="sw-prod-cap-val">
            <AnimatedNumber
              value={track.capacity.value}
              duration={560}
              animationKey={`${animationKey}-capacity`}
            />{' '}
            {displayUnit(track.capacity.unit)}
          </p>
          <p className="sw-prod-cap-note">Справочный показатель · не является прогнозом производства</p>
        </div>
      ) : null}
    </div>
  )
}

function HumanEquation({ left, leftCaption, right, rightCaption, result, resultCaption }) {
  return (
    <div className="sw-eq" aria-label="Сравнение показателей">
      <div>
        <strong>{qtyWithUnit(left)}</strong>
        <span>{leftCaption}</span>
      </div>
      <span className="sw-eq-op" aria-hidden="true">
        −
      </span>
      <div>
        <strong>{qtyWithUnit(right)}</strong>
        <span>{rightCaption}</span>
      </div>
      <span className="sw-eq-op" aria-hidden="true">
        =
      </span>
      <div className="is-result">
        <strong>{result ? signedQty(result) : 'недоступно'}</strong>
        <span>{resultCaption}</span>
      </div>
    </div>
  )
}

function ResultExplanation({ lab, producerLabel }) {
  const { comparison, model, binding, error, capabilities } = lab
  if (!model) {
    const comparisonLabel =
      comparison === PRODUCTION_COMPARISON.TARGET_GAP
        ? 'Факт → Цель'
        : comparison === PRODUCTION_COMPARISON.CAPACITY_REF
          ? 'Факт ↔ Заявленная мощность'
          : 'Факт → План'
    return (
      <div className="sw-explain">
        <h3>Почему расчёт недоступен?</h3>
        <p>
          Для сравнения «{comparisonLabel}» необходимы два опубликованных показателя выбранного производителя.
        </p>
        <p>{error?.message || 'Подтверждённые операнды для этого сравнения отсутствуют.'}</p>
        <p className="sw-limit">
          <strong>Важно.</strong> Система не подставляет оценку и не использует показатель другой компании. Для{' '}
          {producerLabel} подтверждённый фактический показатель за сопоставимый период в текущем контуре данных
          {capabilities?.canCompareActualToPlan || capabilities?.canCompareActualToTarget || capabilities?.canCompareActualToCapacity
            ? ' может быть недостаточен для выбранного сравнения.'
            : ' отсутствует, либо не хватает второго операнда.'}
        </p>
      </div>
    )
  }

  if (comparison === PRODUCTION_COMPARISON.TARGET_GAP) {
    const target = operandByRole(model, 'target') || binding.target
    const actual = operandByRole(model, 'actual') || binding.actual
    return (
      <div className="sw-explain">
        <h3>Почему результат {signedQty(model)} {displayUnit(model.unit)}?</h3>
        <p>
          Система сравнивает фактическую добычу за {actual?.year} год с заявленной целью на {target?.year} год для{' '}
          {producerLabel}.
        </p>
        <HumanEquation
          left={target}
          leftCaption={`Цель ${target?.year ?? ''}`}
          right={actual}
          rightCaption={`Факт ${actual?.year ?? ''}`}
          result={model}
          resultCaption="Разница"
        />
        <h4>Что это означает</h4>
        <p>
          Это только разность между опубликованным фактом и заявленной долгосрочной целью. Это не траектория, не
          вероятность достижения цели и не значения промежуточных лет.
        </p>
        <p className="sw-limit">
          <strong>Важно.</strong> Сравнение не задаёт путь роста и не заполняет годы между фактом и целью.
        </p>
      </div>
    )
  }

  if (comparison === PRODUCTION_COMPARISON.CAPACITY_REF) {
    const capacity = operandByRole(model, 'capacity') || binding.capacity
    const actual = operandByRole(model, 'actual') || binding.actual
    return (
      <div className="sw-explain">
        <h3>Почему результат {signedQty(model)} {displayUnit(model.unit)}?</h3>
        <p>
          Система сопоставляет заявленную мощность предприятия с фактической добычей за {actual?.year} год. Это разные
          концепты и могут происходить из разных публикаций.
        </p>
        <HumanEquation
          left={capacity}
          leftCaption="Заявленная мощность"
          right={actual}
          rightCaption={`Факт ${actual?.year ?? ''}`}
          result={model}
          resultCaption="Справочная разница"
        />
        <h4>Что это означает</h4>
        <p>
          Число показывает разность опубликованных величин. Это не свободная мощность, не резерв и не нарушение, если
          факт выше мощности.
        </p>
        <p className="sw-limit">
          <strong>Важно.</strong> {PRODUCTION_UI.capacityConceptNote}
        </p>
      </div>
    )
  }

  const plan = operandByRole(model, 'plan') || binding.plan
  const actual = operandByRole(model, 'actual') || binding.actual
  const below = typeof model.value === 'number' && model.value < 0
  const above = typeof model.value === 'number' && model.value > 0
  const deltaAbs = formatQualifiedNumber(Math.abs(model.value), model.qualifier, model.approx)
  const relation = below ? 'ниже' : above ? 'выше' : 'равен'
  return (
    <div className="sw-explain">
      <h3>Почему результат {signedQty(model)} {displayUnit(model.unit)}?</h3>
      <p>
        Система сравнивает фактическую добычу за {actual?.year} год с опубликованным планом на {plan?.year} год.
      </p>
      <HumanEquation
        left={plan}
        leftCaption={`План ${plan?.year ?? ''}`}
        right={actual}
        rightCaption={`Факт ${actual?.year ?? ''}`}
        result={model}
        resultCaption="Разница"
      />
      <h4>Что это означает</h4>
      <p>
        Опубликованный план на {plan?.year} год {relation} фактического показателя {actual?.year} года
        {model.value === 0 ? '.' : ` на ${deltaAbs} ${displayUnit(model.unit)}.`}
      </p>
      <p className="sw-limit">
        <strong>Важно.</strong> Это сравнение опубликованных показателей, а не прогноз фактического результата{' '}
        {plan?.year} года.
      </p>
    </div>
  )
}

function MethodPanel({ lab, producerLabel, remoteByCode }) {
  const { comparison, model } = lab
  if (!model) {
    return (
      <div className="sw-explain">
        <h3>Как выполнен расчёт</h3>
        <p>Расчёт не выполняется, пока нет обоих подтверждённых операндов выбранного сравнения.</p>
        <p>{lab.error?.message}</p>
        <p className="sw-limit">
          <strong>Ограничение.</strong> Система не подставляет оценку или показатель другой компании.
        </p>
      </div>
    )
  }

  const leftRole =
    comparison === PRODUCTION_COMPARISON.TARGET_GAP
      ? 'target'
      : comparison === PRODUCTION_COMPARISON.CAPACITY_REF
        ? 'capacity'
        : 'plan'
  const left = operandByRole(model, leftRole)
  const actual = operandByRole(model, 'actual')
  const leftTitle =
    leftRole === 'target' ? `Цель ${left?.year ?? ''}` : leftRole === 'capacity' ? 'Заявленная мощность' : `План ${left?.year ?? ''}`
  const compareLine =
    leftRole === 'target'
      ? `Факт производства ${actual?.year ?? ''} → Цель ${left?.year ?? ''}`
      : leftRole === 'capacity'
        ? `Факт производства ${actual?.year ?? ''} ↔ Заявленная мощность`
        : `Факт производства ${actual?.year ?? ''} → План производства ${left?.year ?? ''}`
  const formulaLine =
    leftRole === 'target'
      ? `Цель ${left?.year ?? ''} − Факт ${actual?.year ?? ''}`
      : leftRole === 'capacity'
        ? `Заявленная мощность − Факт ${actual?.year ?? ''}`
        : `План ${left?.year ?? ''} − Факт ${actual?.year ?? ''}`
  const limitation =
    leftRole === 'capacity'
      ? PRODUCTION_UI.capacityConceptNote
      : leftRole === 'target'
        ? 'Цель является опубликованным ориентиром и не задаёт промежуточные годы и не гарантирует расширение добычи.'
        : `План является опубликованным ориентиром и не означает фактический результат ${left?.year ?? ''} года.`

  return (
    <div className="sw-explain">
      <h3>Как выполнен расчёт</h3>
      <h4>Что сравниваем</h4>
      <p>{compareLine}</p>
      <h4>Формула</h4>
      <p>{formulaLine}</p>
      <h4>Исходные показатели</h4>
      <ul className="sw-src-list">
        <li>
          <span>{KIND_MEANING[actual?.measureKind] || 'Факт'} {actual?.year ?? ''}</span>
          <strong>{qtyWithUnit(actual)}</strong>
          {organizationForSource(actual?.sourceId, remoteByCode) ? (
            <em>Источник: {organizationForSource(actual?.sourceId, remoteByCode)}</em>
          ) : null}
        </li>
        <li>
          <span>{leftTitle}</span>
          <strong>{qtyWithUnit(left)}</strong>
          {organizationForSource(left?.sourceId, remoteByCode) ? (
            <em>Источник: {organizationForSource(left?.sourceId, remoteByCode)}</em>
          ) : null}
        </li>
      </ul>
      <p className="sw-limit">
        <strong>Ограничение.</strong> {limitation}
      </p>
      <p className="sw-explain-meta">{producerLabel}</p>
      <details className="sw-tech">
        <summary>Технические детали</summary>
        <ul>
          <li>операция: {model.calculationId}</li>
          <li>формула: {model.formula}</li>
          {(model.operands || []).map((op, index) => (
            <li key={`${op.role || op.id || index}`}>
              {op.role || op.label}: sourceId {op.sourceId || '—'} · measureKind {op.measureKind || '—'} · year{' '}
              {op.year ?? '—'} · scope {op.scope || '—'} · entity {op.entityKey || op.companyId || '—'}
            </li>
          ))}
          <li>comparability: {model.comparability?.status || '—'}</li>
          {(model.limitations || []).map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function comparisonEnabled(lab, id) {
  const caps = lab.capabilities || {}
  if (id === PRODUCTION_COMPARISON.PLAN_STEP) return caps.canCompareActualToPlan
  if (id === PRODUCTION_COMPARISON.TARGET_GAP) return caps.canCompareActualToTarget
  if (id === PRODUCTION_COMPARISON.CAPACITY_REF) return caps.canCompareActualToCapacity
  return false
}

function OtherComparisons({ lab, onSelect }) {
  const actualYear = lab.binding?.actual?.year
  const planYear = lab.binding?.plan?.year
  const blurbs = {
    [PRODUCTION_COMPARISON.PLAN_STEP]: actualYear && planYear
      ? `Сравнить фактическое производство ${actualYear} года с опубликованным планом на ${planYear} год.`
      : lab.errors?.planStep?.message || 'Недостаточно подтверждённых показателей.',
    [PRODUCTION_COMPARISON.TARGET_GAP]: comparisonEnabled(lab, PRODUCTION_COMPARISON.TARGET_GAP)
      ? 'Показать разницу между фактическим показателем и долгосрочной заявленной целью.'
      : lab.errors?.targetGap?.message || 'Недостаточно подтверждённых показателей.',
    [PRODUCTION_COMPARISON.CAPACITY_REF]: comparisonEnabled(lab, PRODUCTION_COMPARISON.CAPACITY_REF)
      ? 'Сопоставить фактическое производство с опубликованной заявленной мощностью предприятия.'
      : lab.errors?.capacityRef?.message || 'Недостаточно подтверждённых показателей.',
  }
  return (
    <ul className="sw-others">
      {COMPARISON_OPTIONS.map((option) => (
        <li key={option.id}>
          <button
            type="button"
            className={lab.comparison === option.id ? 'is-active' : ''}
            onClick={() => onSelect(option.id)}
          >
            <strong>{option.label}</strong>
            <span>{comparisonEnabled(lab, option.id) ? blurbs[option.id] : `Недоступно. ${blurbs[option.id]}`}</span>
            {option.limit && comparisonEnabled(lab, option.id) ? <em>{option.limit}</em> : null}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ProductionScenarioLab({ outlook, onRetry }) {
  const { demandLab, setProductionComparison, setProductionProducerId } = useScenario()
  const { remoteByCode } = useSources()
  const [panel, setPanel] = useState('explain')

  const producers = useMemo(() => listProductionProducers(outlook), [outlook])
  const producerId = producers.some((item) => item.id === demandLab.productionProducerId)
    ? demandLab.productionProducerId
    : producers[0]?.id || demandLab.productionProducerId

  const binding = useMemo(() => bindProductionProducer(outlook, producerId), [outlook, producerId])
  const lab = useMemo(
    () => evaluateProductionLab({ binding, comparison: demandLab.productionComparison }),
    [binding, demandLab.productionComparison],
  )
  const focusRoles = highlightedRoles(lab.comparison)
  const caseRaw = outlook?.[binding.outlookKey]
  const coverage = lab.coverage || {}
  const coverageCopy = lab.coverageCopy

  if (!producers.length) {
    return (
      <p className="sw-missing" role="status">
        Официальные производственные операнды недоступны
        {onRetry ? (
          <button type="button" className="ghost-btn" onClick={onRetry}>
            Повторить
          </button>
        ) : null}
      </p>
    )
  }

  const togglePanel = (id) => setPanel((current) => (current === id ? null : id))
  const traceItem = caseRaw?.actualLatest || caseRaw?.actual

  return (
    <>
      <div className="sw-body is-prod">
        <aside className="sw-control sw-prod-meta">
          <p className="sw-field-kicker">Производитель</p>
          <select
            className="sw-producer"
            value={producerId}
            onChange={(event) => setProductionProducerId(event.target.value)}
            aria-label="Производитель"
          >
            {producers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.selectorLabel || item.label}
              </option>
            ))}
          </select>
          <div className="sw-producer-reveal" key={`${producerId}-meta`}>
            <p className="sw-field-value sw-prod-legal">{binding.label}</p>
            {coverageCopy ? (
              <p className="sw-coverage-line">
                {coverageCopy.line}
                {coverageCopy.detail ? <span>{coverageCopy.detail}</span> : null}
              </p>
            ) : null}

            {binding.actual ? (
              <>
                <p className="sw-field-kicker">Исходный факт</p>
                <p className="sw-official">
                  <AnimatedMetricNumber metric={binding.actual} animationKey={`${producerId}-primary-actual`} />{' '}
                  <span>{displayUnit(binding.actual.unit)}</span>
                </p>
                <p className="sw-official-meta">
                  {binding.actual.year} · фактическая добыча
                  {traceItem ? <MetricTraceButton item={traceItem} extras={{ id: `${binding.producerId}Actual` }} /> : null}
                </p>
                {binding.vintageNote ? <p className="sw-field-note">{binding.vintageNote}</p> : null}
              </>
            ) : binding.historicalActuals?.length ? (
              <>
                <p className="sw-field-kicker">Факт</p>
                <p className="sw-official">
                  <AnimatedMetricNumber
                    metric={binding.historicalActuals[0]}
                    animationKey={`${producerId}-primary-historical`}
                  />{' '}
                  <span>{displayUnit(binding.historicalActuals[0].unit)}</span>
                </p>
                <p className="sw-official-meta">
                  {binding.historicalActuals[0].year} · исторический показатель
                </p>
                {binding.vintageNote ? <p className="sw-field-note">{binding.vintageNote}</p> : null}
              </>
            ) : (
              <>
                <p className="sw-field-kicker">Фактический показатель</p>
                <p className="sw-missing-fact">Нет подтверждённых данных для сопоставимого периода</p>
              </>
            )}

            <p className="sw-field-kicker">Покрытие данных</p>
            <ul className="sw-cover">
              <li>
                <span>Факт</span>
                <strong>
                  {coverage.actual
                    ? metricCoverageLine(binding.actual)
                    : coverage.actualHistorical
                      ? metricCoverageLine(binding.historicalActuals[0])
                      : 'нет'}
                  {coverage.actualHistorical && !coverage.actual ? <em>Исторический показатель</em> : null}
                </strong>
              </li>
              <li>
                <span>План</span>
                <strong>{coverage.plan ? metricCoverageLine(binding.plan) : 'нет'}</strong>
              </li>
              <li>
                <span>Цель</span>
                <strong>{coverage.target ? metricCoverageLine(binding.target) : 'нет'}</strong>
              </li>
              <li>
                <span>Заявленная мощность</span>
                <strong>{coverage.capacity ? metricCoverageLine(binding.capacity) : 'нет'}</strong>
              </li>
            </ul>
          </div>
        </aside>

        <div className="sw-canvas sw-producer-reveal" key={`${producerId}-canvas`}>
          <p className="sw-canvas-kicker">Опубликованные показатели производства</p>
          <p className="sw-canvas-sub">
            {lab.track.points.length
              ? 'Опубликованные якоря выбранного производителя'
              : 'Нет опубликованных якорей добычи для шкалы лет'}
          </p>
          <OfficialAnchorTrack
            track={lab.track}
            focusRoles={focusRoles}
            producerLabel={binding.label}
            remoteByCode={remoteByCode}
            animationKey={producerId}
          />

          <div className="sw-evidence">
            <p className="sw-canvas-kicker">Доступность данных</p>
            <ul>
              <li>
                <span>Фактическая добыча</span>
                <strong>
                  {binding.actual
                    ? `${qty(binding.actual)} ${displayUnit(binding.actual.unit)}`
                    : binding.historicalActuals?.length
                      ? `${qty(binding.historicalActuals[0])} ${displayUnit(binding.historicalActuals[0].unit)}`
                      : 'Не найден подтверждённый показатель для сопоставимого периода'}
                </strong>
                {binding.actual ? (
                  <em>
                    {binding.actual.year} · фактическая добыча
                    {organizationForSource(binding.actual.sourceId, remoteByCode)
                      ? ` · ${organizationForSource(binding.actual.sourceId, remoteByCode)}`
                      : ''}
                  </em>
                ) : binding.historicalActuals?.length ? (
                  <em>
                    {binding.historicalActuals[0].year} · исторический показатель
                    {organizationForSource(binding.historicalActuals[0].sourceId, remoteByCode)
                      ? ` · ${organizationForSource(binding.historicalActuals[0].sourceId, remoteByCode)}`
                      : ''}
                    {binding.vintageNote ? ` · ${binding.vintageNote}` : ''}
                  </em>
                ) : null}
              </li>
              {(binding.historicalActuals || []).slice(binding.actual ? 0 : 1).map((item, index) => (
                <li key={`${item.year}-${item.value}-${index}`}>
                  <span>Исторический факт</span>
                  <strong>
                    {qty(item)} {displayUnit(item.unit)}
                  </strong>
                  <em>
                    {item.year} · исторический показатель
                    {organizationForSource(item.sourceId, remoteByCode)
                      ? ` · ${organizationForSource(item.sourceId, remoteByCode)}`
                      : ''}
                  </em>
                </li>
              ))}
              <li>
                <span>План</span>
                <strong>
                  {binding.plan
                    ? `${qty(binding.plan)} ${displayUnit(binding.plan.unit)}`
                    : 'Не найден опубликованный план'}
                </strong>
                {binding.plan ? (
                  <em>
                    {binding.plan.year}
                    {organizationForSource(binding.plan.sourceId, remoteByCode)
                      ? ` · ${organizationForSource(binding.plan.sourceId, remoteByCode)}`
                      : ''}
                  </em>
                ) : null}
              </li>
              <li>
                <span>Цель</span>
                <strong>
                  {binding.target
                    ? `${qty(binding.target)} ${displayUnit(binding.target.unit)}`
                    : 'Не найдена опубликованная цель'}
                </strong>
                {binding.target ? (
                  <em>
                    {binding.target.year}
                    {organizationForSource(binding.target.sourceId, remoteByCode)
                      ? ` · ${organizationForSource(binding.target.sourceId, remoteByCode)}`
                      : ''}
                  </em>
                ) : null}
              </li>
              <li>
                <span>Заявленная мощность</span>
                <strong>
                  {binding.capacity
                    ? `${qty(binding.capacity)} ${displayUnit(binding.capacity.unit)}`
                    : 'Не найдена заявленная мощность'}
                </strong>
                {binding.capacity && organizationForSource(binding.capacity.sourceId, remoteByCode) ? (
                  <em>{organizationForSource(binding.capacity.sourceId, remoteByCode)}</em>
                ) : null}
              </li>
            </ul>
          </div>
        </div>

        <aside className="sw-control sw-prod-cmp sw-producer-reveal" key={`${producerId}-comparison`}>
          <p className="sw-field-kicker">Сравнение</p>
          <div className="sw-cmp" role="radiogroup" aria-label="Сравнение">
            {COMPARISON_OPTIONS.map((option) => {
              const enabled = comparisonEnabled(lab, option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={lab.comparison === option.id}
                  aria-disabled={!enabled}
                  className={`sw-cmp-btn${lab.comparison === option.id ? ' is-active' : ''}${enabled ? '' : ' is-off'}`}
                  onClick={() => setProductionComparison(option.id)}
                >
                  <span>{option.label}</span>
                  <strong>{enabled ? 'доступно' : 'недоступно'}</strong>
                  {!enabled && lab.errors?.[option.id === PRODUCTION_COMPARISON.PLAN_STEP ? 'planStep' : option.id === PRODUCTION_COMPARISON.TARGET_GAP ? 'targetGap' : 'capacityRef'] ? (
                    <em>{lab.errors[option.id === PRODUCTION_COMPARISON.PLAN_STEP ? 'planStep' : option.id === PRODUCTION_COMPARISON.TARGET_GAP ? 'targetGap' : 'capacityRef'].message}</em>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="sw-prod-model">
            <p className="sw-canvas-kicker">Результат сравнения</p>
            <ul>
              <li className={lab.comparison === PRODUCTION_COMPARISON.PLAN_STEP ? 'is-active' : ''}>
                <span>Факт → План</span>
                <strong>
                  {lab.models.planStep ? (
                    <>
                      {lab.comparison === PRODUCTION_COMPARISON.PLAN_STEP ? (
                        <AnimatedMetricNumber
                          metric={lab.models.planStep}
                          signed
                          duration={430}
                          animationKey={`${producerId}-${lab.comparison}`}
                        />
                      ) : signedQty(lab.models.planStep)}{' '}
                      {displayUnit(lab.models.planStep.unit)}
                    </>
                  ) : 'недоступно'}
                </strong>
              </li>
              <li className={lab.comparison === PRODUCTION_COMPARISON.TARGET_GAP ? 'is-active' : ''}>
                <span>Факт → Цель</span>
                <strong>
                  {lab.models.targetGap ? (
                    <>
                      {lab.comparison === PRODUCTION_COMPARISON.TARGET_GAP ? (
                        <AnimatedMetricNumber
                          metric={lab.models.targetGap}
                          signed
                          duration={430}
                          animationKey={`${producerId}-${lab.comparison}`}
                        />
                      ) : signedQty(lab.models.targetGap)}{' '}
                      {displayUnit(lab.models.targetGap.unit)}
                    </>
                  ) : 'недоступно'}
                </strong>
              </li>
              <li className={lab.comparison === PRODUCTION_COMPARISON.CAPACITY_REF ? 'is-active' : ''}>
                <span>{PRODUCTION_UI.capacityDifference}</span>
                <strong>
                  {lab.models.capacityRef ? (
                    <>
                      {lab.comparison === PRODUCTION_COMPARISON.CAPACITY_REF ? (
                        <AnimatedMetricNumber
                          metric={lab.models.capacityRef}
                          signed
                          duration={430}
                          animationKey={`${producerId}-${lab.comparison}`}
                        />
                      ) : signedQty(lab.models.capacityRef)}{' '}
                      {displayUnit(lab.models.capacityRef.unit)}
                    </>
                  ) : 'недоступно'}
                </strong>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <footer className="sw-foot">
        <div className="sw-formula" aria-label="Формула">
          {lab.model ? (
            lab.comparison === PRODUCTION_COMPARISON.TARGET_GAP ? (
              <>
                <span>Цель {binding.target.year} {qtyWithUnit(binding.target)}</span>
                <span aria-hidden="true">−</span>
                <span>Факт {binding.actual.year} {qtyWithUnit(binding.actual)}</span>
              </>
            ) : lab.comparison === PRODUCTION_COMPARISON.CAPACITY_REF ? (
              <>
                <span>Заявленная мощность {qtyWithUnit(binding.capacity)}</span>
                <span aria-hidden="true">−</span>
                <span>Факт {binding.actual.year} {qtyWithUnit(binding.actual)}</span>
              </>
            ) : (
              <>
                <span>План {binding.plan.year} {qtyWithUnit(binding.plan)}</span>
                <span aria-hidden="true">−</span>
                <span>Факт {binding.actual.year} {qtyWithUnit(binding.actual)}</span>
              </>
            )
          ) : (
            <span>Расчёт недоступен: не хватает подтверждённых операндов выбранного сравнения.</span>
          )}
          {lab.model ? (
            <>
              <span aria-hidden="true">=</span>
              <span>{signedQty(lab.model)}</span>
            </>
          ) : null}
        </div>
        <div className="sw-foot-actions">
          <button type="button" className="sw-text-btn" aria-expanded={panel === 'explain'} onClick={() => togglePanel('explain')}>
            Объяснение результата
          </button>
          <button type="button" className="sw-text-btn" aria-expanded={panel === 'method'} onClick={() => togglePanel('method')}>
            Как рассчитано
          </button>
          <button type="button" className="sw-text-btn" aria-expanded={panel === 'others'} onClick={() => togglePanel('others')}>
            Другие сравнения
          </button>
          <Link
            className="sw-text-btn"
            to={infrastructureSearch({ producerId })}
            state={{
              infrastructureHandoff: snapshotInfrastructureHandoff({
                producerId,
                comparisonId: lab.comparison,
                modelResult: lab.model,
                operands: {
                  actual: binding.actual,
                  plan: binding.plan,
                  target: binding.target,
                  capacity: binding.capacity,
                },
                limitations: lab.model?.limitations || [],
              }),
            }}
          >
            Исследовать инфраструктуру
          </Link>
        </div>
        <div className="sw-comparison-stage" key={`${producerId}-${lab.comparison}-${panel || 'closed'}`}>
          {panel === 'explain' ? <ResultExplanation lab={lab} producerLabel={binding.label} /> : null}
          {panel === 'method' ? (
            <MethodPanel lab={lab} producerLabel={binding.label} remoteByCode={remoteByCode} />
          ) : null}
          {panel === 'others' ? (
            <OtherComparisons lab={lab} onSelect={(id) => setProductionComparison(id)} />
          ) : null}
        </div>
      </footer>
    </>
  )
}
