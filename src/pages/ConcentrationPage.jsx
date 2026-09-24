import { useFilters } from '../context/FilterContext'
import { getConcentration } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { NoData, PageHeader, SourceButton, StateBlock, StatusBadge } from '../components/ui'
import { chartTooltipStyle, formatNumber } from '../lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatPointChange(fromValue, toValue) {
  const delta = Math.round((toValue - fromValue) * 10) / 10
  const abs = formatNumber(Math.abs(delta), 1)
  if (delta < 0) return `доля снизилась на ${abs} п.п.`
  if (delta > 0) return `доля увеличилась на ${abs} п.п.`
  return 'доля не изменилась'
}

function SegmentChart({ item }) {
  const chartData = item.values.map((row) => ({ year: String(row.year), value: row.value }))
  const value2024 = item.values.find((row) => row.year === 2024)
  const value2025 = item.values.find((row) => row.year === 2025)
  const pointChange =
    value2024 && value2025 ? formatPointChange(value2024.value, value2025.value) : null
  return (
    <article className="panel">
      <div className="kpi-top">
        <StatusBadge status={item.status} />
        <SourceButton sourceId={item.sourceId} />
      </div>
      <h2>{item.segment}</h2>
      <p className="actors">{item.actors}</p>
      <div className="year-compare">
        {item.values.map((row) => (
          <div key={row.year}>
            <span className="kpi-period">{row.year}</span>
            <p className="kpi-value">
              {formatNumber(row.value)}
              <span className="kpi-unit">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>
      {pointChange ? <p className="kpi-note">{pointChange}</p> : null}
      <p className="kpi-note">{item.scope}</p>
      <div className="chart-box compact">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="year" stroke="#8b9bb3" />
            <YAxis stroke="#8b9bb3" domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${formatNumber(Number(value), 1)}%`, 'Доля сегмента']}
            />
            <Bar dataKey="value" fill="#c9a227" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

export function ConcentrationPage() {
  const { filters } = useFilters()
  const { data, loading, error } = useMarketData(getConcentration, filters)

  return (
    <section>
      <PageHeader
        title="Концентрация рынка"
        description="Три отдельных сегмента первичной оптовой реализации по данным АЗРК. Сравнение 2024 и 2025 годов показано по каждому сегменту отдельно."
      />
      <StateBlock loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <p className="callout">{data.disclaimer}</p>
            {data.items.length ? (
              <div
                className="cards-3"
                data-shares-origin={data.sharesDataOrigin}
                data-shares-count={data.sharesRemoteCount ?? ''}
              >
                {data.items.map((item) => (
                  <SegmentChart key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <NoData text={data.emptyNote} />
            )}
            {data.priceItems.length ? (
              <article
                className="panel"
                data-dynamics-origin={data.growthDataOrigin}
                data-prices-count={data.pricesRemoteCount ?? ''}
              >
                <div className="kpi-top">
                  <StatusBadge status="Официальные данные" />
                  <SourceButton sourceId="azrkConcentration" />
                </div>
                <h2>Динамика цен АЗРК</h2>
                <p className="context-line">{data.priceGrowthCaption}</p>
                <div className="split">
                  {data.priceItems.map((item) => (
                    <div key={item.id} className="mini-metric">
                      <h3>{item.segment}</h3>
                      <p className="hero-value">{item.display}</p>
                      <p className="kpi-period">{item.period}</p>
                      <p className="kpi-note">{item.note}</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
            <NoData text="Объёмы производства отдельных компаний в натуральном выражении в текущем источнике АЗРК не приведены." />
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
