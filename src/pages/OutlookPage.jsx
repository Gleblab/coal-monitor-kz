import { loadOutlookWorkspace } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { useSources } from '../context/SourceContext'
import { TargetMonitor } from '../components/intelligence/TargetMonitor'
import { MetricTraceButton } from '../components/traceability/MetricTraceButton'
import { LoadErrorState, NoData, StateBlock, StatusBadge } from '../components/ui'
import { CoalIntelligenceShell } from '../components/intelligence/CoalIntelligenceShell'
import { CoalIntelligenceWorkbench } from '../components/intelligence/CoalIntelligenceWorkbench'
import { ScenarioReadingRail } from '../components/intelligence/ScenarioReadingRail'
import { getChartTooltipStyle, formatNumber, formatQualifiedNumber } from '../lib/format'
import { useChartTheme } from '../hooks/useChartTheme'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function publicCopy(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  if (
    lower.includes('7,6') ||
    lower.includes('7.6') ||
    lower.includes('не используется') ||
    lower.includes('не включать') ||
    lower.includes('не сидир') ||
    lower.includes('не использовать') ||
    lower.includes('не заносится') ||
    lower.includes('не дублирует сумму') ||
    lower.includes('в модель не')
  ) {
    return null
  }
  return text
}

function metricValue(item) {
  if (!item || item.value == null) return '—'
  return formatQualifiedNumber(item.value, item.value_qualifier, item.approx)
}

function QuietSource({ sourceId }) {
  const { openSource } = useSources()
  if (!sourceId) return null
  return (
    <button
      type="button"
      className="outlook-source"
      onClick={() => openSource(sourceId)}
      aria-label="Источник показателя"
      title="Источник"
    >
      ист.
    </button>
  )
}

function OutlookMetric({ item, caption, variant = 'primary', showStatus = false, profileKey }) {
  if (!item) {
    return (
      <div className={`outlook-metric is-${variant}`}>
        <p className="outlook-metric-caption">{caption || 'Показатель'}</p>
        <p className="outlook-metric-value">—</p>
      </div>
    )
  }
  return (
    <div className={`outlook-metric is-${variant}`}>
      <p className="outlook-metric-caption">{caption || item.label}</p>
      <p className="outlook-metric-value">
        {metricValue(item)}
        <span>{item.unit}</span>
        <QuietSource sourceId={item.sourceId} />
      </p>
      <div className="outlook-metric-meta">
        {showStatus && item.status ? <StatusBadge status={item.status} /> : null}
        {item.period ? <span className="outlook-hint is-inline">{item.period}</span> : null}
        <MetricTraceButton
          item={item}
          extras={{ profileKey, route: '/outlook', label: caption || item.label }}
        />
      </div>
    </div>
  )
}

function CompactRow({ item, caption, profileKey }) {
  if (!item) return <p className="outlook-hint">Нет подтвержденных данных.</p>
  return (
    <div className="outlook-compact-row">
      <div>
        <p className="outlook-metric-value is-card">
          {metricValue(item)}
          <span>{item.unit}</span>
        </p>
        <p className="outlook-metric-caption">
          {caption}
          {item.period && !String(caption).includes(String(item.period)) ? ` · ${item.period}` : ''}
        </p>
      </div>
      <div className="outlook-metric-meta">
        {item.status ? <StatusBadge status={item.status} /> : null}
        <QuietSource sourceId={item.sourceId} />
        <MetricTraceButton
          item={item}
          extras={{ profileKey, route: '/outlook', label: caption || item.label }}
        />
      </div>
    </div>
  )
}

