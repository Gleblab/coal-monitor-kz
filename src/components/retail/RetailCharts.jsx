import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { chartTooltipStyle, formatNumber } from '../../lib/format'
import { brandColor, pluralizeLocality, pluralizeObservation } from '../../lib/retailAnalytics'

function formatKzt(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return formatNumber(value, 0)
}

function astanaPublishedPrices(pack) {
  return (pack?.rows || []).flatMap((row) =>
    (pack.brands || [])
      .map((brand) => row[brand.key])
      .filter((value) => typeof value === 'number' && Number.isFinite(value)),
  )
}

function astanaPublicationTitle(row) {
  if (row.sliceId != null) return `Публикация №${row.sliceId}`
  if (row.sliceLabel && row.sliceLabel !== 'срез') return `Публикация ${row.sliceLabel}`
  return 'Публикация'
}

function astanaBrandSpreads(pack) {
  return (pack?.brands || [])
    .map((brand) => {
      const values = (pack.rows || [])
        .map((row) => row[brand.key])
        .filter((value) => typeof value === 'number' && Number.isFinite(value))
      if (!values.length) return null
      const min = Math.min(...values)
      const max = Math.max(...values)
      return { key: brand.key, name: brand.name, color: brand.color, min, max, spread: max - min }
    })
    .filter(Boolean)
}

