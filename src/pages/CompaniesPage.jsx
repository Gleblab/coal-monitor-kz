import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getCompanyAssets, getCompanyProduction, getCompanyProfiles } from '../api/marketApi'
import { NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import { useMarketData } from '../hooks/useMarketData'
import { formatNumber } from '../lib/format'
import { useChartTheme } from '../hooks/useChartTheme'

function asNumber(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function formatMt(value, minDigits = 0) {
  const n = asNumber(value)
  if (n == null) return '—'
  const frac = String(n).split('.')[1]
  const digits = Math.max(minDigits, frac ? Math.min(frac.length, 3) : 0)
  return formatNumber(n, digits)
}

const ASSET_TYPE_LABEL = {
  basin: 'угольный бассейн',
  deposit: 'месторождение',
  mine: 'разрез',
  enterprise: 'предприятие',
}

const MINING_LABEL = {
  open_pit: 'открытая добыча',
  underground: 'подземная добыча',
  mixed: 'смешанная добыча',
}

function observationYear(row) {
  return row.year ?? null
}

function sourceCode(row) {
  return row?.source?.code || row?.sourceId || null
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))]
}

function buildChartModel(chartSeries) {
  const series = (chartSeries || []).filter((row) => row.measure_kind !== 'capacity')
  const years = uniqueList(series.map(observationYear).filter((year) => Number.isFinite(year))).sort(
    (a, b) => a - b,
  )
  if (years.length === 0) {
    return { rows: [], minYear: null, maxYear: null, hasActual: false, hasPlan: false, hasTarget: false }
  }
  const minYear = years[0]
  const maxYear = years[years.length - 1]
  const axisYears = []
  for (let year = minYear; year <= maxYear; year += 1) axisYears.push(year)

  const byKindYear = { actual: new Map(), plan: new Map(), target: new Map() }
  for (const row of series) {
    const year = observationYear(row)
    if (!year || !byKindYear[row.measure_kind]) continue
    byKindYear[row.measure_kind].set(year, row)
  }

  const rows = axisYears.map((year) => ({
    year: String(year),
    actual: asNumber(byKindYear.actual.get(year)?.value),
    plan: asNumber(byKindYear.plan.get(year)?.value),
    target: asNumber(byKindYear.target.get(year)?.value),
    actualSource: sourceCode(byKindYear.actual.get(year)),
    planSource: sourceCode(byKindYear.plan.get(year)),
    targetSource: sourceCode(byKindYear.target.get(year)),
  }))

  return {
    rows,
    minYear,
    maxYear,
    hasActual: rows.some((row) => row.actual != null),
    hasPlan: rows.some((row) => row.plan != null),
    hasTarget: rows.some((row) => row.target != null),
  }
}

function missingActualYears(chartSeries) {
  const withYear = (chartSeries || []).filter((row) => Number.isFinite(observationYear(row)))
  const actualYears = uniqueList(
    withYear.filter((row) => row.measure_kind === 'actual').map(observationYear),
  ).sort((a, b) => a - b)
  const planYears = uniqueList(
    withYear.filter((row) => row.measure_kind === 'plan').map(observationYear),
  )
  if (actualYears.length === 0) return []
  const start = actualYears[0]
  const end = Math.max(actualYears[actualYears.length - 1], ...planYears, start)
  const gaps = []
  for (let year = start + 1; year < end; year += 1) {
    if (!actualYears.includes(year)) gaps.push(year)
  }
  return gaps
}

function CompanyTooltip({ active, payload, label, conflictByYear, planBelowActual }) {
  if (!active || !payload?.length) return null
  const conflict = conflictByYear?.get?.(Number(label))
  return (
    <div className="companies-tooltip">
      <p className="companies-tooltip-year">{label}</p>
      {payload.map((item) => {
        if (item.value == null) return null
        return (
          <p key={item.dataKey}>
            <span style={{ color: item.color }}>{item.name}</span>
            {': '}
            {formatNumber(item.value)} млн т
          </p>
        )
      })}
      {conflict ? (
        <p className="companies-tooltip-note">
          Уточнённое значение; ранее опубликовано {formatMt(conflict.original[0]?.value, 1)} млн т
        </p>
      ) : null}
      {planBelowActual && Number(label) === planBelowActual.planYear ? (
        <p className="companies-tooltip-note">
          План {planBelowActual.planYear} ниже факта {planBelowActual.actualYear}
        </p>
      ) : null}
    </div>
  )
}

