import { getOutlook } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { useSources } from '../context/SourceContext'
import { TargetMonitor } from '../components/intelligence/TargetMonitor'
import { MetricTraceButton } from '../components/traceability/MetricTraceButton'
import { LoadErrorState, NoData, PageHeader, StateBlock, StatusBadge } from '../components/ui'
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
  const chart = useChartTheme()
  const { data, loading, error, reload } = useMarketData(getOutlook)
  const generationCapacity = data?.nationalProject?.indicators.find(
    (item) => item.indicator_kind === 'capacity',
  )

  return (
    <section className="outlook-page">
      <PageHeader
        title="Перспективы и развитие"
        description="Подтверждённые планы, ожидания и программы. План и ожидание не являются фактом."
      />
      <StateBlock loading={loading} error={error} empty={!data} skeleton="cards" onRetry={reload}>
        {data ? (
          <>
            <section className="outlook-section outlook-hero is-exec">
              <SectionError error={data.phase1Error.production || data.phase2Error.indicators} />
              <div className="outlook-exec-track">
                <article className="outlook-exec-point">
                  <p className="outlook-year">2025</p>
                  <StatusBadge status="ФАКТ" />
                  {data.trajectory.actualExtraction ? (
                    <>
                      <p className="outlook-metric-value">
                        {metricValue(data.trajectory.actualExtraction)}
                        <span>{data.trajectory.actualExtraction.unit}</span>
                        <QuietSource sourceId={data.trajectory.actualExtraction.sourceId} />
                      </p>
                      <p className="outlook-metric-caption">Добыча Казахстана</p>
                      <MetricTraceButton
                        item={data.trajectory.actualExtraction}
                        extras={{ profileKey: 'production2025', route: '/production' }}
                      />
                    </>
                  ) : (
                    <NoData text="Нет факта добычи 2025 года." />
                  )}
                </article>
                <div className="outlook-arrow" aria-hidden="true">
                  →
                </div>
                <article className="outlook-exec-point">
                  <p className="outlook-year">2026</p>
                  <StatusBadge status="ПЛАН" />
                  {data.trajectory.plannedExtraction ? (
                    <>
                      <p className="outlook-metric-value">
                        {metricValue(data.trajectory.plannedExtraction)}
                        <span>{data.trajectory.plannedExtraction.unit}</span>
                        <QuietSource sourceId={data.trajectory.plannedExtraction.sourceId} />
                      </p>
                      <p className="outlook-metric-caption">Добыча Казахстана</p>
                      <MetricTraceButton
                        item={data.trajectory.plannedExtraction}
                        extras={{ profileKey: 'plan2026', route: '/outlook', measureKind: 'plan' }}
                      />
                    </>
                  ) : (
                    <NoData text="Нет плана добычи 2026 года." />
                  )}
                </article>
                <div className="outlook-arrow" aria-hidden="true">
                  →
                </div>
                <article className="outlook-exec-point">
                  <p className="outlook-year">2030+</p>
                  <p className="outlook-stage-label">Стратегический горизонт</p>
                  {generationCapacity ? (
                    <>
                      <p className="outlook-metric-value">
                        {metricValue(generationCapacity)}
                        <span>{generationCapacity.unit}</span>
                        <QuietSource sourceId={generationCapacity.sourceId} />
                      </p>
                      <p className="outlook-metric-caption">
                        новых и модернизированных мощностей угольной генерации
                      </p>
                      <MetricTraceButton
                        item={generationCapacity}
                        extras={{ profileKey: 'generationCapacity', route: '/outlook' }}
                      />
                    </>
                  ) : (
                    <NoData text="Нет подтвержденного показателя мощностей генерации." />
                  )}
                </article>
              </div>
              <p className="outlook-exec-line">
                Официальные планы указывают на расширение добычи и сохранение долгосрочного спроса со
                стороны угольной генерации, однако плановые и целевые показатели не гарантируют фактический
                результат.
              </p>
            </section>

            <TargetMonitor pack={data.targetMonitor} />

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
                <article className="outlook-exec-card">
                  <h3>Добыча</h3>
                  {data.trajectory.actualExtraction ? (
                    <CompactRow
                      item={data.trajectory.actualExtraction}
                      caption="Факт 2025 · Минэнерго"
                      profileKey="production2025"
                    />
                  ) : (
                    <NoData text="Нет подтверждённых данных" />
                  )}
                  {data.trajectory.plannedExtraction ? (
                    <CompactRow
                      item={data.trajectory.plannedExtraction}
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

                <article className="outlook-exec-card">
                  <h3>Будущий спрос</h3>
                  {data.industryOutlook.additionalDemand ? (
                    <CompactRow
                      item={data.industryOutlook.additionalDemand}
                      caption="дополнительный спрос на энергетический уголь к 2030 году"
                      profileKey="demand2030"
                    />
                  ) : (
                    <NoData text="Нет подтвержденного показателя дополнительного спроса." />
                  )}
                  {data.industryOutlook.energyNeed ? (
                    <CompactRow
                      item={data.industryOutlook.energyNeed}
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
                  {data.trajectory.investmentFact ? (
                    <CompactRow item={data.trajectory.investmentFact} caption="Факт 2025" profileKey="invest2025" />
                  ) : (
                    <NoData text="Нет подтверждённых данных" />
                  )}
                  {data.trajectory.investmentExpectation ? (
                    <CompactRow
                      item={data.trajectory.investmentExpectation}
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
                  {data.industryOutlook.coalPlots ? (
                    <CompactRow
                      item={data.industryOutlook.coalPlots}
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
                {data.bogatyrCase.program ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={data.bogatyrCase.program.status} />
                    <span className="kpi-period">{data.bogatyrCase.program.horizon}</span>
                  </div>
                ) : null}
              </header>
              {data.bogatyrCase.actual || data.bogatyrCase.plan || data.bogatyrCase.target ? (
                <>
                  <div className="outlook-kpi-row">
                    {data.bogatyrCase.actual ? (
                      <OutlookMetric item={data.bogatyrCase.actual} caption="Добыча 2024" showStatus profileKey="bogatyrActual" />
                    ) : (
                      <NoData text="Нет факта добычи Богатыря за 2024 год." />
                    )}
                    {data.bogatyrCase.plan ? (
                      <OutlookMetric item={data.bogatyrCase.plan} caption="План добычи 2026" showStatus profileKey="bogatyrPlan" />
                    ) : (
                      <NoData text="Нет плана добычи Богатыря на 2026 год." />
                    )}
                    {data.bogatyrCase.target ? (
                      <OutlookMetric
                        item={data.bogatyrCase.target}
                        caption="Целевой показатель 2032"
                        showStatus
                        profileKey="bogatyrTarget"
                      />
                    ) : (
                      <NoData text="Нет целевого показателя Богатыря на 2032 год." />
                    )}
                  </div>
                  {data.bogatyrCase.actual && data.bogatyrCase.plan && data.bogatyrCase.target ? (
                    <div className="chart-box outlook-chart is-compact">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            {
                              year: data.bogatyrCase.actual.period,
                              value: data.bogatyrCase.actual.value,
                              status: data.bogatyrCase.actual.status,
                            },
                            {
                              year: data.bogatyrCase.plan.period,
                              value: data.bogatyrCase.plan.value,
                              status: data.bogatyrCase.plan.status,
                            },
                            {
                              year: data.bogatyrCase.target.period,
                              value: data.bogatyrCase.target.value,
                              status: data.bogatyrCase.target.status,
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
                  {data.bogatyrCase.capacity ? (
                    <p className="outlook-hint">
                      Отдельно: {metricValue(data.bogatyrCase.capacity)} {data.bogatyrCase.capacity.unit} —
                      заявленная производственная мощность из отдельного корпоративного источника.{' '}
                      <QuietSource sourceId={data.bogatyrCase.capacity.sourceId} />
                    </p>
                  ) : null}
                  {data.bogatyrCase.investment ? (
                    <OutlookMetric
                      item={data.bogatyrCase.investment}
                      caption="Инвестиционная программа до 2032 года"
                      showStatus
                      profileKey="bogatyrInvestment"
                    />
                  ) : (
                    <NoData text="Нет инвестиционной программы Богатыря." />
                  )}
                  <p className="outlook-kicker outlook-kicker-inline">Меры программы</p>
                  {data.bogatyrCase.measures.length === 0 ? (
                    <NoData text="Нет подтвержденных мер Богатыря." />
                  ) : (
                    <ul className="outlook-measure-list is-compact">
                      {data.bogatyrCase.measures.map((item) => (
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

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Инфраструктура</p>
                  <h2>Логистика</h2>
                </div>
              </header>
              <div className="outlook-logistics">
                {data.industryOutlook.gondolas ? (
                  <OutlookMetric
                    item={data.industryOutlook.gondolas}
                    caption="Дополнительное обеспечение полувагонами для будущей перевозочной потребности"
                    showStatus
                    profileKey="gondolas"
                  />
                ) : (
                  <NoData text="Нет подтвержденного показателя по полувагонам." />
                )}
                {data.industryOutlook.railMeasure ? (
                  <article className="outlook-chip outlook-chip-inline">
                    <h3>{data.industryOutlook.railMeasure.name}</h3>
                    <p>Качественная мера. Бюджет в подтверждённых данных не выделен.</p>
                    <QuietSource sourceId={data.industryOutlook.railMeasure.sourceId} />
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
                <article className="outlook-insight">
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
                    {data.nationalProject?.program.name || 'Национальный проект генерации'}
                  </h2>
                </div>
                {data.nationalProject ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={data.nationalProject.program.status} />
                    <span className="kpi-period">{data.nationalProject.program.horizon}</span>
                    <QuietSource sourceId={data.nationalProject.program.sourceId} />
                  </div>
                ) : null}
              </header>
              <SectionError error={data.phase2Error.projects} />
              {data.nationalProject ? (
                <>
                  <div className="outlook-mini-kpis">
                    {data.nationalProject.indicators.map((item) => (
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
                  {data.nationalProject.projects.length === 0 ? (
                    <NoData text="Нет подтвержденных данных по новым объектам генерации." />
                  ) : (
                    <>
                      <div className="chart-box outlook-chart is-national">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.nationalProject.projects.filter((item) => item.capacity_mw != null)}
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
                            {data.nationalProject.projects.map((item) => (
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
                    {data.producerCase.program?.companyName ||
                      data.producerCase.program?.name ||
                      'Кейс производителя'}
                  </h2>
                </div>
                {data.producerCase.program ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={data.producerCase.program.status} />
                    <span className="kpi-period">{data.producerCase.program.horizon}</span>
                    <QuietSource sourceId={data.producerCase.program.sourceId} />
                  </div>
                ) : null}
              </header>
              {!data.producerCase.program ? (
                <NoData text="Нет подтвержденной инвестиционной стратегии предприятия." />
              ) : null}
              <div className="outlook-kpi-row two">
                {data.producerCase.plan ? (
                  <OutlookMetric item={data.producerCase.plan} caption="План добычи 2026" />
                ) : (
                  <NoData text="Нет плана добычи предприятия." />
                )}
                {data.producerCase.capacity ? (
                  <OutlookMetric item={data.producerCase.capacity} caption="Производственная мощность" />
                ) : (
                  <NoData text="Нет указанной производственной мощности предприятия." />
                )}
              </div>
              {data.producerCase.plan && data.producerCase.capacity ? (
                <p className="outlook-hint">
                  {metricValue(data.producerCase.plan)} {data.producerCase.plan.unit} — план добычи на{' '}
                  {data.producerCase.plan.period} год. {metricValue(data.producerCase.capacity)}{' '}
                  {data.producerCase.capacity.unit} — указанная производственная мощность. Метрики не
                  суммируются.
                </p>
              ) : null}
              {data.producerCase.investmentParent ? (
                <div className="outlook-invest">
                  <OutlookMetric
                    item={data.producerCase.investmentParent}
                    caption="Инвестиционная стратегия"
                  />
                  <CompositionBar
                    parent={data.producerCase.investmentParent}
                    parts={data.producerCase.investmentParts}
                  />
                </div>
              ) : (
                <NoData text="Нет подтвержденных инвестиционных показателей стратегии." />
              )}
              <h3>Технологические меры</h3>
              {data.producerCase.measures.length === 0 ? (
                <NoData text="Нет подтвержденных мер предприятия." />
              ) : (
                <ul className="outlook-measure-list is-compact">
                  {data.producerCase.measures.map((item) => (
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
                  <h2>{data.heating?.program.name || 'Отопительный сезон'}</h2>
                </div>
                {data.heating ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status="СЕЗОННАЯ ПОТРЕБНОСТЬ" />
                    <span className="kpi-period">{data.heating.program.horizon}</span>
                    <QuietSource sourceId={data.heating.program.sourceId} />
                  </div>
                ) : null}
              </header>
              <SectionError error={data.phase2Error.indicators} />
              {data.heating ? (
                <>
                  <p className="outlook-lead">
                    Потребность населения и коммунально-бытового сектора на отопительный сезон; не общий
                    внутренний рынок.
                  </p>
                  {data.heating.total ? (
                    <OutlookMetric item={data.heating.total} caption="Общая потребность" />
                  ) : (
                    <NoData text="Нет общей сезонной потребности." />
                  )}
                  <p className="outlook-kicker outlook-kicker-inline">Инфраструктура реализации</p>
                  <div className="outlook-kpi-row two outlook-infra">
                    {data.heating.infrastructure.map((item) => (
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
                    {data.chemistry
                      ? `Направления развития ${data.chemistry.program.horizon}`
                      : 'Направления развития'}
                  </h2>
                </div>
                {data.chemistry ? (
                  <div className="outlook-stage-meta">
                    <StatusBadge status={data.chemistry.program.status} />
                    <QuietSource sourceId={data.chemistry.program.sourceId} />
                  </div>
                ) : null}
              </header>
              <SectionError error={data.phase2Error.directions} />
              {data.chemistry ? (
                <>
                  <p className="outlook-lead">
                    Стратегические направления глубокой переработки; количественные прогнозы не указаны.
                  </p>
                  {data.chemistry.directions.length === 0 ? (
                    <NoData text="Нет подтвержденных направлений углехимии." />
                  ) : (
                    <div className="chemistry-grid">
                      {data.chemistry.directions.map((item) => (
                        <article key={item.id} className="outlook-chip">
                          <h3>{item.name}</h3>
                          {item.description ? <p>{item.description}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                  <h3>Подтверждённая мера</h3>
                  {data.chemistry.measures.length === 0 ? (
                    <NoData text="Нет подтвержденных мер дорожной карты." />
                  ) : (
                    <ul className="outlook-measure-list is-compact">
                      {data.chemistry.measures.map((item) => (
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
