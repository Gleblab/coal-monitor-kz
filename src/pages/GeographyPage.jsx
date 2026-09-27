import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getGeography } from '../api/marketApi'
import { KazakhstanCoalMap } from '../components/KazakhstanCoalMap'
import { NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import { useFilters } from '../context/FilterContext'
import { useMarketData } from '../hooks/useMarketData'
import { getChartTooltipStyle, formatCoalVolume, formatNumber } from '../lib/format'
import { useChartTheme } from '../hooks/useChartTheme'

function InsightCard({ item, caption }) {
  if (!item) return null
  const volume = formatCoalVolume(item.value)
  return (
    <article className="outlook-exec-card">
      <p className="outlook-metric-value is-card">
        {volume.text}
        <span>{volume.unit}</span>
        <QuietSource sourceId={item.sourceId} />
      </p>
      <p className="outlook-metric-caption">{caption}</p>
    </article>
  )
}

export function GeographyPage() {
  const chart = useChartTheme()
  const { filters } = useFilters()
  const { data, loading, error, reload } = useMarketData(getGeography, filters)
  const failed = Boolean(error) || (data && data.ok === false)
  const ready = data?.ok === true

  const byCode = {}
  if (ready) {
    for (const item of data.regional) {
      if (item.regionCode) byCode[item.regionCode] = item
    }
  }

  const rankMax = ready && data.ranking[0] ? data.ranking[0].value : null
  const chartData = ready
    ? data.series.map((row) => ({ year: String(row.year), value: row.value, label: formatNumber(row.value, 1) }))
    : []
  const chartMin = chartData.length ? Math.min(...chartData.map((row) => row.value)) : 0
  const chartMax = chartData.length ? Math.max(...chartData.map((row) => row.value)) : 1

  return (
    <section className="outlook-page geo-page">
      <PageHeader
        title="География и структура добычи"
        description="территориальное распределение и динамика добычи угля в Казахстане по официальным данным."
      />
      <StateBlock
        loading={loading}
        error={failed ? error || data?.error || 'Не удалось загрузить данные географии добычи.' : null}
        empty={!loading && !failed && !ready}
        emptyText="Нет подтвержденных данных"
        skeleton="chart"
        onRetry={reload}
      >
        {ready ? (
          <>
            {filters.region !== 'all' && data.regionSliceMissing ? (
              <p className="outlook-hint">
                Для выбранного региона подтверждённый региональный срез промышленной добычи БНС 2025
                в текущем наборе данных отсутствует. Национальный ряд ниже не относится к этому региону.
              </p>
            ) : null}
            {filters.region !== 'all' && data.insights.selected ? (
              <p className="scope-badge">Срез области: {data.insights.selected.name}</p>
            ) : (
              <p className="scope-badge">Национальный ряд БНС и опубликованные области 2025</p>
            )}

            <section className="outlook-section outlook-hero is-exec">
              <div className="outlook-exec-grid geo-insight-grid">
                <InsightCard item={data.insights.national} caption="Казахстан · БНС · 2025 · национальный показатель" />
                {filters.region === 'all' ? (
                  <>
                    <InsightCard
                      item={data.insights.pavlodar}
                      caption={`${data.insights.pavlodar.name} · 2025`}
                    />
                    <InsightCard
                      item={data.insights.karaganda}
                      caption={`${data.insights.karaganda.name} · 2025`}
                    />
                  </>
                ) : data.insights.selected ? (
                  <InsightCard
                    item={data.insights.selected}
                    caption={`${data.insights.selected.name} · 2025`}
                  />
                ) : (
                  <article className="outlook-exec-card">
                    <NoData
                      text="Для выбранного региона подтверждённый региональный срез этого показателя в текущем наборе данных отсутствует."
                      hint="Национальный ряд ниже не относится к выбранной области."
                    />
                  </article>
                )}
              </div>
            </section>

            <section className="outlook-section">
              <div className="geo-map-layout">
                <div className="geo-map-card">
                  <header className="outlook-section-head">
                    <div>
                      <p className="outlook-kicker">Карта</p>
                      <h2>География добычи угля — 2025</h2>
                    </div>
                    <QuietSource sourceId={data.sourceId} />
                  </header>
                  <p className="outlook-lead">
                Региональное распределение производства по данным БНС. Карта показывает все
                опубликованные области 2025 года и не заполняет отсутствующие значения нулём.
              </p>
                  <KazakhstanCoalMap byCode={byCode} sourceLabel="БНС" />
                </div>
                <aside className="geo-rank-panel">
                  <header className="outlook-section-head">
                    <div>
                      <p className="outlook-kicker">Рейтинг</p>
                      <h2>Крупнейшие регионы добычи</h2>
                    </div>
                  </header>
                  <ul className="geo-rank-list">
                    {data.ranking.length ? data.ranking.map((item) => {
                      const volume = formatCoalVolume(item.value)
                      return (
                        <li key={item.id}>
                          <div className="geo-rank-meta">
                            <span>{item.name}</span>
                            <strong>
                              {volume.text} {volume.unit}
                            </strong>
                          </div>
                          <div className="geo-rank-track" aria-hidden="true">
                            <span
                              style={{
                                width: rankMax ? `${Math.max(4, (item.value / rankMax) * 100)}%` : '0%',
                              }}
                            />
                          </div>
                        </li>
                      )
                    }) : (
                      <li>
                        <NoData
                          text="Для выбранного региона подтверждённый региональный срез промышленной добычи БНС 2025 отсутствует."
                        />
                      </li>
                    )}
                  </ul>
                  {data.twoRegionShare != null && data.insights.pavlodar && data.insights.karaganda ? (
                    <p className="outlook-calc">
                      {data.insights.pavlodar.name} и {data.insights.karaganda.name} вместе составляют{' '}
                      {formatNumber(data.twoRegionShare, 1)}% республиканского итога промышленной
                      статистики БНС за 2025 год. Территориальная концентрация добычи выражена: два
                      региона формируют основную часть учтённого объёма.
                      <span>Расчёт Coal Monitor KZ на основе данных БНС</span>
                    </p>
                  ) : null}
                </aside>
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Динамика</p>
                  <h2>Динамика добычи угля — 2020–2025</h2>
                </div>
                <QuietSource sourceId={data.sourceId} />
              </header>
              <p className="scope-badge">Национальный ряд БНС · 2020–2025</p>
              <div className="chart-box outlook-chart geo-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 18, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="year" stroke={chart.axis} tick={{ fill: chart.axis, fontSize: 12 }} />
                    <YAxis
                      stroke={chart.axis}
                      tick={{ fill: chart.axis, fontSize: 12 }}
                      domain={[Math.floor(chartMin - 2), Math.ceil(chartMax + 2)]}
                      unit=" млн т"
                      width={72}
                    />
                    <Tooltip
                      contentStyle={getChartTooltipStyle()}
                      formatter={(value) => [`${formatNumber(Number(value), 1)} млн т`, 'Добыча']}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke="#b08d3a"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#b08d3a', stroke: chart.dotStroke, strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#c4a35a' }}
                    >
                      <LabelList dataKey="label" position="top" fill="#9aabc2" fontSize={11} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {data.seriesChange ? (
                <p className="outlook-calc">
                  {data.seriesChange.fromYear}→{data.seriesChange.toYear}:{' '}
                  {data.seriesChange.abs > 0 ? '+' : ''}
                  {formatNumber(data.seriesChange.abs, 1)} млн т (
                  {data.seriesChange.pct > 0 ? '+' : ''}
                  {formatNumber(data.seriesChange.pct, 1)}%)
                  <span>Расчёт Coal Monitor KZ на основе данных БНС</span>
                </p>
              ) : null}
              <p className="outlook-callout">
                Источник ряда: БНС, годовое производство промышленной продукции, КСП 151102,
                показатель «Уголь каменный, включая лигнит и концентрат угольный». Данные 2025 года —
                годовой файл, актуализированный 15.07.2026. Ряд 2020–2025 на этой странице не
                объединяется с 115 млн т Минэнерго и с 90,2 млн т счета минеральных ресурсов: это
                разные официальные источники и методологические контексты, а не ошибка в цифрах.
              </p>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Сегменты</p>
                  <h2>Ключевые участники по сегментам</h2>
                </div>
              </header>
              {filters.region !== 'all' ? (
                <NoData
                  text="Доли АЗРК относятся к национальным сегментам первичной оптовой реализации и не являются региональным срезом выбранной области."
                  hint="Откройте «Все регионы / республика» или раздел «Концентрация рынка»."
                />
              ) : data.segments ? (
                <>
                  <div className="geo-segment-list">
                    {data.segments.map((item) => {
                      const latest = item.values[item.values.length - 1]
                      return (
                        <article key={item.id} className="geo-segment-card">
                          <h3>{item.segment}</h3>
                          <p className="outlook-metric-value is-nested">
                            {formatNumber(latest.value, 1)}
                            <span>%</span>
                            <QuietSource sourceId={item.sourceId} />
                          </p>
                          <p className="outlook-metric-caption">
                            {item.actors} · {latest.year}
                          </p>
                        </article>
                      )
                    })}
                  </div>
                  <p className="outlook-hint">
                    Доли относятся к соответствующим сегментам первичной оптовой реализации угля и не
                    являются долями компаний во всей добыче Казахстана.
                  </p>
                  <Link className="geo-cta" to="/concentration">
                    Подробнее → Концентрация рынка
                  </Link>
                </>
              ) : (
                <NoData text="Подтвержденные доли сегментов из АЗРК для этого блока сейчас недоступны." />
              )}
            </section>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