function capacityUnitLabel(unit) {
  if (!unit) return 'млн т/год'
  if (/млн\s*т/i.test(unit)) return 'млн т/год'
  return unit
}

function ChartPointLabel({ x, y, value, fill }) {
  if (x == null || y == null || value == null) return null
  return (
    <text x={x} y={y - 10} textAnchor="middle" fill={fill} fontSize={11} fontFamily="IBM Plex Sans, sans-serif">
      {formatMt(value)}
    </text>
  )
}

function TargetPointLabel({ x, y, value }) {
  if (x == null || y == null || value == null) return null
  return (
    <text
      x={x - 10}
      y={y - 12}
      textAnchor="end"
      fill="#b0892a"
      fontSize={11}
      fontFamily="IBM Plex Sans, sans-serif"
    >
      цель {formatMt(value)}
    </text>
  )
}

function CapacityAxisLabel({ viewBox }) {
  const chart = useChartTheme()
  if (!viewBox) return null
  const x = viewBox.x + viewBox.width - 10
  const y = viewBox.y - 8
  return (
    <text x={x} y={y} textAnchor="end" fill={chart.axis} fontSize={11} fontFamily="IBM Plex Sans, sans-serif">
      Мощность
    </text>
  )
}

function HeroMetric({ caption, value, unit, sourceId, note, tone = 'numeric' }) {
  return (
    <article className="outlook-exec-card">
      <p className="outlook-metric-caption">{caption}</p>
      <p className={`companies-kpi-value ${tone === 'text' ? 'is-text' : 'is-numeric'}`}>
        <span className="companies-kpi-number">{value}</span>
        {unit ? <span className="companies-kpi-unit">{unit}</span> : null}
        <QuietSource sourceId={sourceId} />
      </p>
      {note ? <p className="outlook-hint">{note}</p> : null}
    </article>
  )
}