export function RetailAstanaChart({ pack }) {
  if (!pack?.rows?.length) return null
  const prices = astanaPublishedPrices(pack)
  const domainMax = prices.length ? Math.max(...prices) : 0
  const ticks = scaleTicks(0, domainMax)
  const stats = astanaBrandSpreads(pack)

  return (
    <div className="retail-astana-compare">
      <div className="retail-astana-scale" aria-hidden="true">
        {ticks.map((tick, index) => (
          <span
            key={tick}
            className={
              index === 0 ? 'is-start' : index === ticks.length - 1 ? 'is-end' : undefined
            }
          >
            {formatKzt(tick)}
            {index === ticks.length - 1 ? ' ₸/т' : ''}
          </span>
        ))}
      </div>
      <div className="retail-astana-grid">
        {pack.rows.map((row) => (
          <article key={row.url || row.sliceKey} className="retail-astana-slice" tabIndex={0}>
            <div className="retail-astana-slice-head">
              {row.url ? (
                <a
                  className="retail-astana-slice-id"
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {astanaPublicationTitle(row)}
                </a>
              ) : (
                <strong className="retail-astana-slice-id">{astanaPublicationTitle(row)}</strong>
              )}
            </div>
            <ul className="retail-astana-brands">
              {pack.brands.map((brand) => {
                const value = row[brand.key]
                if (typeof value !== 'number' || !Number.isFinite(value)) return null
                const width = domainMax > 0 ? (value / domainMax) * 100 : 0
                return (
                  <li key={brand.key}>
                    <div className="retail-astana-brand-meta">
                      <span>{brand.name}</span>
                      <span className="retail-num">{formatKzt(value)} ₸/т</span>
                    </div>
                    <div className="retail-astana-bar-track">
                      <span
                        className="retail-astana-bar-fill"
                        style={{ width: `${width}%`, background: brand.color }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="retail-astana-slice-foot">
              <span>{row.sourceOrg || 'Акимат города Астаны'}</span>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer">
                  Источник
                </a>
              ) : null}
            </div>
            <div className="retail-astana-tip" role="tooltip">
              <p className="retail-astana-tip-title">
                {astanaPublicationTitle(row)}
              </p>
              <p>{row.sourceOrg || 'Акимат города Астаны'}</p>
              {pack.brands.map((brand) => {
                const value = row[brand.key]
                if (typeof value !== 'number' || !Number.isFinite(value)) return null
                return (
                  <p key={brand.key}>
                    <span style={{ color: brand.color }}>{brand.name}</span>
                    {': '}
                    {formatKzt(value)} ₸/т
                  </p>
                )
              })}
              <p>Статус даты:</p>
              <p>нет подтверждённой даты в dataset</p>
              {row.url ? (
                <p>
                  <a href={row.url} target="_blank" rel="noopener noreferrer">
                    Открыть источник
                  </a>
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {stats.length ? (
        <div className="retail-astana-summary">
          <h3>Разброс опубликованных цен</h3>
          <div className="retail-astana-stats">
            {stats.map((item) => (
              <article key={item.key}>
                <h4>{item.name}</h4>
                <p>Минимум: {formatKzt(item.min)} ₸/т</p>
                <p>Максимум: {formatKzt(item.max)} ₸/т</p>
                <p>Разброс: {formatKzt(item.spread)} ₸/т</p>
              </article>
            ))}
          </div>
          <p className="chart-hint">
            Разброс рассчитан между опубликованными значениями и не является показателем роста цены.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function wrapTick(label, width = 18) {
  const text = String(label || '')
  if (text.length <= width) return [text]
  const words = text.split(/[\s,/]+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > width && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

function GeoYTick({ x, y, payload }) {
  const lines = wrapTick(payload?.value)
  const offset = ((lines.length - 1) * 11) / 2
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={line}
          x={-6}
          y={index * 11 - offset + 3}
          textAnchor="end"
          fill="#8b9bb3"
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

function GeoTooltip({ active, payload }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const brandLine = [point.brand, point.variant].filter(Boolean).join(' · ')
  const period =
    point.period || (point.freshness && point.freshness !== 'undated' ? point.freshness : null)
  return (
    <div className="dynamics-tooltip">
      {point.locality ? <p className="dynamics-tooltip-period">{point.locality}</p> : null}
      {brandLine ? <p>{brandLine}</p> : null}
      {typeof point.price === 'number' && Number.isFinite(point.price) ? (
        <p>{formatKzt(point.price)} ₸/т</p>
      ) : null}
      {point.seller ? <p>{point.seller}</p> : null}
      {point.stockTonnes != null ? <p>Запас: {formatNumber(point.stockTonnes, 0)} т</p> : null}
      {period ? <p>{period}</p> : null}
      {point.sourceOrg ? <p>{point.sourceOrg}</p> : null}
    </div>
  )
}

export function RetailGeoPlot({ points }) {
  const localities = [...new Set(points.map((item) => item.locality))]
  const brands = [...new Set(points.map((item) => item.brand))]
  const height = Math.min(400, Math.max(280, localities.length * 58 + 56))
  return (
    <div className="chart-box retail-chart retail-geo-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="price"
            name="Цена"
            stroke="#7d8ca3"
            tick={{ fill: '#7d8ca3', fontSize: 11 }}
            tickFormatter={(value) => formatKzt(Number(value))}
          />
          <YAxis
            type="category"
            dataKey="locality"
            data={localities.map((locality) => ({ locality }))}
            allowDuplicatedCategory={false}
            interval={0}
            width={158}
            stroke="#7d8ca3"
            tick={<GeoYTick />}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip content={<GeoTooltip />} contentStyle={chartTooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.12)' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b9bb3' }} />
          {brands.map((brand) => (
            <Scatter
              key={brand}
              name={brand}
              data={points.filter((item) => item.brand === brand)}
              fill={brandColor(brand)}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function StockTooltip({ active, payload }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="dynamics-tooltip">
      <p className="dynamics-tooltip-period">{point.locality}</p>
      <p>
        {point.brand}
        {point.variant ? ` · ${point.variant}` : ''}
      </p>
      {point.seller ? <p>{point.seller}</p> : null}
      <p>{formatKzt(point.price)} ₸/т</p>
      <p>Запас: {formatNumber(point.stockTonnes, 0)} т</p>
      {point.freshness && point.freshness !== 'undated' ? (
        <p>{point.freshness}</p>
      ) : (
        <p>период источника не датирован в dataset</p>
      )}
      {point.sourceOrg ? <p>{point.sourceOrg}</p> : null}
    </div>
  )
}

export function RetailStockScatter({ points }) {
  const brands = [...new Set(points.map((item) => item.brand))]
  return (
    <div className="chart-box retail-chart retail-stock-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="price"
            name="Цена"
            stroke="#7d8ca3"
            tick={{ fill: '#7d8ca3', fontSize: 11 }}
            tickFormatter={(value) => formatKzt(Number(value))}
          />
          <YAxis
            type="number"
            dataKey="stockTonnes"
            name="Запас"
            stroke="#7d8ca3"
            tick={{ fill: '#7d8ca3', fontSize: 11 }}
            width={56}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
          />
          <ZAxis range={[70, 70]} />
          <Tooltip content={<StockTooltip />} contentStyle={chartTooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b9bb3' }} />
          {brands.map((brand) => (
            <Scatter
              key={brand}
              name={brand}
              data={points.filter((item) => item.brand === brand)}
              fill={brandColor(brand)}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function priceOnScale(value, min, max) {
  if (max === min) return 50
  return ((value - min) / (max - min)) * 100
}

function scaleTicks(min, max, count = 5) {
  if (!(typeof min === 'number') || !(typeof max === 'number')) return []
  if (max === min) return [min]
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1))
}

export function RetailBrandRanges({ pack }) {
  if (!pack?.rows?.length) return null
  const domainMin = pack.domainMin
  const domainMax = pack.domainMax
  const ticks = scaleTicks(domainMin, domainMax)
  return (
    <div className="retail-range-chart">
      <div className="retail-range-scale-wrap">
        <div className="retail-range-scale" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span
              key={tick}
              className={`retail-range-tick${index === 0 ? ' is-start' : ''}${index === ticks.length - 1 ? ' is-end' : ''}`}
              style={{ left: `${priceOnScale(tick, domainMin, domainMax)}%` }}
            >
              {formatKzt(tick)}
            </span>
          ))}
        </div>
        <span className="retail-range-unit">₸/т</span>
      </div>
      <div className="retail-range-scale-line" aria-hidden="true" />
      <ul className="retail-brand-ranges">
        {pack.rows.map((row) => {
          const single = row.min === row.max || row.count === 1
          const left = priceOnScale(row.min, domainMin, domainMax)
          const right = priceOnScale(row.max, domainMin, domainMax)
          const spread = row.max - row.min
          return (
            <li key={row.brand}>
              <div className="retail-brand-head">
                <strong className="retail-brand-name">{row.brand}</strong>
                <p className="retail-range-vals">
                  {single ? (
                    <>
                      {formatKzt(row.min)} <span className="retail-price-unit">₸/т</span>
                    </>
                  ) : (
                    <>
                      {formatKzt(row.min)} — {formatKzt(row.max)} <span className="retail-price-unit">₸/т</span>
                    </>
                  )}
                </p>
                <p className="retail-brand-coverage">
                  {pluralizeObservation(row.count)} · {pluralizeLocality(row.localityCount)}
                  {single ? (
                    <> · одно ценовое наблюдение</>
                  ) : (
                    <>
                      {' '}
                      · разброс: {formatKzt(spread)} <span className="retail-price-unit">₸/т</span>
                    </>
                  )}
                </p>
              </div>
              <div className="retail-range-plot" tabIndex={0}>
                <div className="retail-range-track">
                  {single ? (
                    <span
                      className="retail-range-dot"
                      style={{ left: `${left}%`, background: row.color }}
                    />
                  ) : (
                    <>
                      <span
                        className="retail-range-span"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(right - left, 0)}%`,
                          background: row.color,
                        }}
                      />
                      <span className="retail-range-dot" style={{ left: `${left}%`, background: row.color }} />
                      <span className="retail-range-dot" style={{ left: `${right}%`, background: row.color }} />
                    </>
                  )}
                </div>
                {!single ? (
                  <div className="retail-range-endcaps" aria-hidden="true">
                    <span style={{ left: `${left}%` }}>{formatKzt(row.min)}</span>
                    <span style={{ left: `${right}%` }}>{formatKzt(row.max)}</span>
                  </div>
                ) : null}
                <div className="retail-range-tip">
                  <p>
                    <strong>{row.brand}</strong>
                  </p>
                  {single ? (
                    <p>Цена: {formatKzt(row.min)} ₸/т</p>
                  ) : (
                    <>
                      <p>Минимум: {formatKzt(row.min)} ₸/т</p>
                      <p>Максимум: {formatKzt(row.max)} ₸/т</p>
                      <p>Разброс: {formatKzt(spread)} ₸/т</p>
                    </>
                  )}
                  <p>Наблюдений: {row.count}</p>
                  <p>Населённых пунктов: {row.localityCount}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
