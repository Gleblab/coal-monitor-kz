import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useFilters } from '../context/FilterContext'
import { getConcentration } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import { chartTooltipStyle, formatNumber } from '../lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatDeltaPp(delta) {
  if (typeof delta !== 'number' || Number.isNaN(delta)) return '—'
  const abs = formatNumber(Math.abs(delta), 1)
  if (delta > 0) return `+${abs} п.п.`
  if (delta < 0) return `−${abs} п.п.`
  return `${formatNumber(0, 1)} п.п.`
}

function ShareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const delta = payload[0]?.payload?.deltaPp
  return (
    <div className="dynamics-tooltip">
      <p className="dynamics-tooltip-period">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey}>
          {item.name}: {formatNumber(Number(item.value), 1)}%
        </p>
      ))}
      {delta != null ? <p>Δ {formatDeltaPp(delta)}</p> : null}
    </div>
  )
}

function ComparativeChart({ items, note }) {
  const chartRows = items.map((item) => ({
    segment: item.shortLabel || item.segment,
    y2024: item.value2024,
    y2025: item.value2025,
    deltaPp: item.deltaPp,
  }))
  return (
    <section className="panel" id="concentration-comparison">
      <div className="panel-head">
        <h2>Сравнение совокупных долей · 2024 / 2025</h2>
        <QuietSource sourceId="azrkConcentration" />
      </div>
      <div className="chart-box concentration-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartRows}
            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="#7d8ca3"
              tick={{ fill: '#7d8ca3', fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="segment"
              stroke="#7d8ca3"
              width={118}
              interval={0}
              tick={{ fill: '#7d8ca3', fontSize: 11 }}
            />
            <Tooltip content={<ShareTooltip />} contentStyle={chartTooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#8b9bb3', paddingTop: 4 }}
            />
            <Bar dataKey="y2024" name="2024" fill="#5b7c99" maxBarSize={14} />
            <Bar dataKey="y2025" name="2025" fill="#c4a056" maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="concentration-deltas">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.shortLabel}</span>
            <strong>{formatDeltaPp(item.deltaPp)}</strong>
          </li>
        ))}
      </ul>
      <p className="kpi-note">{note}</p>
    </section>
  )
}

function reachableCoverageCount(coverage) {
  return coverage.filter((item) => item.state === 'available' || item.state === 'historical').length
}

function CoverageAction({ item, expanded, onToggle }) {
  const action = item.action
  if (!action) return <span className="coverage-action is-empty" />
  if (action.kind === 'route') {
    return (
      <Link className="coverage-action" to={action.to}>
        {action.text}
      </Link>
    )
  }
  if (action.kind === 'anchor') {
    return (
      <a className="coverage-action" href={action.href}>
        {action.text}
      </a>
    )
  }
  if (action.kind === 'why') {
    return (
      <button
        type="button"
        className={`coverage-action is-why${expanded ? ' is-open' : ''}`}
        onClick={() => onToggle(item.id)}
        aria-expanded={expanded}
      >
        {action.text}
      </button>
    )
  }
  return <span className="coverage-action is-empty" />
}

function DataAnalyticsMap({ coverage }) {
  const [expandedId, setExpandedId] = useState(null)
  if (!coverage?.length) return null
  const reachable = reachableCoverageCount(coverage)
  const total = coverage.length

  function toggleWhy(id) {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <section className="panel concentration-map">
      <div className="panel-head">
        <div>
          <h2>Карта данных и аналитики</h2>
          <p className="page-desc">Доступность показателей и переход к связанным аналитическим блокам</p>
        </div>
        <p className="concentration-map-count">
          <strong>
            {reachable} / {total}
          </strong>
          <span>аналитических слоёв</span>
        </p>
      </div>
      <div className="concentration-map-bar" aria-hidden="true">
        {coverage.map((item) => (
          <span
            key={item.id}
            className={`concentration-map-seg is-${item.state}`}
          />
        ))}
      </div>
      <ul className="coverage-list">
        {coverage.map((item) => {
          const expanded = expandedId === item.id && item.action?.kind === 'why'
          return (
            <li key={item.id} className="coverage-row">
              <span className={`coverage-status is-${item.state}`}>{item.stateLabel}</span>
              <div className="coverage-copy">
                <strong>{item.label}</strong>
                <small>{item.context}</small>
              </div>
              <CoverageAction item={item} expanded={expanded} onToggle={toggleWhy} />
              {expanded ? <p className="coverage-why">{item.action.explanation}</p> : null}
            </li>
          )
        })}
      </ul>
      <p className="chart-hint">
        Связанная аналитика:{' '}
        <Link to="/dynamics">Динамика цен</Link>
      </p>
    </section>
  )
}