export function CompaniesPage() {
  const palette = useChartTheme()
  const location = useLocation()
  const { data: profiles, loading, error, reload } = useMarketData(getCompanyProfiles)
  const [selectedCode, setSelectedCode] = useState('bogatyr-komir')
  const [detail, setDetail] = useState({ loading: false, error: null, production: null, assets: null })

  const companies = profiles?.ok ? profiles.items : []
  const selected = companies.find((item) => item.code === selectedCode) || companies[0] || null

  useEffect(() => {
    const code = location.state?.companyCode
    if (code) setSelectedCode(code)
  }, [location.state])

  useEffect(() => {
    if (!selected?.id) return undefined
    let cancelled = false
    setDetail({ loading: true, error: null, production: null, assets: null })
    Promise.all([getCompanyProduction(selected.id), getCompanyAssets(selected.id)])
      .then(([production, assets]) => {
        if (cancelled) return
        if (!production.ok) {
          setDetail({ loading: false, error: production.error, production: null, assets: null })
          return
        }
        if (!assets.ok) {
          setDetail({ loading: false, error: assets.error, production: null, assets: null })
          return
        }
        setDetail({ loading: false, error: null, production, assets })
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail({
            loading: false,
            error: err.message || 'Подключение к данным временно недоступно.',
            production: null,
            assets: null,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [selected?.id])

  const chartSeries = detail.production?.chartSeries || []
  const conflicts = detail.production?.conflicts || []
  const assetRows = detail.assets?.items || []

  const conflictByYear = useMemo(() => {
    const map = new Map()
    for (const item of conflicts) {
      if (item.measureKind === 'actual' && item.year) map.set(item.year, item)
    }
    return map
  }, [conflicts])

  const capacityRow = useMemo(() => {
    const rows = chartSeries.filter((row) => row.measure_kind === 'capacity')
    return (
      rows.find((row) => row.coal_asset?.asset_type === 'enterprise') ||
      rows.find((row) => String(row.coal_asset?.code || '').includes('company')) ||
      (rows.length === 1 ? rows[0] : null)
    )
  }, [chartSeries])

  const chart = useMemo(() => buildChartModel(chartSeries), [chartSeries])
  const actualGapYears = useMemo(() => missingActualYears(chartSeries), [chartSeries])

  const regions = uniqueList(assetRows.map((row) => row.region?.name))
  const mining = uniqueList(assetRows.map((row) => MINING_LABEL[row.mining_method] || row.mining_method))
  const assetCount = assetRows.length

  const lastActual = [...chartSeries]
    .filter((row) => row.measure_kind === 'actual' && observationYear(row))
    .sort((a, b) => observationYear(a) - observationYear(b))
    .at(-1)
  const firstPlan = [...chartSeries]
    .filter((row) => row.measure_kind === 'plan' && observationYear(row))
    .sort((a, b) => observationYear(a) - observationYear(b))[0]
  const planBelowActual =
    lastActual &&
    firstPlan &&
    observationYear(lastActual) < observationYear(firstPlan) &&
    asNumber(lastActual.value) > asNumber(firstPlan.value)
      ? {
          actualYear: observationYear(lastActual),
          planYear: observationYear(firstPlan),
        }
      : null

  const hasNamedSeries = chart.hasActual || chart.hasPlan || chart.hasTarget
  const yValues = [
    ...chart.rows.flatMap((row) => [row.actual, row.plan, row.target]),
    asNumber(capacityRow?.value),
  ].filter((value) => value != null)
  const yMax = yValues.length ? Math.max(...yValues) * 1.12 : 1
  const yMin = 0

  const pageError = error || (profiles && profiles.ok === false ? profiles.error : null)
  const failed = Boolean(pageError)

  return (
    <section className="outlook-page companies-page">
      <PageHeader
        title="Компании и добыча"
        description="Динамика добычи, производственные ориентиры и активы крупнейших угледобывающих компаний Казахстана по подтверждённым первичным источникам."
      />

      <StateBlock
        loading={loading}
        error={failed ? pageError || 'Подключение к данным временно недоступно.' : null}
        empty={!loading && !failed && companies.length === 0}
        emptyText="Нет подтвержденных данных"
        skeleton="table"
        onRetry={reload}
      >
        {companies.length > 0 ? (
          <>
            <div className="company-selector" role="tablist" aria-label="Компании">
              {companies.map((item) => {
                const active = selected?.code === item.code
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={active ? 'is-active' : undefined}
                    onClick={() => setSelectedCode(item.code)}
                  >
                    {item.shortName || item.name}
                  </button>
                )
              })}
            </div>

            <StateBlock
              loading={detail.loading}
              error={detail.error}
              empty={!detail.loading && !detail.error && !detail.production}
              skeleton="compact"
            >
              {detail.production && detail.assets ? (
                <>
                  <section className="outlook-section outlook-hero is-exec">
                    <header className="outlook-section-head">
                      <div>
                        <p className="outlook-kicker">Компания</p>
                        <h2>{selected?.name}</h2>
                      </div>
                    </header>
                    <div className="companies-hero-grid">
                      <HeroMetric
                        caption="Регион"
                        value={regions.length ? regions.join(', ') : 'н/д'}
                        tone="text"
                      />
                      <HeroMetric
                        caption="Тип добычи"
                        value={mining.length ? mining.join(', ') : 'н/д'}
                        tone="text"
                      />
                      <HeroMetric caption="Известные активы" value={String(assetCount)} />
                      <HeroMetric
                        caption="Производственная мощность"
                        value={
                          capacityRow && asNumber(capacityRow.value) != null
                            ? formatMt(capacityRow.value)
                            : 'н/д'
                        }
                        unit={
                          capacityRow && asNumber(capacityRow.value) != null
                            ? capacityUnitLabel(capacityRow.unit)
                            : null
                        }
                        sourceId={capacityRow ? sourceCode(capacityRow) : null}
                        note={capacityRow ? 'Не является фактической добычей' : null}
                      />
                    </div>
                  </section>

                  <section className="outlook-section">
                    <header className="outlook-section-head">
                      <div>
                        <p className="outlook-kicker">Динамика</p>
                        <h2>Добыча и производственные ориентиры</h2>
                      </div>
                    </header>

                    {hasNamedSeries ? (
                      <>
                        <div className="outlook-chart is-national companies-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chart.rows} margin={{ top: 22, right: 18, left: 4, bottom: 36 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                              <XAxis
                                dataKey="year"
                                stroke={palette.axis}
                                interval={0}
                                tick={{ fontSize: 11, fill: palette.axis }}
                                tickMargin={8}
                              />
                              <YAxis
                                stroke={palette.axis}
                                tick={{ fontSize: 12, fill: palette.axis }}
                                domain={[yMin, Number(yMax.toFixed(1))]}
                                tickFormatter={(value) => formatNumber(value, value % 1 === 0 ? 0 : 1)}
                                width={52}
                              />
                              <Tooltip
                                content={(props) => (
                                  <CompanyTooltip
                                    {...props}
                                    conflictByYear={conflictByYear}
                                    planBelowActual={planBelowActual}
                                  />
                                )}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={28}
                                wrapperStyle={{ fontSize: 12, color: palette.axis, paddingTop: 10 }}
                              />
                              {asNumber(capacityRow?.value) != null ? (
                                <ReferenceLine
                                  y={asNumber(capacityRow.value)}
                                  stroke="#7d8aa0"
                                  strokeDasharray="7 5"
                                  strokeWidth={1.2}
                                  ifOverflow="extendDomain"
                                  label={<CapacityAxisLabel />}
                                />
                              ) : null}
                              {chart.hasActual ? (
                                <Line
                                  type="linear"
                                  dataKey="actual"
                                  name="Факт"
                                  stroke="#c4a056"
                                  strokeWidth={2.4}
                                  dot={{ r: 5, fill: '#c4a056', stroke: palette.dotStroke, strokeWidth: 2 }}
                                  activeDot={{ r: 6 }}
                                  connectNulls={false}
                                >
                                  <LabelList dataKey="actual" content={(props) => <ChartPointLabel {...props} fill="#c4a056" />} />
                                </Line>
                              ) : null}
                              {chart.hasPlan ? (
                                <Line
                                  type="linear"
                                  dataKey="plan"
                                  name="План"
                                  stroke="#7d97b3"
                                  strokeWidth={1.8}
                                  strokeDasharray="5 4"
                                  dot={{ r: 4.5, fill: palette.plotFill, stroke: '#7d97b3', strokeWidth: 2 }}
                                  connectNulls={false}
                                >
                                  <LabelList dataKey="plan" content={(props) => <ChartPointLabel {...props} fill="#9bb0c6" />} />
                                </Line>
                              ) : null}
                              {chart.hasTarget ? (
                                <Line
                                  type="linear"
                                  dataKey="target"
                                  name="Цель"
                                  stroke="#b0892a"
                                  strokeWidth={1.4}
                                  strokeDasharray="1 5"
                                  dot={{ r: 4, fill: palette.plotFill, stroke: '#b0892a', strokeWidth: 1.8 }}
                                  connectNulls={false}
                                >
                                  <LabelList dataKey="target" content={(props) => <TargetPointLabel {...props} />} />
                                </Line>
                              ) : null}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="outlook-hint">ось Y — млн т. Пропуск точки — нет observation, не ноль.</p>
                        {conflictByYear.size > 0
                          ? [...conflictByYear.entries()].map(([year, item]) => (
                              <p key={year} className="outlook-callout">
                                {year}: первоначально опубликовано {formatMt(item.original[0]?.value, 1)} млн т;
                                в основной серии — уточнённое значение {formatMt(item.revised[0]?.value, 1)} млн т
                                {item.original[0]?.sourceId || item.revised[0]?.sourceId ? (
                                  <>
                                    {' '}
                                    <QuietSource
                                      sourceId={item.revised[0]?.sourceId || item.original[0]?.sourceId}
                                    />
                                  </>
                                ) : null}
                              </p>
                            ))
                          : null}
                        {planBelowActual ? (
                          <p className="outlook-callout">
                            Факт {planBelowActual.actualYear} немного превышает опубликованный плановый ориентир{' '}
                            {planBelowActual.planYear}; причины расхождения в использованных источниках не
                            уточняются.
                          </p>
                        ) : null}
                        {actualGapYears.length > 0 ? (
                          <p className="outlook-hint">
                            За {actualGapYears.join(', ')} г. подтверждённых значений фактической добычи в текущем
                            наборе нет. Отсутствие observation не означает нулевую добычу.
                          </p>
                        ) : null}
                        {lastActual &&
                        !chartSeries.some(
                          (row) =>
                            (row.measure_kind === 'actual' || row.measure_kind === 'plan') &&
                            observationYear(row) > observationYear(lastActual),
                        ) ? (
                          <p className="outlook-hint">
                            Подтверждённые открытые значения за последующие периоды в текущем наборе отсутствуют.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <NoData text="Сопоставимый ряд годовой добычи компании в использованных открытых первичных источниках не подтверждён." />
                    )}
                  </section>

                  <section className="outlook-section">
                    <header className="outlook-section-head">
                      <div>
                        <p className="outlook-kicker">География</p>
                        <h2>Активы и география</h2>
                      </div>
                    </header>
                    {assetRows.length === 0 ? (
                      <NoData text="Подтверждённые активы для этой компании в текущем наборе отсутствуют." />
                    ) : (
                      <div className="companies-asset-grid">
                        {assetRows.map((asset) => {
                          const cap = chartSeries.find(
                            (row) =>
                              row.measure_kind === 'capacity' &&
                              (row.asset_id === asset.id || row.coal_asset?.code === asset.code),
                          )
                          const isProjectRange =
                            asset.code === 'molodezhny-pit' &&
                            typeof asset.description === 'string' &&
                            asset.description.includes('9,0')
                          return (
                            <article key={asset.id} className="companies-asset-card">
                              <p className="outlook-kicker">{ASSET_TYPE_LABEL[asset.asset_type] || asset.asset_type}</p>
                              <h3>{asset.name}</h3>
                              {asset.region?.name ? (
                                <p className="outlook-hint is-inline">{asset.region.name}</p>
                              ) : null}
                              {asset.mining_method ? (
                                <p className="outlook-hint is-inline">
                                  {MINING_LABEL[asset.mining_method] || asset.mining_method}
                                </p>
                              ) : null}
                              {cap ? (
                                <p className="outlook-metric-value is-nested">
                                  {formatMt(cap.value)}
                                  <span>{cap.unit}</span>
                                  <QuietSource sourceId={sourceCode(cap)} />
                                </p>
                              ) : null}
                              {isProjectRange ? (
                                <p className="outlook-callout">
                                  Проектный диапазон актива «Молодёжный»: 9,0–10,5 млн т/год на горизонте 2021–2031.
                                  Это не фактическая добыча компании и не consolidated capacity.
                                </p>
                              ) : asset.description ? (
                                <p className="companies-asset-desc">{asset.description}</p>
                              ) : null}
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  <section className="outlook-section">
                    <header className="outlook-section-head">
                      <div>
                        <p className="outlook-kicker">Методология</p>
                        <h2>Как читать данные</h2>
                      </div>
                    </header>
                    <ul className="companies-legend-list">
                      <li>
                        <strong>Факт</strong> — фактическая добыча за указанный период.
                      </li>
                      <li>
                        <strong>План</strong> — официально опубликованный производственный план.
                      </li>
                      <li>
                        <strong>Цель</strong> — долгосрочный ориентир, не факт добычи.
                      </li>
                      <li>
                        <strong>Мощность</strong> — заявленная производственная мощность, не фактическая добыча.
                      </li>
                      <li>
                        <strong>Уточнённое значение</strong> — более позднее официальное значение, используемое в
                        основной серии.
                      </li>
                    </ul>
                    <p className="outlook-hint">
                      Ряд компании не складывается с национальными показателями БНС или Минэнерго: это разные
                      источники и методологии. Доля компании в национальной добыче здесь не рассчитывается.
                    </p>
                  </section>
                </>
              ) : null}
            </StateBlock>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