function FactorChain() {
  const steps = [
    'Новая и модернизированная генерация',
    'Дополнительный спрос на энергетический уголь',
    'Добыча и расширение производства',
    'Инвестиции',
    'Железнодорожная логистика',
  ]
  return (
    <ol className="outlook-chain">
      {steps.map((step, index) => (
        <li key={step}>
          <span className="outlook-chain-step">{step}</span>
          {index < steps.length - 1 ? (
            <span className="outlook-chain-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function BogatyrDot({ cx, cy, payload }) {
  const chart = useChartTheme()
  if (cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={chart.plotFill} stroke="#5eead4" strokeWidth={2.5} />
      <text x={cx} y={cy - 16} textAnchor="middle" fill={chart.axis} fontSize={9} letterSpacing="0.04em">
        {payload.status}
      </text>
    </g>
  )
}

function CompositionBar({ parent, parts }) {
  if (!parent || parent.value == null || !parts.length) return null
  const segments = parts
    .filter((item) => item.value != null && parent.value > 0)
    .map((item) => ({
      id: item.id,
      width: Math.min(100, (item.value / parent.value) * 100),
    }))

  return (
    <div className="outlook-share">
      <div className="outlook-share-track" aria-hidden="true">
        {segments.map((item) => (
          <span key={item.id} className="outlook-share-fill" style={{ width: `${item.width}%` }} />
        ))}
      </div>
      <div className="outlook-share-legend">
        {parts.map((item) => (
          <div key={item.id}>
            <p className="outlook-metric-caption">{item.label}</p>
            <p className="outlook-metric-value is-nested">
              {metricValue(item)}
              <span>{item.unit}</span>
              <QuietSource sourceId={item.sourceId} />
            </p>
          </div>
        ))}
      </div>
      <p className="outlook-hint">Части показателя выше, не отдельная сумма.</p>
    </div>
  )
}

function SectionError({ error }) {
  if (!error) return null
  return <LoadErrorState />
}

export function OutlookPage() {
  return <OutlookWorkspace />
}

function OutlookWorkspace() {
  const chart = useChartTheme()
  const { data, loading, error, reload } = useMarketData(loadOutlookWorkspace)
  const outlook = data?.outlook
  const generationCapacity = outlook?.nationalProject?.indicators?.find(
    (item) => item.indicator_kind === 'capacity',
  )

  return (
    <section className="outlook-page">
      <CoalIntelligenceWorkbench outlook={outlook} loading={loading} error={error} onRetry={reload} />
      <CoalIntelligenceShell />
      <p className="ci-legacy-split">Официальный мониторинг и программы</p>
      <ScenarioReadingRail
        outlook={outlook}
        exportTotals={data?.exportTotals}
        loading={loading}
        error={error}
        onRetry={reload}
      />
      <StateBlock loading={Boolean(loading && !error)} error={null} empty={!loading && !error && !outlook} skeleton="cards" onRetry={reload}>
        {outlook ? (
          <>
            <TargetMonitor pack={outlook.targetMonitor} />

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Отраслевой контур</p>
                  <h2>Что ожидает угольную отрасль Казахстана</h2>
                </div>
              </header>
              <p className="outlook-lead">
                Официальные планы, инвестиционные ориентиры и факторы будущего спроса на уголь
              </p>
              <FactorChain />

              <div className="outlook-exec-grid">
                <article className="outlook-exec-card" id="outlook-production-detail" tabIndex={-1}>
                  <h3>Добыча</h3>
                  {outlook.trajectory.actualExtraction ? (
                    <CompactRow
                      item={outlook.trajectory.actualExtraction}
                      caption="Факт 2025 · Минэнерго"
                      profileKey="production2025"
                    />
                  ) : (
                    <NoData text="Нет подтверждённых данных" />
                  )}
                  {outlook.trajectory.plannedExtraction ? (
                    <CompactRow
                      item={outlook.trajectory.plannedExtraction}
                      caption="План 2026 · Минэнерго"
                      profileKey="plan2026"
                    />
                  ) : (
                    <NoData text="Нет подтверждённых данных" />
                  )}
                  <p className="outlook-hint">
                    Плановый ориентир на 2026 год; не показатель фактического роста или выполнения.
                  </p>
                </article>

                <article className="outlook-exec-card" id="outlook-energy-demand-detail" tabIndex={-1}>
                  <h3>Будущий спрос</h3>
                  {outlook.industryOutlook.additionalDemand ? (
                    <CompactRow
                      item={outlook.industryOutlook.additionalDemand}
                      caption="дополнительный спрос на энергетический уголь к 2030 году"
                      profileKey="demand2030"
                    />
                  ) : (
                    <NoData text="Нет подтвержденного показателя дополнительного спроса." />
                  )}
                  {outlook.industryOutlook.energyNeed ? (
                    <CompactRow
                      item={outlook.industryOutlook.energyNeed}
                      caption="потребность для новых энергетических проектов к 2032 году"
                      profileKey="demand2032"
                    />
                  ) : (
                    <NoData text="Нет подтвержденного ориентира потребности к 2032 году." />
                  )}
                  <p className="outlook-callout">
                    Показатели относятся к разным официальным материалам и горизонтам и не суммируются.
                  </p>
                </article>

                <article className="outlook-exec-card">
                  <h3>Инвестиции</h3>
                  {outlook.trajectory.investmentFact ? (
                    <CompactRow item={outlook.trajectory.investmentFact} caption="Факт 2025" profileKey="invest2025" />
                  ) : (
                    <NoData text="Нет подтверждённых данных" />
                  )}
                  {outlook.trajectory.investmentExpectation ? (
                    <CompactRow
                      item={outlook.trajectory.investmentExpectation}
                      caption="Ожидание / план 2026"
                      profileKey="invest2026"
                    />
                  ) : (
                    <NoData text="Нет подтверждённых данных" />
                  )}
                  <p className="outlook-hint">
                    Ожидание на 2026 год; не показатель фактического роста инвестиций.
                  </p>
                </article>

                <article className="outlook-exec-card">
                  <h3>Расширение сырьевой базы</h3>
                  {outlook.industryOutlook.coalPlots ? (
                    <CompactRow
                      item={outlook.industryOutlook.coalPlots}
                      caption="планируется выставить на аукцион до конца 2026 года"
                      profileKey="coalPlots"
                    />
                  ) : (
                    <NoData text="Нет подтвержденного плана по угольным участкам." />
                  )}
                </article>
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Кейс производителя</p>
                  <h2>Богатырь Комир</h2>
                </div>
                {outlook.bogatyrCase.program ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={outlook.bogatyrCase.program.status} />
                    <span className="kpi-period">{outlook.bogatyrCase.program.horizon}</span>
                  </div>
                ) : null}
              </header>
              {outlook.bogatyrCase.actual || outlook.bogatyrCase.plan || outlook.bogatyrCase.target ? (
                <>
                  <div className="outlook-kpi-row">
                    {outlook.bogatyrCase.actual ? (
                      <OutlookMetric item={outlook.bogatyrCase.actual} caption="Добыча 2024" showStatus profileKey="bogatyrActual" />
                    ) : (
                      <NoData text="Нет факта добычи Богатыря за 2024 год." />
                    )}
                    {outlook.bogatyrCase.plan ? (
                      <OutlookMetric item={outlook.bogatyrCase.plan} caption="План добычи 2026" showStatus profileKey="bogatyrPlan" />
                    ) : (
                      <NoData text="Нет плана добычи Богатыря на 2026 год." />
                    )}
                    {outlook.bogatyrCase.target ? (
                      <OutlookMetric
                        item={outlook.bogatyrCase.target}
                        caption="Целевой показатель 2032"
                        showStatus
                        profileKey="bogatyrTarget"
                      />
                    ) : (
                      <NoData text="Нет целевого показателя Богатыря на 2032 год." />
                    )}
                  </div>
                  {outlook.bogatyrCase.actual && outlook.bogatyrCase.plan && outlook.bogatyrCase.target ? (
                    <div className="chart-box outlook-chart is-compact">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            {
                              year: outlook.bogatyrCase.actual.period,
                              value: outlook.bogatyrCase.actual.value,
                              status: outlook.bogatyrCase.actual.status,
                            },
                            {
                              year: outlook.bogatyrCase.plan.period,
                              value: outlook.bogatyrCase.plan.value,
                              status: outlook.bogatyrCase.plan.status,
                            },
                            {
                              year: outlook.bogatyrCase.target.period,
                              value: outlook.bogatyrCase.target.value,
                              status: outlook.bogatyrCase.target.status,
                            },
                          ]}
                          margin={{ top: 28, right: 18, left: 4, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis dataKey="year" stroke={chart.axis} tick={{ fontSize: 11 }} />
                          <YAxis
                            stroke={chart.axis}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => formatNumber(Number(value))}
                            domain={[(min) => Math.floor(min - 3), (max) => Math.ceil(max + 3)]}
                          />
                          <Tooltip
                            contentStyle={getChartTooltipStyle()}
                            formatter={(value, _name, ctx) => [
                              value == null ? '—' : `${formatNumber(Number(value))} млн т`,
                              ctx?.payload?.status || 'Контрольная точка',
                            ]}
                          />
                          <Line
                            type="linear"
                            dataKey="value"
                            stroke="rgba(94, 234, 209, 0.45)"
                            strokeWidth={1.5}
                            strokeDasharray="5 7"
                            dot={<BogatyrDot />}
                            activeDot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                  <p className="outlook-hint">
                    Три официальные контрольные точки 2024 / 2026 / 2032. Промежуточные годы не рассчитывались и
                    не добавлялись.
                  </p>
                  {outlook.bogatyrCase.capacity ? (
                    <p className="outlook-hint">
                      Отдельно: {metricValue(outlook.bogatyrCase.capacity)} {outlook.bogatyrCase.capacity.unit} —
                      заявленная производственная мощность из отдельного корпоративного источника.{' '}
                      <QuietSource sourceId={outlook.bogatyrCase.capacity.sourceId} />
                    </p>
                  ) : null}
                  {outlook.bogatyrCase.investment ? (
                    <OutlookMetric
                      item={outlook.bogatyrCase.investment}
                      caption="Инвестиционная программа до 2032 года"
                      showStatus
                      profileKey="bogatyrInvestment"
                    />
                  ) : (
                    <NoData text="Нет инвестиционной программы Богатыря." />
                  )}
                  <p className="outlook-kicker outlook-kicker-inline">Меры программы</p>
                  {outlook.bogatyrCase.measures.length === 0 ? (
                    <NoData text="Нет подтвержденных мер Богатыря." />
                  ) : (
                    <ul className="outlook-measure-list is-compact">
                      {outlook.bogatyrCase.measures.map((item) => (
                        <li key={item.id}>
                          <h3>{item.name}</h3>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NoData text="Нет подтвержденных показателей добычи Богатырь Комир." />
              )}
            </section>

            <section className="outlook-section" id="outlook-rail-detail" tabIndex={-1}>
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Инфраструктура</p>
                  <h2>Логистика</h2>
                </div>
              </header>
              <div className="outlook-logistics">
                {outlook.industryOutlook.gondolas ? (
                  <OutlookMetric
                    item={outlook.industryOutlook.gondolas}
                    caption="Дополнительное обеспечение полувагонами для будущей перевозочной потребности"
                    showStatus
                    profileKey="gondolas"
                  />
                ) : (
                  <NoData text="Нет подтвержденного показателя по полувагонам." />
                )}
                {outlook.industryOutlook.railMeasure ? (
                  <article className="outlook-chip outlook-chip-inline">
                    <h3>{outlook.industryOutlook.railMeasure.name}</h3>
                    <p>Качественная мера. Бюджет в подтверждённых данных не выделен.</p>
                    <QuietSource sourceId={outlook.industryOutlook.railMeasure.sourceId} />
                  </article>
                ) : null}
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Выводы</p>
                  <h2>Что это означает для рынка</h2>
                </div>
              </header>
              <div className="outlook-insight-grid">
                <article className="outlook-insight" id="outlook-constraints-detail" tabIndex={-1}>
                  <h3>Добыча</h3>
                  <p>План на 2026 год выше фактического уровня 2025 года.</p>
                </article>
                <article className="outlook-insight">
                  <h3>Спрос</h3>
                  <p>
                    Новые мощности угольной генерации формируют дополнительную долгосрочную потребность в
                    энергетическом угле.
                  </p>
                </article>
                <article className="outlook-insight">
                  <h3>Капитал и мощности</h3>
                  <p>
                    Ожидаемые отраслевые инвестиции 2026 года выше фактического показателя 2025 года, а крупные
                    производители заявляют программы расширения.
                  </p>
                </article>
                <article className="outlook-insight">
                  <h3>Ограничения реализации</h3>
                  <p>
                    Железнодорожная логистика остаётся условием обеспечения будущего спроса. Плановые и целевые
                    показатели не гарантируют фактический результат.
                  </p>
                </article>
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Национальный проект</p>
                  <h2>
                    {outlook.nationalProject?.program.name || 'Национальный проект генерации'}
                  </h2>
                </div>
                {outlook.nationalProject ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={outlook.nationalProject.program.status} />
                    <span className="kpi-period">{outlook.nationalProject.program.horizon}</span>
                    <QuietSource sourceId={outlook.nationalProject.program.sourceId} />
                  </div>
                ) : null}
              </header>
              <SectionError error={outlook.phase2Error.projects} />
              {outlook.nationalProject ? (
                <>
                  <div className="outlook-mini-kpis">
                    {outlook.nationalProject.indicators.map((item) => (
                      <OutlookMetric
                        key={item.id}
                        item={item}
                        profileKey={
                          item.indicator_kind === 'capacity'
                            ? 'generationCapacity'
                            : item.indicator_kind === 'count' && String(item.label || '').toLowerCase().includes('нов')
                              ? 'generationNew'
                              : item.indicator_kind === 'count'
                                ? 'generationModernize'
                                : null
                        }
                      />
                    ))}
                  </div>
                  <h3>Новые электростанции</h3>
                  {outlook.nationalProject.projects.length === 0 ? (
                    <NoData text="Нет подтвержденных данных по новым объектам генерации." />
                  ) : (
                    <>
                      <div className="chart-box outlook-chart is-national">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={outlook.nationalProject.projects.filter((item) => item.capacity_mw != null)}
                            layout="vertical"
                            margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis
                              type="number"
                              stroke={chart.axis}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => formatNumber(Number(value))}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke={chart.axis}
                              width={148}
                              interval={0}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={getChartTooltipStyle()}
                              formatter={(value) => [
                                value == null ? '—' : `${formatNumber(Number(value))} МВт`,
                                'Мощность',
                              ]}
                            />
                            <Bar dataKey="capacity_mw" fill="#b08932" radius={[0, 4, 4, 0]} maxBarSize={18}>
                              <LabelList
                                dataKey="capacity_mw"
                                position="right"
                                fill="#c9d6e8"
                                fontSize={11}
                                formatter={(value) => (value == null ? '' : formatNumber(Number(value)))}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="chart-hint">Мощность, МВт. Показаны только новые объекты.</p>
                      <div className="table-wrap outlook-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Объект</th>
                              <th>Площадка</th>
                              <th className="num">Мощность, МВт</th>
                            </tr>
                          </thead>
                          <tbody>
                            {outlook.nationalProject.projects.map((item) => (
                              <tr key={item.id}>
                                <td>{item.name}</td>
                                <td>{item.location_name || '—'}</td>
                                <td className="num">
                                  {item.capacity_mw == null ? '—' : formatNumber(item.capacity_mw)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="outlook-hint">
                        Перечень 11 модернизируемых станций в подтверждённых данных отсутствует.
                      </p>
                    </>
                  )}
                </>
              ) : (
                <NoData text="Нет подтвержденных данных по национальному проекту генерации." />
              )}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Шубарколь</p>
                  <h2>
                    {outlook.producerCase.program?.companyName ||
                      outlook.producerCase.program?.name ||
                      'Кейс производителя'}
                  </h2>
                </div>
                {outlook.producerCase.program ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={outlook.producerCase.program.status} />
                    <span className="kpi-period">{outlook.producerCase.program.horizon}</span>
                    <QuietSource sourceId={outlook.producerCase.program.sourceId} />
                  </div>
                ) : null}
              </header>
              {!outlook.producerCase.program ? (
                <NoData text="Нет подтвержденной инвестиционной стратегии предприятия." />
              ) : null}
              <div className="outlook-kpi-row two">
                {outlook.producerCase.plan ? (
                  <OutlookMetric item={outlook.producerCase.plan} caption="План добычи 2026" />
                ) : (
                  <NoData text="Нет плана добычи предприятия." />
                )}
                {outlook.producerCase.capacity ? (
                  <OutlookMetric item={outlook.producerCase.capacity} caption="Производственная мощность" />
                ) : (
                  <NoData text="Нет указанной производственной мощности предприятия." />
                )}
              </div>
              {outlook.producerCase.plan && outlook.producerCase.capacity ? (
                <p className="outlook-hint">
                  {metricValue(outlook.producerCase.plan)} {outlook.producerCase.plan.unit} — план добычи на{' '}
                  {outlook.producerCase.plan.period} год. {metricValue(outlook.producerCase.capacity)}{' '}
                  {outlook.producerCase.capacity.unit} — указанная производственная мощность. Метрики не
                  суммируются.
                </p>
              ) : null}
              {outlook.producerCase.investmentParent ? (
                <div className="outlook-invest">
                  <OutlookMetric
                    item={outlook.producerCase.investmentParent}
                    caption="Инвестиционная стратегия"
                  />
                  <CompositionBar
                    parent={outlook.producerCase.investmentParent}
                    parts={outlook.producerCase.investmentParts}
                  />
                </div>
              ) : (
                <NoData text="Нет подтвержденных инвестиционных показателей стратегии." />
              )}
              <h3>Технологические меры</h3>
              {outlook.producerCase.measures.length === 0 ? (
                <NoData text="Нет подтвержденных мер предприятия." />
              ) : (
                <ul className="outlook-measure-list is-compact">
                  {outlook.producerCase.measures.map((item) => (
                    <li key={item.id}>
                      <h3>{item.name}</h3>
                      {publicCopy(item.description) ? (
                        <p className="outlook-hint">{publicCopy(item.description)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Отопительный сезон</p>
                  <h2>{outlook.heating?.program.name || 'Отопительный сезон'}</h2>
                </div>
                {outlook.heating ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status="СЕЗОННАЯ ПОТРЕБНОСТЬ" />
                    <span className="kpi-period">{outlook.heating.program.horizon}</span>
                    <QuietSource sourceId={outlook.heating.program.sourceId} />
                  </div>
                ) : null}
              </header>
              <SectionError error={outlook.phase2Error.indicators} />
              {outlook.heating ? (
                <>
                  <p className="outlook-lead">
                    Потребность населения и коммунально-бытового сектора на отопительный сезон; не общий
                    внутренний рынок.
                  </p>
                  {outlook.heating.total ? (
                    <OutlookMetric item={outlook.heating.total} caption="Общая потребность" />
                  ) : (
                    <NoData text="Нет общей сезонной потребности." />
                  )}
                  <p className="outlook-kicker outlook-kicker-inline">Инфраструктура реализации</p>
                  <div className="outlook-kpi-row two outlook-infra">
                    {outlook.heating.infrastructure.map((item) => (
                      <OutlookMetric key={item.id} item={item} />
                    ))}
                  </div>
                </>
              ) : (
                <NoData text="Нет подтвержденных данных по отопительному сезону." />
              )}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Углехимия</p>
                  <h2>
                    {outlook.chemistry
                      ? `Направления развития ${outlook.chemistry.program.horizon}`
                      : 'Направления развития'}
                  </h2>
                </div>
                {outlook.chemistry ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={outlook.chemistry.program.status} />
                    <QuietSource sourceId={outlook.chemistry.program.sourceId} />
                  </div>
                ) : null}
              </header>
              <SectionError error={outlook.phase2Error.directions} />
              {outlook.chemistry ? (
                <>
                  <p className="outlook-lead">
                    Стратегические направления глубокой переработки; количественные прогнозы не указаны.
                  </p>
                  {outlook.chemistry.directions.length === 0 ? (
                    <NoData text="Нет подтвержденных направлений углехимии." />
                  ) : (
                    <div className="chemistry-grid">
                      {outlook.chemistry.directions.map((item) => (
                        <article key={item.id} className="outlook-chip">
                          <h3>{item.name}</h3>
                          {item.description ? <p>{item.description}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                  <h3>Подтверждённая мера</h3>
                  {outlook.chemistry.measures.length === 0 ? (
                    <NoData text="Нет подтвержденных мер дорожной карты." />
                  ) : (
                    <ul className="outlook-measure-list is-compact">
                      {outlook.chemistry.measures.map((item) => (
                        <li key={item.id}>
                          <h3>{item.name}</h3>
                          {publicCopy(item.description) ? (
                            <p className="outlook-hint">{publicCopy(item.description)}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NoData text="Нет подтвержденных данных по углехимии." />
              )}
            </section>

            <section className="outlook-section is-watch">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Мониторинг</p>
                  <h2>Показатели для дальнейшего мониторинга</h2>
                </div>
              </header>
              <p className="outlook-lead">
                Перечень тем наблюдения. Это не прогноз и не утверждение будущего результата.
              </p>
              <ul className="outlook-watch">
                <li>Фактическая добыча относительно плана 2026 года</li>
                <li>Реализация проектов новой генерации</li>
                <li>Динамика инвестиций</li>
                <li>Обеспечение сезонной потребности</li>
                <li>Развитие глубокой переработки угля</li>
                <li>Изменение структуры внутреннего спроса и экспорта</li>
                <li>Обеспечение дополнительной перевозочной потребности</li>
                <li>Аукцион прав недропользования по угольным участкам</li>
              </ul>
            </section>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