export function ConcentrationPage() {
  const { filters } = useFilters()
  const { data, loading, error, reload } = useMarketData(getConcentration, filters)

  return (
    <section className="concentration-page">
      <PageHeader
        title="Концентрация рынка"
        description="Структура конкуренции на рынке первичной оптовой реализации угля — по сегментам АЗРК, без отождествления с долей всего угольного рынка Казахстана."
      />
      <StateBlock loading={loading} error={error} empty={!data} skeleton="chart" onRetry={reload}>
        {data ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Структура конкуренции · 2025</h2>
                <QuietSource sourceId={data.oligopolyNote?.sourceId || 'azrkConcentration'} />
              </div>
              {data.items.length ? (
                <div className="concentration-snapshot">
                  {data.items.map((item) => (
                    <article key={item.id}>
                      <p>{item.shortLabel}</p>
                      <strong>
                        {item.value2025 != null ? `${formatNumber(item.value2025, 1)}%` : '—'}
                      </strong>
                      <small>{item.participants?.join(' · ')}</small>
                      <em>{item.crKind}</em>
                    </article>
                  ))}
                </div>
              ) : (
                <NoData text={data.emptyNote || 'Нет подтвержденных долей АЗРК для выбранного сегмента.'} />
              )}
              {data.oligopolyNote ? (
                <p className="outlook-callout">{data.oligopolyNote.text}</p>
              ) : null}
            </section>

            <DataAnalyticsMap coverage={data.coverage} />

            {data.items.length ? (
              <ComparativeChart items={data.items} note={data.deltaNote} />
            ) : null}

            {data.crGuide ? (
              <section className="panel">
                <h2>Как читать показатели концентрации</h2>
                <dl className="concentration-cr">
                  <div>
                    <dt>CR-1</dt>
                    <dd>{data.crGuide.cr1}</dd>
                  </div>
                  <div>
                    <dt>CR-2</dt>
                    <dd>{data.crGuide.cr2}</dd>
                  </div>
                </dl>
                <p className="kpi-note">{data.crGuide.limit}</p>
                <p className="kpi-note">HHI не восстанавливается из агрегированных показателей.</p>
              </section>
            ) : null}

            {data.items.length ? (
              <section className="panel" id="key-participants">
                <div className="panel-head">
                  <h2>Ключевые участники по сегментам</h2>
                  <QuietSource sourceId="azrkConcentration" />
                </div>
                <div className="concentration-participants">
                  {data.items.map((item) => (
                    <article key={item.id}>
                      <p>{item.shortLabel}</p>
                      <ul>
                        {(item.participants || []).map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                      <strong>
                        {item.crKind === 'CR-1' ? 'Доля 2025' : 'Совокупная доля 2025'}:{' '}
                        {item.value2025 != null ? `${formatNumber(item.value2025, 1)}%` : '—'}
                      </strong>
                      {item.value2025 != null && item.marketName ? (
                        <small>
                          По данным АЗРК, {item.crKind === 'CR-1' ? 'доля' : 'совокупная доля'}{' '}
                          {(item.participants || []).join(' и ')} в сегменте {item.marketName} составила{' '}
                          {formatNumber(item.value2025, 1)}% в 2025 году.
                        </small>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {data.items.length ? (
              <section className="panel" id="key-capacity">
                <div className="panel-head">
                  <h2>Обладатели ключевой мощности</h2>
                  <QuietSource sourceId="azrkConcentration" />
                </div>
                <div className="concentration-capacity">
                  {data.items.map((item) => (
                    <article key={item.id}>
                      <p>{item.shortLabel}</p>
                      <ul>
                        {(item.keyCapacity || []).map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
                {data.keyCapacityRule ? (
                  <p className="kpi-note">{data.keyCapacityRule.text}</p>
                ) : null}
              </section>
            ) : null}

            {data.factors?.length ? (
              <section className="panel">
                <div className="panel-head">
                  <h2>Что АЗРК связывает с высокой концентрацией</h2>
                  <QuietSource sourceId="azrkConcentration" />
                </div>
                <ul className="concentration-factors">
                  {data.factors.map((item) => (
                    <li key={item.id}>{item.text}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.measures?.length ? (
              <section className="panel">
                <div className="panel-head">
                  <h2>Меры АЗРК</h2>
                  <QuietSource sourceId="azrkConcentration" />
                </div>
                <ol className="concentration-measures">
                  {data.measures.map((item) => (
                    <li key={item.id}>
                      <span className={`coverage-status is-${item.status === 'Заявлено' ? 'unpublished' : 'plan'}`}>
                        {item.status}
                      </span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ol>
                <p className="kpi-note">
                  Формулировки приведены по официальной публикации АЗРК. Статусы «заявлено» и
                  «предусмотрено» не означают подтверждённый эффект меры.
                </p>
              </section>
            ) : null}

            {data.historical ? (
              <section className="panel is-context" id="historical-concentration">
                <div className="panel-head">
                  <h2>{data.historical.title}</h2>
                  <QuietSource sourceId={data.historical.sourceId} />
                </div>
                <p className="kpi-note">
                  Коммунально-бытовой сегмент · три основных производителя:{' '}
                  {data.historical.participants.join(', ')}.
                </p>
                <div className="concentration-history">
                  {data.historical.rows.map((row) => (
                    <article key={row.year}>
                      <p>{row.year}</p>
                      <strong>
                        {formatNumber(row.share, 0)}
                        {row.unit}
                      </strong>
                      <small>CR-3 · совокупная доля</small>
                    </article>
                  ))}
                </div>
                <p className="outlook-callout">{data.historical.note}</p>
              </section>
            ) : null}

            {data.priceItems.length ? (
              <section className="panel" data-dynamics-origin={data.growthDataOrigin}>
                <div className="panel-head">
                  <h2>Концентрация и ценовой контекст</h2>
                  <QuietSource sourceId="azrkConcentration" />
                </div>
                <div className="concentration-prices">
                  {data.priceItems.map((item) => (
                    <article key={item.id}>
                      <p>{item.segment}</p>
                      <strong>{item.display.replace(/^рост\s+/i, '')}</strong>
                      <small>{item.period}</small>
                    </article>
                  ))}
                </div>
                <p className="kpi-note">{data.priceCausalityNote}</p>
                <Link className="production-export-link" to="/dynamics">
                  Подробнее → Динамика цен
                </Link>
              </section>
            ) : null}
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
