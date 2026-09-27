import { useEffect, useState } from 'react'
import { useFilters } from '../context/FilterContext'
import { getPriceDynamics } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { NoData, PageHeader, QuietSource, StateBlock, StatusBadge, SourceButton } from '../components/ui'
import { chartTooltipStyle, formatNumber } from '../lib/format'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatKzt(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const digits = Number.isInteger(value) ? 0 : undefined
  return formatNumber(value, digits)
}

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="dynamics-tooltip">
      <p className="dynamics-tooltip-period">{label}</p>
      {payload
        .filter((item) => item.value != null)
        .map((item) => (
          <p key={item.dataKey}>
            <span style={{ color: item.color }}>{item.name}</span>
            {': '}
            {formatKzt(Number(item.value))} тг/т
            <em>без НДС</em>
          </p>
        ))}
    </div>
  )
}

function WeightedChart({ pack }) {
  if (!pack?.rows?.length) {
    return <NoData text="Нет подтвержденных данных по средневзвешенным ценам выбранного сегмента." />
  }
  return (
    <div className="chart-box dynamics-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pack.rows} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="period" stroke="#7d8ca3" tick={{ fill: '#7d8ca3', fontSize: 12 }} />
          <YAxis
            stroke="#7d8ca3"
            tick={{ fill: '#7d8ca3', fontSize: 11 }}
            width={64}
            tickFormatter={(value) => formatKzt(Number(value))}
          />
          <Tooltip content={<PriceTooltip />} contentStyle={chartTooltipStyle} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#8b9bb3', paddingTop: 8 }}
            iconType="plainline"
          />
          {pack.series.map((item) => (
            <Line
              key={item.key}
              type="linear"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              strokeWidth={2}
              dot={{ r: 3, fill: item.color, stroke: '#0f1624', strokeWidth: 1 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DynamicsPage() {
  const { filters } = useFilters()
  const { data, loading, error, reload } = useMarketData(getPriceDynamics, filters)
  const globalSegment = filters.coalType ?? 'all'
  const [localSegment, setLocalSegment] = useState('energy')

  useEffect(() => {
    if (globalSegment === 'energy' || globalSegment === 'household') {
      setLocalSegment(globalSegment)
    }
  }, [globalSegment])

  const chartSegment =
    globalSegment === 'energy' || globalSegment === 'household' ? globalSegment : localSegment
  const showSwitcher = globalSegment === 'all'
  const historyWorkspace =
    globalSegment === 'all' || globalSegment === 'energy' || globalSegment === 'household'
  const weighted = chartSegment === 'household' ? data?.history?.household : data?.history?.energy
  const showBogatyr = globalSegment === 'all' || globalSegment === 'energy'
  const showSiding = globalSegment === 'all' || globalSegment === 'household'

  return (
    <section className="dynamics-page">
      <PageHeader
        title="Динамика цен"
        description="Накопленный рост цен при первичной оптовой реализации по данным АЗРК за 2022–2025 годы. Исторические средневзвешенные цены 2018 — I пол. 2022 приведены отдельно и не образуют единый ряд с 2022–2025."
      />
      <StateBlock
        loading={loading}
        error={error}
        empty={!data?.items?.length && !historyWorkspace}
        emptyText={data?.emptyNote || 'Нет подтвержденных данных'}
        skeleton="chart"
        onRetry={reload}
      >
        {data?.items?.length ? (
          <div
            data-dynamics-origin={data.dynamicsDataOrigin}
            data-prices-count={data.pricesRemoteCount ?? ''}
          >
            <p className="callout">{data.disclaimer}</p>
            <div className="split">
              {data.items.map((item) => (
                <article key={item.id} className="panel">
                  <div className="kpi-top">
                    <StatusBadge status={item.status} />
                    <SourceButton sourceId={item.sourceId} />
                  </div>
                  <h2>{item.segment}</h2>
                  <p className="hero-value">{item.display}</p>
                  <p className="kpi-period">{data.disclaimer}</p>
                  <div className="range-track" aria-hidden="true">
                    <span className="range-fill" style={{ width: `${(item.max / 50) * 100}%` }} />
                    {item.min !== item.max ? (
                      <span
                        className="range-band"
                        style={{
                          left: `${(item.min / 50) * 100}%`,
                          width: `${((item.max - item.min) / 50) * 100}%`,
                        }}
                      />
                    ) : null}
                  </div>
                  <p className="kpi-note">{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {historyWorkspace ? (
          <>
            <section className="panel dynamics-history">
              <div className="panel-head">
                <h2>Историческая динамика средневзвешенных цен</h2>
                <QuietSource sourceId={data?.sourceId || 'azrkCompetition2022'} />
              </div>
              {showSwitcher ? (
                <div className="company-selector dynamics-switch" role="tablist" aria-label="Сегмент исторического графика">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={chartSegment === 'energy'}
                    className={chartSegment === 'energy' ? 'is-active' : undefined}
                    onClick={() => setLocalSegment('energy')}
                  >
                    Энергетический уголь
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={chartSegment === 'household'}
                    className={chartSegment === 'household' ? 'is-active' : undefined}
                    onClick={() => setLocalSegment('household')}
                  >
                    Коммунально-бытовой
                  </button>
                </div>
              ) : (
                <p className="scope-badge">
                  {chartSegment === 'household' ? 'Коммунально-бытовой уголь' : 'Энергетический уголь'}
                </p>
              )}
              <WeightedChart pack={weighted} />
              <p className="chart-hint">Ось Y: тенге за 1 тонну без НДС. Точки не интерполируются.</p>
            </section>

            <article className="panel dynamics-method">
              <h2>Как читать ряд</h2>
              <p>
                Исторический график показывает средневзвешенные цены отдельных угледобывающих
                предприятий, опубликованные АЗРК, в тенге за тонну без НДС. I пол. 2022 является
                полугодовым наблюдением и не должно интерпретироваться как средняя цена за полный
                2022 год.
              </p>
              <p>
                Показатели накопленного роста 2022–2025 приведены АЗРК отдельно и не используются
                для восстановления отсутствующих ежегодных цен.
              </p>
            </article>

            <div className="dynamics-lower">
              {showBogatyr ? (
                <article className="panel">
                  <div className="panel-head">
                    <h2>Отпускная цена Богатырь Комир: изменение во II полугодии 2022</h2>
                    <QuietSource sourceId="azrkCompetition2022" />
                  </div>
                  {data?.history?.bogatyrList?.rows?.length ? (
                    <div className="chart-box compact">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.history.bogatyrList.rows}
                          margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="period" stroke="#7d8ca3" tick={{ fill: '#7d8ca3', fontSize: 11 }} />
                          <YAxis
                            stroke="#7d8ca3"
                            tick={{ fill: '#7d8ca3', fontSize: 11 }}
                            width={56}
                            tickFormatter={(value) => formatKzt(Number(value))}
                          />
                          <Tooltip content={<PriceTooltip />} />
                          <Line
                            type="stepAfter"
                            dataKey="value"
                            name="Богатырь Комир"
                            stroke="#c4a056"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#c4a056', stroke: '#0f1624' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <NoData text="Нет подтвержденных данных по отпускным ценам Богатырь Комир." />
                  )}
                  <p className="kpi-note">
                    Отдельно опубликованные отпускные цены АЗРК. Методологически не объединяются со
                    средневзвешенным рядом выше.
                  </p>
                </article>
              ) : null}

              <article className="panel">
                <div className="panel-head">
                  <h2>Что влияет на конечную цену угля</h2>
                  <QuietSource sourceId="azrkCompetition2022" />
                </div>
                <p className="kpi-note">
                  Факторы, которые АЗРК описывает как влияющие на цену. Источник не присваивает им
                  доли или веса, и страница их не ранжирует.
                </p>
                <ul className="dynamics-factors">
                  <li>марка / качественные характеристики угля</li>
                  <li>фракция</li>
                  <li>зольность</li>
                  <li>расстояние до потребителя / регион реализации</li>
                  <li>транспортные расходы</li>
                  <li>цепочка реализации коммунально-бытового угля через посредников</li>
                </ul>
              </article>
            </div>

            {showSiding ? (
              <article className="panel dynamics-context">
                <div className="kpi-top">
                  <p className="outlook-kicker">2022 · региональный розничный/складской контекст</p>
                  <QuietSource sourceId="azrkCompetition2022" />
                </div>
                {data?.history?.sidingRange ? (
                  <>
                    <p className="hero-value">
                      {formatKzt(data.history.sidingRange.min)}–{formatKzt(data.history.sidingRange.max)}{' '}
                      <span className="kpi-unit">тг/т</span>
                    </p>
                    <p className="kpi-note">
                      Исторический диапазон 2022 года; не является текущей ценой 2026 года. В источнике
                      указано, что цены коммунально-бытового угля на железнодорожных тупиках зависели
                      от региона, марки и фракции. Прямое сравнение с текущими розничными ценами
                      г. Астаны без учёта методологии не выполняется.
                    </p>
                  </>
                ) : (
                  <NoData text="Нет подтвержденных данных по историческому диапазону 2022 года." />
                )}
              </article>
            ) : null}
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
