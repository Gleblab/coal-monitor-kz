import { getOutlook } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { useSources } from '../context/SourceContext'
import { NoData, PageHeader, StateBlock, StatusBadge } from '../components/ui'
import { chartTooltipStyle, formatNumber } from '../lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  return `${item.approx ? '≈ ' : ''}${formatNumber(item.value)}`
}

function QuietSource({ sourceId }) {
  const { openSource } = useSources()
  if (!sourceId) return null
  return (
    <button type="button" className="outlook-source" onClick={() => openSource(sourceId)}>
      Источник
    </button>
  )
}

function OutlookMetric({ item, caption, variant = 'primary' }) {
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
      </p>
    </div>
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
            </p>
            <p className="outlook-hint">Часть показателя выше, не отдельная сумма.</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionError({ error }) {
  if (!error) return null
  return <div className="state-block error">{error}</div>
}

export function OutlookPage() {
  const { data, loading, error } = useMarketData(getOutlook)

  return (
    <section className="outlook-page">
      <PageHeader
        title="Перспективы и развитие"
        description="Подтверждённые планы, ожидания и программы. План и ожидание не являются фактом."
      />
      <StateBlock loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <section className="outlook-section outlook-hero">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Траектория отрасли</p>
                  <h2>2025 → 2026 → 2030+</h2>
                </div>
              </header>
              <p className="outlook-lead">
                Показатели разных лет и уровней стоят рядом для сопоставления статусов. Они не складываются и
                не означают уже произошедший рост.
              </p>
              <div className="outlook-timeline">
                <article className="outlook-stage">
                  <div className="outlook-stage-head">
                    <div>
                      <p className="outlook-year">2025</p>
                      <p className="outlook-stage-label">Факт</p>
                    </div>
                    <div className="outlook-stage-meta">
                      <StatusBadge status="ФАКТ" />
                      <QuietSource
                        sourceId={
                          data.trajectory.actualExtraction?.sourceId ||
                          data.trajectory.investmentFact?.sourceId
                        }
                      />
                    </div>
                  </div>
                  <SectionError error={data.phase1Error.production || data.phase1Error.industry} />
                  {data.trajectory.actualExtraction ? (
                    <OutlookMetric item={data.trajectory.actualExtraction} caption="Добыча" />
                  ) : (
                    <NoData text="Нет данных по добыче." />
                  )}
                  {data.trajectory.investmentFact ? (
                    <OutlookMetric item={data.trajectory.investmentFact} caption="Инвестиции" />
                  ) : (
                    <NoData text="Нет данных по инвестициям." />
                  )}
                </article>

                <div className="outlook-arrow" aria-hidden="true">
                  →
                </div>

                <article className="outlook-stage">
                  <div className="outlook-stage-head">
                    <div>
                      <p className="outlook-year">2026</p>
                      <p className="outlook-stage-label">План / ожидание</p>
                    </div>
                    <div className="outlook-stage-meta">
                      <StatusBadge status="ПЛАН" />
                      <StatusBadge status="ОЖИДАНИЕ" />
                      <QuietSource
                        sourceId={
                          data.trajectory.plannedExtraction?.sourceId ||
                          data.trajectory.investmentExpectation?.sourceId
                        }
                      />
                    </div>
                  </div>
                  {data.trajectory.plannedExtraction ? (
                    <OutlookMetric item={data.trajectory.plannedExtraction} caption="Добыча Казахстана" />
                  ) : (
                    <NoData text="Нет плана добычи." />
                  )}
                  {data.trajectory.investmentExpectation ? (
                    <OutlookMetric
                      item={data.trajectory.investmentExpectation}
                      caption="Ожидаемые инвестиции"
                    />
                  ) : (
                    <NoData text="Нет ожидания по инвестициям." />
                  )}
                  {data.trajectory.companyPlan ? (
                    <OutlookMetric
                      item={data.trajectory.companyPlan}
                      caption="Шубарколь — план предприятия"
                      variant="secondary"
                    />
                  ) : null}
                </article>

                <div className="outlook-arrow" aria-hidden="true">
                  →
                </div>

                <article className="outlook-stage">
                  <div className="outlook-stage-head">
                    <div>
                      <p className="outlook-year">2030+</p>
                      <p className="outlook-stage-label">Стратегический горизонт</p>
                    </div>
                    <div className="outlook-stage-meta">
                      <StatusBadge status="УТВЕРЖДЁННАЯ ПРОГРАММА" />
                      <QuietSource sourceId={data.nationalProject?.program.sourceId} />
                    </div>
                  </div>
                  <SectionError error={data.phase2Error.programs || data.phase2Error.indicators} />
                  {data.nationalProject?.indicators.length ? (
                    data.nationalProject.indicators.map((item) => (
                      <OutlookMetric
                        key={item.id}
                        item={item}
                        variant={item.indicator_kind === 'capacity' ? 'primary' : 'secondary'}
                      />
                    ))
                  ) : (
                    <NoData text="Нет подтвержденных данных по национальному проекту." />
                  )}
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
                  <div className="outlook-kpi-row">
                    {data.nationalProject.indicators.map((item) => (
                      <OutlookMetric key={item.id} item={item} />
                    ))}
                  </div>
                  <h3>Новые электростанции</h3>
                  {data.nationalProject.projects.length === 0 ? (
                    <NoData text="Нет подтвержденных данных по новым объектам генерации." />
                  ) : (
                    <>
                      <div className="chart-box outlook-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.nationalProject.projects.filter((item) => item.capacity_mw != null)}
                            layout="vertical"
                            margin={{ top: 8, right: 56, left: 4, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis
                              type="number"
                              stroke="#8b9bb3"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => formatNumber(Number(value))}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke="#8b9bb3"
                              width={148}
                              interval={0}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={chartTooltipStyle}
                              formatter={(value) => [
                                value == null ? '—' : `${formatNumber(Number(value))} МВт`,
                                'Мощность',
                              ]}
                            />
                            <Bar dataKey="capacity_mw" fill="#c9a227" radius={[0, 4, 4, 0]} maxBarSize={22}>
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
                <p className="outlook-callout">
                  {metricValue(data.producerCase.plan)} {data.producerCase.plan.unit} — план добычи на{' '}
                  {data.producerCase.plan.period} год.
                  <br />
                  {metricValue(data.producerCase.capacity)} {data.producerCase.capacity.unit} — указанная
                  производственная мощность.
                  <br />
                  Метрики не суммируются.
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
                <ul className="outlook-measure-list">
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
                  <CompositionBar parent={data.heating.total} parts={data.heating.parts} />
                  <p className="outlook-kicker outlook-kicker-inline">Инфраструктура реализации</p>
                  <div className="outlook-kpi-row two outlook-infra">
                    {data.heating.infrastructure.map((item) => (
                      <OutlookMetric key={item.id} item={item} variant="secondary" />
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
                    <ul className="outlook-measure-list">
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
              </ul>
            </section>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
