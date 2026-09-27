import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getExportAnnualTotals,
  getExportByCountry,
  getExportConcentration,
  getExportCountryHistory,
  getExportPeriodComparison,
  getExportPeriods,
} from '../api/marketApi'
import { countryNameRu } from '../data/exportCountries'
import { EXPORT_MARKET_FACTORS } from '../data/exportMarketFactors'
import { ExportCountryDetail } from '../components/ExportCountryDetail'
import { ExportWorldMap } from '../components/ExportWorldMap'
import { MetricTraceButton } from '../components/traceability/MetricTraceButton'
import { NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import { iso3FromPartner } from '../data/exportMapIso'
import { formatNumber, formatSignedPercent, formatTonnes, formatUsdAmount } from '../lib/format'

const LATEST_YTD = 'ytd-2026-01-07'
const COMPARE_YTD = 'ytd-2025-01-07'

function asNumber(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function periodTitle(period) {
  if (!period) return ''
  if (period.is_full_year) return `Полный год ${period.year}`
  return `Январь–июль ${period.year}`
}

function yoyCaption(period) {
  if (!period) return ''
  if (period.is_full_year) return `к ${period.year} году`
  return `к январю–июлю ${period.year}`
}

function derivedCaption(period) {
  if (!period?.is_full_year) return 'Расчёт Coal Monitor KZ на основе данных БНС'
  return 'Расчёт Coal Monitor KZ на основе UN Comtrade'
}

function shareOf(part, total) {
  const a = asNumber(part)
  const b = asNumber(total)
  if (a == null || b == null || b === 0) return null
  return (a / b) * 100
}

function HeroCard({ caption, value, unit, note, sourceId, derived, item, extras }) {
  return (
    <article className="outlook-exec-card">
      <p className="outlook-metric-caption">{caption}</p>
      <p className="companies-kpi-value is-numeric">
        <span className="companies-kpi-number">{value}</span>
        {unit ? <span className="companies-kpi-unit">{unit}</span> : null}
        <QuietSource sourceId={sourceId} />
      </p>
      {note ? <p className="outlook-hint">{note}</p> : null}
      {derived ? <p className="outlook-hint">{derived}</p> : null}
      {item ? <MetricTraceButton item={item} extras={extras} /> : null}
    </article>
  )
}

function RankingTooltip({ active, payload, yoyByCode, previousPeriod, rankingMeta }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const row = rankingMeta?.get(point.code)
  if (!row) return null
  const yoy = yoyByCode.get(row.code)
  const volume = formatTonnes(row.tonnes)
  const usd = formatUsdAmount(row.usd)
  return (
    <div className="companies-tooltip">
      <p className="companies-tooltip-year">{row.name}</p>
      <p>
        {volume.text} {volume.unit}
      </p>
      {row.share != null ? <p>доля {formatNumber(row.share, 2)}%</p> : null}
      <p>
        {usd.text} {usd.unit}
      </p>
      {yoy?.status === 'ok' && yoy.pct != null ? (
        <p className="companies-tooltip-note">
          {formatSignedPercent(yoy.pct)} {yoyCaption(previousPeriod)}
        </p>
      ) : null}
      {yoy?.status === 'new' ? (
        <p className="companies-tooltip-note">новое направление в сопоставимом периоде</p>
      ) : null}
      {row.transit ? (
        <p className="companies-tooltip-note">
          Пометка означает только то, что страна-партнёр может не совпадать с конечным потребителем.
          Она не является доказательством транзита.
        </p>
      ) : null}
    </div>
  )
}

function yoyLabel(item) {
  if (!item) return 'н/д'
  if (item.status === 'new') return 'новое направление в сопоставимом наборе'
  if (item.status === 'no_current_export') return 'нет в текущем периоде'
  if (item.status === 'ok' && item.pct != null) return formatSignedPercent(item.pct)
  return 'н/д'
}

function partnerYoySuffix(yoy) {
  if (yoy?.status === 'ok' && yoy.pct != null) return ` · ${formatSignedPercent(yoy.pct)} к январю–июлю 2025`
  if (yoy?.status === 'new') return ' · новое направление в сопоставимом наборе'
  if (yoy?.status === 'no_current_export') return ' · нет в текущем периоде'
  return ''
}

export function ExportsPage() {
  const [boot, setBoot] = useState({ loading: true, error: null })
  const [periods, setPeriods] = useState([])
  const [annual, setAnnual] = useState(null)
  const [ytdCmp, setYtdCmp] = useState(null)
  const [concentration, setConcentration] = useState(null)
  const [selectedId, setSelectedId] = useState(LATEST_YTD)
  const [ranking, setRanking] = useState({ loading: false, error: null, data: null, comparison: null })
  const [selectedIso, setSelectedIso] = useState(null)
  const [countryHistory, setCountryHistory] = useState({ loading: false, error: null, items: [] })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getExportPeriods(),
      getExportAnnualTotals(),
      getExportPeriodComparison(LATEST_YTD, COMPARE_YTD),
      getExportConcentration(LATEST_YTD),
    ])
      .then(([periodRes, annualRes, cmpRes, concRes]) => {
        if (cancelled) return
        if (!periodRes.ok) {
          setBoot({ loading: false, error: periodRes.error })
          return
        }
        if (!annualRes.ok) {
          setBoot({ loading: false, error: annualRes.error })
          return
        }
        if (!cmpRes.ok) {
          setBoot({ loading: false, error: cmpRes.error })
          return
        }
        if (!concRes.ok) {
          setBoot({ loading: false, error: concRes.error })
          return
        }
        setPeriods(periodRes.items)
        setAnnual(annualRes)
        setYtdCmp(cmpRes)
        setConcentration(concRes)
        setBoot({ loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setBoot({
            loading: false,
            error: err.message || 'Подключение к данным временно недоступно.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedPeriod = periods.find((item) => item.id === selectedId) || periods[0] || null

  useEffect(() => {
    if (!selectedPeriod?.id) return undefined
    let cancelled = false
    setRanking({ loading: true, error: null, data: null, comparison: null })
    const comparableId = selectedPeriod.comparable_period_id
    const tasks = [getExportByCountry(selectedPeriod.id)]
    if (comparableId) tasks.push(getExportPeriodComparison(selectedPeriod.id, comparableId))
    Promise.all(tasks)
      .then(([byCountry, comparison]) => {
        if (cancelled) return
        if (!byCountry.ok) {
          setRanking({ loading: false, error: byCountry.error, data: null, comparison: null })
          return
        }
        if (comparison && !comparison.ok) {
          setRanking({ loading: false, error: comparison.error, data: null, comparison: null })
          return
        }
        setRanking({
          loading: false,
          error: null,
          data: byCountry,
          comparison: comparison && comparison.ok ? comparison : null,
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setRanking({
            loading: false,
            error: err.message || 'Подключение к данным временно недоступно.',
            data: null,
            comparison: null,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedPeriod?.id, selectedPeriod?.comparable_period_id])

  const volume = formatTonnes(ytdCmp?.currentNational?.netWeightTonnes)
  const prevVolume = formatTonnes(ytdCmp?.previousNational?.netWeightTonnes)
  const value = formatUsdAmount(ytdCmp?.currentNational?.tradeValueUsd, 1)
  const prevValue = formatUsdAmount(ytdCmp?.previousNational?.tradeValueUsd, 1)
  const volumeYoy = ytdCmp?.volumeYoy
  const valueYoy = ytdCmp?.valueYoy
  const latestSource = ranking.data?.period?.id === LATEST_YTD ? ranking.data?.national?.sourceId : 'bnsTradeYtd2026'

  const yoyByCode = useMemo(() => {
    const map = new Map()
    for (const row of ranking.comparison?.countries || []) {
      map.set(row.partnerCode, row.volumeYoy)
    }
    return map
  }, [ranking.comparison])

  const rankingRows = useMemo(() => {
    const total = ranking.data?.national?.netWeightTonnes
    return (ranking.data?.partners || []).map((row) => ({
      code: row.partnerCode,
      name: countryNameRu(row.partnerCode, row.partnerCountry),
      countryEn: row.partnerCountry,
      tonnes: row.netWeightTonnes,
      mt: (row.netWeightTonnes || 0) / 1e6,
      usd: row.tradeValueUsd,
      share: shareOf(row.netWeightTonnes, total),
      transit: row.declaredPartnerMayBeTransit,
      sourceId: row.sourceId,
      iso: iso3FromPartner(row.partnerCode, row.partnerCountry),
    }))
  }, [ranking.data])

  const selectedRow = useMemo(
    () => rankingRows.find((row) => row.iso === selectedIso && typeof row.tonnes === 'number') || null,
    [rankingRows, selectedIso],
  )

  useEffect(() => {
    if (!selectedIso || ranking.loading) return
    if (!ranking.data || !selectedRow) {
      setSelectedIso(null)
    }
  }, [ranking.loading, ranking.data, selectedIso, selectedRow])

  useEffect(() => {
    if (!selectedRow?.code) {
      setCountryHistory({ loading: false, error: null, items: [] })
      return undefined
    }
    let cancelled = false
    setCountryHistory({ loading: true, error: null, items: [] })
    getExportCountryHistory(selectedRow.code)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setCountryHistory({ loading: false, error: res.error, items: [] })
          return
        }
        setCountryHistory({ loading: false, error: null, items: res.items || [] })
      })
      .catch((err) => {
        if (!cancelled) {
          setCountryHistory({
            loading: false,
            error: err.message || 'Динамика временно недоступна.',
            items: [],
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedRow?.code])

  const rankingView = useMemo(
    () =>
      rankingRows.slice(0, 12).map((row) => ({
        code: row.code,
        country: row.name,
        volumeMt: row.mt,
      })),
    [rankingRows],
  )
  const rankingMeta = useMemo(() => {
    const map = new Map()
    for (const row of rankingRows) map.set(row.code, row)
    return map
  }, [rankingRows])
  const russiaRow = rankingRows.find((row) => row.code === 'russia')
  const russiaYoy = yoyByCode.get('russia')

  const movers = useMemo(() => {
    return (ytdCmp?.countries || [])
      .filter((row) => {
        const previous = asNumber(row.previousTonnes)
        const current = asNumber(row.currentTonnes)
        return (
          row.volumeYoy?.status === 'ok' &&
          row.volumeYoy.pct != null &&
          previous != null &&
          previous !== 0 &&
          current != null
        )
      })
      .map((row) => ({
        ...row,
        name: countryNameRu(row.partnerCode, row.partnerCountry),
        delta: Math.abs(asNumber(row.currentTonnes) - asNumber(row.previousTonnes)),
        lowBase: asNumber(row.previousTonnes) != null && asNumber(row.previousTonnes) < 400000,
      }))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 10)
  }, [ytdCmp])

  const newDirections = useMemo(
    () =>
      (ytdCmp?.countries || [])
        .filter((row) => row.volumeYoy?.status === 'new')
        .map((row) => ({
          ...row,
          name: countryNameRu(row.partnerCode, row.partnerCountry),
        })),
    [ytdCmp],
  )

  const missingDirections = useMemo(
    () =>
      (ytdCmp?.countries || [])
        .filter((row) => row.volumeYoy?.status === 'no_current_export')
        .map((row) => ({
          ...row,
          name: countryNameRu(row.partnerCode, row.partnerCountry),
        })),
    [ytdCmp],
  )

  const annualVolume = (annual?.items || []).map((item) => ({
    year: String(item.period.year),
    volume: item.netWeightTonnes / 1e6,
    label: formatTonnes(item.netWeightTonnes, 3).text,
    sourceId: item.sourceId,
  }))
  const annualValue = (annual?.items || []).map((item) => ({
    year: String(item.period.year),
    value: item.tradeValueUsd / 1e6,
    label: formatUsdAmount(item.tradeValueUsd, 2).text,
    sourceId: item.sourceId,
  }))
  const fy2025 = annual?.items?.find((item) => item.period.id === 'fy-2025')

  const compareBars = ytdCmp
    ? [
        {
          period: 'Янв–июл 2025',
          volume: (ytdCmp.previousNational.netWeightTonnes || 0) / 1e6,
          value: (ytdCmp.previousNational.tradeValueUsd || 0) / 1e6,
        },
        {
          period: 'Янв–июл 2026',
          volume: (ytdCmp.currentNational.netWeightTonnes || 0) / 1e6,
          value: (ytdCmp.currentNational.tradeValueUsd || 0) / 1e6,
        },
      ]
    : []

  return (
    <section className="outlook-page exports-page">
      <PageHeader
        title="Экспорт и внешние рынки"
        description="География экспорта каменного угля Казахстана, динамика внешней торговли и структура направлений."
      />
      <p className="outlook-kicker exports-hs-line">ТН ВЭД 2701 · данные внешней торговли</p>

      <StateBlock
        loading={boot.loading}
        error={boot.error}
        empty={!boot.loading && !boot.error && !ytdCmp}
        emptyText="Нет подтвержденных данных"
        skeleton="chart"
      >
        {ytdCmp && concentration ? (
          <>
            <section className="outlook-section outlook-hero is-exec">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Последний доступный период</p>
                  <h2>Январь–июль 2026</h2>
                </div>
              </header>
              <div className="exports-hero-grid">
                <HeroCard
                  caption="Экспорт"
                  value={volume.text}
                  unit={volume.unit}
                  sourceId={latestSource}
                  item={{
                    id: 'export-ytd-2026-volume',
                    value: volume.millionTons,
                    display: volume.text,
                    unit: volume.unit,
                    period: 'Январь–июль 2026 · неполный год',
                    sourceId: latestSource,
                  }}
                  extras={{ profileKey: 'hsYtdVolume', route: '/exports' }}
                />
                <HeroCard
                  caption="К январю–июлю 2025"
                  value={volumeYoy?.status === 'ok' ? formatSignedPercent(volumeYoy.pct) : 'н/д'}
                  derived={derivedCaption(ytdCmp.currentPeriod)}
                  item={
                    volumeYoy?.status === 'ok'
                      ? {
                          id: 'export-ytd-volume-yoy',
                          value: volumeYoy.pct,
                          display: formatSignedPercent(volumeYoy.pct),
                          unit: '%',
                          period: 'Январь–июль 2026 к январю–июлю 2025',
                          sourceId: latestSource,
                        }
                      : null
                  }
                  extras={{
                    profileKey: 'derivedYoyVolume',
                    route: '/exports',
                    derived: true,
                    derivedNote: derivedCaption(ytdCmp.currentPeriod),
                  }}
                />
                <HeroCard
                  caption="Стоимость экспорта"
                  value={value.text}
                  unit={value.unit}
                  sourceId={latestSource}
                  item={{
                    id: 'export-ytd-2026-value',
                    value: ytdCmp.currentNational?.tradeValueUsd != null
                      ? ytdCmp.currentNational.tradeValueUsd / 1e6
                      : null,
                    display: value.text,
                    unit: value.unit,
                    period: 'Январь–июль 2026 · неполный год',
                    sourceId: latestSource,
                  }}
                  extras={{ profileKey: 'hsYtdValue', route: '/exports' }}
                />
                <HeroCard
                  caption="Стоимость к январю–июлю 2025"
                  value={valueYoy?.status === 'ok' ? formatSignedPercent(valueYoy.pct) : 'н/д'}
                  derived={derivedCaption(ytdCmp.currentPeriod)}
                  item={
                    valueYoy?.status === 'ok'
                      ? {
                          id: 'export-ytd-value-yoy',
                          value: valueYoy.pct,
                          display: formatSignedPercent(valueYoy.pct),
                          unit: '%',
                          period: 'Январь–июль 2026 к январю–июлю 2025',
                          sourceId: latestSource,
                        }
                      : null
                  }
                  extras={{
                    profileKey: 'derivedYoyValue',
                    route: '/exports',
                    derived: true,
                    derivedNote: derivedCaption(ytdCmp.currentPeriod),
                  }}
                />
                <HeroCard
                  caption="Доля трёх крупнейших направлений"
                  value={concentration.top3?.share != null ? formatNumber(concentration.top3.share, 2) : 'н/д'}
                  unit="%"
                  derived={derivedCaption(ytdCmp.currentPeriod)}
                />
                <HeroCard
                  caption="Доля пяти крупнейших направлений"
                  value={concentration.top5?.share != null ? formatNumber(concentration.top5.share, 2) : 'н/д'}
                  unit="%"
                  derived={derivedCaption(ytdCmp.currentPeriod)}
                />
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Сопоставление</p>
                  <h2>Экспорт в январе–июле: 2025 → 2026</h2>
                </div>
              </header>
              <div className="exports-compare-grid">
                <article className="outlook-exec-card">
                  <p className="outlook-metric-caption">Январь–июль 2025</p>
                  <p className="companies-kpi-value is-numeric">
                    <span className="companies-kpi-number">{prevVolume.text}</span>
                    <span className="companies-kpi-unit">{prevVolume.unit}</span>
                  </p>
                  <p className="outlook-hint">
                    {prevValue.text} {prevValue.unit}
                    <QuietSource sourceId="bnsTradeYtd2025Wayback" />
                  </p>
                  <MetricTraceButton
                    item={{
                      id: 'export-ytd-2025-volume',
                      value: prevVolume.millionTons,
                      display: prevVolume.text,
                      unit: prevVolume.unit,
                      period: 'Январь–июль 2025 · неполный год',
                      sourceId: 'bnsTradeYtd2025Wayback',
                    }}
                    extras={{ profileKey: 'hsYtdVolume', route: '/exports' }}
                  />
                </article>
                <article className="outlook-exec-card">
                  <p className="outlook-metric-caption">Январь–июль 2026</p>
                  <p className="companies-kpi-value is-numeric">
                    <span className="companies-kpi-number">{volume.text}</span>
                    <span className="companies-kpi-unit">{volume.unit}</span>
                  </p>
                  <p className="outlook-hint">
                    {value.text} {value.unit}
                    <QuietSource sourceId="bnsTradeYtd2026" />
                  </p>
                  <MetricTraceButton
                    item={{
                      id: 'export-ytd-2026-volume-compare',
                      value: volume.millionTons,
                      display: volume.text,
                      unit: volume.unit,
                      period: 'Январь–июль 2026 · неполный год',
                      sourceId: 'bnsTradeYtd2026',
                    }}
                    extras={{ profileKey: 'hsYtdVolume', route: '/exports' }}
                  />
                </article>
                <article className="outlook-exec-card">
                  <p className="outlook-metric-caption">Изменение</p>
                  <p className="outlook-hint is-inline">объём {yoyLabel(volumeYoy)}</p>
                  <p className="outlook-hint is-inline">стоимость {yoyLabel(valueYoy)}</p>
                  <p className="outlook-hint">{derivedCaption(ytdCmp.currentPeriod)}</p>
                </article>
              </div>
              <div className="exports-dual-charts">
                <div className="outlook-chart is-compact">
                  <p className="outlook-metric-caption">Объём, млн т</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="period" stroke="#8b9bb3" tick={{ fontSize: 11, fill: '#8b9bb3' }} />
                      <YAxis stroke="#8b9bb3" tick={{ fontSize: 11, fill: '#8b9bb3' }} width={36} />
                      <Tooltip
                        contentStyle={{ background: '#101826', border: '1px solid #2c3a52' }}
                        formatter={(val) => [`${formatNumber(Number(val), 2)} млн т`, 'Объём']}
                      />
                      <Bar dataKey="volume" fill="#b08932" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="outlook-chart is-compact">
                  <p className="outlook-metric-caption">Стоимость, млн $</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="period" stroke="#8b9bb3" tick={{ fontSize: 11, fill: '#8b9bb3' }} />
                      <YAxis stroke="#8b9bb3" tick={{ fontSize: 11, fill: '#8b9bb3' }} width={40} />
                      <Tooltip
                        contentStyle={{ background: '#101826', border: '1px solid #2c3a52' }}
                        formatter={(val) => [`${formatNumber(Number(val), 1)} млн $`, 'Стоимость']}
                      />
                      <Bar dataKey="value" fill="#7d97b3" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="outlook-callout">
                Стоимость экспорта выросла быстрее физического объёма. Показатель отражает совокупное
                изменение стоимости экспортной корзины и географии поставок и не должен интерпретироваться
                как чистое изменение цены угля.
              </p>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">География</p>
                  <h2>Крупнейшие направления · {periodTitle(selectedPeriod)}</h2>
                </div>
              </header>
              <div className="company-selector" role="tablist" aria-label="Период экспорта">
                {periods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedPeriod?.id === item.id}
                    className={selectedPeriod?.id === item.id ? 'is-active' : undefined}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {periodTitle(item)}
                  </button>
                ))}
              </div>
              <StateBlock loading={ranking.loading} error={ranking.error} empty={!ranking.loading && !ranking.data} skeleton="table">
                {ranking.data ? (
                  <>
                    <div className="export-map-block">
                      <h3 className="export-map-title">География экспорта Казахстана</h3>
                      <p className="outlook-hint">
                        Направления экспорта каменного угля Казахстана, ТН ВЭД 2701
                      </p>
                      <div className={`export-map-layout${selectedIso ? ' is-detail' : ''}`}>
                        <ExportWorldMap
                          partners={rankingRows}
                          nationalTonnes={ranking.data.national?.netWeightTonnes}
                          yoyByCode={yoyByCode}
                          previousPeriod={ranking.comparison?.previousPeriod}
                          comparableAvailable={Boolean(ranking.comparison)}
                          selectedIso={selectedIso}
                          onSelect={setSelectedIso}
                        />
                        {selectedIso ? (
                          <ExportCountryDetail
                            key={selectedIso}
                            row={selectedRow}
                            period={selectedPeriod}
                            yoy={selectedRow ? yoyByCode.get(selectedRow.code) : null}
                            previousPeriod={ranking.comparison?.previousPeriod}
                            comparableAvailable={Boolean(ranking.comparison)}
                            history={countryHistory}
                            onBack={() => setSelectedIso(null)}
                          />
                        ) : rankingRows.length ? (
                          <aside className="export-map-top">
                            <p className="outlook-metric-caption">Топ-3 направления выбранного периода</p>
                            <ol>
                              {rankingRows.slice(0, 3).map((row) => {
                                const volume = formatTonnes(row.tonnes)
                                return (
                                  <li key={row.code}>
                                    <strong>{row.name}</strong>
                                    <span>
                                      {volume.text} {volume.unit}
                                      {row.share != null ? ` · ${formatNumber(row.share, 2)}%` : ''}
                                    </span>
                                  </li>
                                )
                              })}
                            </ol>
                          </aside>
                        ) : null}
                      </div>
                      <p className="outlook-callout">
                        Страна-партнёр во внешнеторговой статистике не обязательно является конечным
                        местом потребления угля.
                      </p>
                      <p className="geo-map-credit">
                        Геометрия стран: Natural Earth 110m. Карта показывает страны-партнёры внешней
                        торговли, а не подтверждённые маршруты перевозки.
                      </p>
                    </div>
                    <h3 className="export-map-title">Крупнейшие направления</h3>
                    <div
                      className="outlook-chart is-national exports-rank-chart"
                      style={{ height: Math.max(320, rankingView.length * 34 + 48) }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={rankingView}
                          margin={{ top: 8, right: 36, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis
                            type="number"
                            stroke="#8b9bb3"
                            tick={{ fontSize: 11, fill: '#8b9bb3' }}
                            tickFormatter={(value) => formatNumber(Number(value), 1)}
                            domain={[0, (dataMax) => dataMax]}
                            allowDecimals
                          />
                          <YAxis
                            type="category"
                            dataKey="country"
                            width={118}
                            stroke="#8b9bb3"
                            tick={{ fontSize: 12, fill: '#c5d0de' }}
                            interval={0}
                          />
                          <Tooltip
                            cursor={false}
                            content={(props) => (
                              <RankingTooltip
                                {...props}
                                yoyByCode={yoyByCode}
                                previousPeriod={ranking.comparison?.previousPeriod}
                                rankingMeta={rankingMeta}
                              />
                            )}
                          />
                          <Bar
                            dataKey="volumeMt"
                            fill="#b08932"
                            radius={[0, 3, 3, 0]}
                            name="Объём"
                            maxBarSize={22}
                            background={false}
                            isAnimationActive={false}
                            activeBar={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="outlook-hint">
                      ось X — млн т. Шкала не сжата: крупнейшее направление занимает соответствующую долю.
                    </p>
                    {rankingRows.length > rankingView.length ? (
                      <p className="outlook-hint">
                        На графике показаны {rankingView.length} крупнейших направлений из {rankingRows.length}.
                      </p>
                    ) : null}
                    {selectedPeriod?.id === LATEST_YTD && russiaRow ? (
                      <p className="outlook-callout">
                        Россия остаётся крупнейшей страной-партнёром по объёму экспорта ТН ВЭД 2701 в
                        январе–июле 2026 ({formatTonnes(russiaRow.tonnes).text}{' '}
                        {formatTonnes(russiaRow.tonnes).unit}
                        {russiaRow.share != null ? `, ${formatNumber(russiaRow.share, 2)}%` : ''}).
                        {russiaYoy?.status === 'ok' && russiaYoy.pct != null
                          ? ` ${formatSignedPercent(russiaYoy.pct)} к январю–июлю 2025.`
                          : ''}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </StateBlock>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Изменение</p>
                  <h2>Как изменилась география экспорта</h2>
                </div>
              </header>
              <p className="outlook-hint">Январь–июль 2025 и январь–июль 2026. Сортировка по абсолютному изменению объёма.</p>
              <div className="exports-change-list">
                {movers.map((row) => (
                  <article key={row.partnerCode} className="exports-change-row">
                    <h3>{row.name}</h3>
                    <p>
                      {formatNumber(asNumber(row.previousTonnes) / 1e6, 3)} →{' '}
                      {formatNumber(asNumber(row.currentTonnes) / 1e6, 3)} <span>млн т</span>
                    </p>
                    <p className={row.lowBase || Math.abs(row.volumeYoy.pct) > 100 ? 'is-muted' : undefined}>
                      {formatSignedPercent(row.volumeYoy.pct)}
                    </p>
                  </article>
                ))}
              </div>
              <p className="outlook-callout">
                Высокий процент роста может отражать эффект низкой базы предыдущего периода.
              </p>
            </section>

            <div className="exports-split">
              <section className="outlook-section">
                <header className="outlook-section-head">
                  <div>
                    <p className="outlook-kicker">Сопоставимый период</p>
                    <h2>Новые направления</h2>
                  </div>
                </header>
                {newDirections.length === 0 ? (
                  <NoData text="В сопоставимом наборе новых направлений нет." />
                ) : (
                  <>
                    <ul className="exports-chip-list">
                      {newDirections.map((row) => (
                        <li key={row.partnerCode}>
                          <strong>{row.name}</strong>
                          <span>
                            {formatTonnes(row.currentTonnes).text} {formatTonnes(row.currentTonnes).unit}
                            {row.volumeYoy?.status === 'new' ? ' · новое направление в сопоставимом наборе' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="outlook-hint">
                      В январе–июле 2026 зафиксирован экспорт, отсутствовавший в сопоставимом наборе
                      января–июля 2025. Это не доказывает, что поставки туда никогда не осуществлялись раньше.
                    </p>
                  </>
                )}
              </section>
              <section className="outlook-section">
                <header className="outlook-section-head">
                  <div>
                    <p className="outlook-kicker">Сопоставимый период</p>
                    <h2>Не зафиксированы в текущем периоде</h2>
                  </div>
                </header>
                {missingDirections.length === 0 ? (
                  <NoData text="Все направления января–июля 2025 присутствуют в январе–июле 2026." />
                ) : (
                  <>
                    <ul className="exports-chip-list">
                      {missingDirections.map((row) => (
                        <li key={row.partnerCode}>
                          <strong>{row.name}</strong>
                          <span>
                            было {formatTonnes(row.previousTonnes).text}{' '}
                            {formatTonnes(row.previousTonnes).unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="outlook-hint">
                      Не зафиксированы в текущем сопоставимом периоде. Отсутствие строки не интерпретируется
                      как потеря рынка.
                    </p>
                  </>
                )}
              </section>
            </div>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Полный год</p>
                  <h2>Экспорт каменного угля · полный год</h2>
                </div>
                {fy2025?.netWeightTonnes != null ? (
                  <div className="outlook-stage-meta">
                    <MetricTraceButton
                      item={{
                        id: 'export-hs-fy2025-volume',
                        value: fy2025.netWeightTonnes / 1e6,
                        display: formatTonnes(fy2025.netWeightTonnes, 3).text,
                        unit: formatTonnes(fy2025.netWeightTonnes, 3).unit,
                        period: '2025 год',
                        sourceId: fy2025.sourceId || 'unComtradeKazHs2701',
                      }}
                      extras={{
                        profileKey: 'hsFyVolume',
                        route: '/exports',
                        related: {
                          ministryExport:
                            fy2025.ministryCoalExportsTonnesMillion != null
                              ? { value: fy2025.ministryCoalExportsTonnesMillion, unit: 'млн т' }
                              : null,
                        },
                      }}
                    />
                    {fy2025.tradeValueUsd != null ? (
                      <MetricTraceButton
                        item={{
                          id: 'export-hs-fy2025-value',
                          value: fy2025.tradeValueUsd / 1e6,
                          display: formatUsdAmount(fy2025.tradeValueUsd, 2).text,
                          unit: formatUsdAmount(fy2025.tradeValueUsd, 2).unit,
                          period: '2025 год',
                          sourceId: fy2025.sourceId || 'unComtradeKazHs2701',
                        }}
                        extras={{ profileKey: 'hsFyValue', route: '/exports' }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </header>
              <div className="exports-dual-charts">
                <div className="outlook-chart is-compact">
                  <p className="outlook-metric-caption">Объём, млн т</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualVolume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="year" stroke="#8b9bb3" tick={{ fontSize: 12, fill: '#8b9bb3' }} />
                      <YAxis stroke="#8b9bb3" tick={{ fontSize: 11, fill: '#8b9bb3' }} width={36} />
                      <Tooltip
                        contentStyle={{ background: '#101826', border: '1px solid #2c3a52' }}
                        formatter={(val) => [`${formatNumber(Number(val), 3)} млн т`, 'Объём']}
                      />
                      <Bar dataKey="volume" fill="#b08932" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="outlook-chart is-compact">
                  <p className="outlook-metric-caption">Стоимость, млн $</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualValue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="year" stroke="#8b9bb3" tick={{ fontSize: 12, fill: '#8b9bb3' }} />
                      <YAxis stroke="#8b9bb3" tick={{ fontSize: 11, fill: '#8b9bb3' }} width={40} />
                      <Tooltip
                        contentStyle={{ background: '#101826', border: '1px solid #2c3a52' }}
                        formatter={(val) => [`${formatNumber(Number(val), 2)} млн $`, 'Стоимость']}
                      />
                      <Bar dataKey="value" fill="#7d97b3" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="outlook-hint">
                Полный год: UN Comtrade, HS 2701. Не извлечено из XLSX БНС и не смешивается с рядом
                Минэнерго.
                <QuietSource sourceId="unComtradeKazHs2701" />
              </p>
              {fy2025?.ministryCoalExportsTonnesMillion != null && fy2025.netWeightTonnes != null ? (
                <div className="outlook-callout">
                  <strong>Почему за 2025 есть два показателя?</strong>
                  <p>
                    Минэнерго сообщает о {formatNumber(fy2025.ministryCoalExportsTonnesMillion, 0)} млн т
                    экспорта угля за 2025 год. Отдельный ряд внешней торговли по ТН ВЭД 2701 составляет{' '}
                    {formatTonnes(fy2025.netWeightTonnes, 3).text} {formatTonnes(fy2025.netWeightTonnes, 3).unit}.
                    Показатели имеют различный источник и возможный методологический охват, поэтому в Coal
                    Monitor KZ они сохраняются отдельно и не объединяются.
                    <QuietSource sourceId="minenergo2025" />
                    <QuietSource sourceId="unComtradeKazHs2701" />
                  </p>
                </div>
              ) : null}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Методология</p>
                  <h2>Страна-партнёр и конечный потребитель</h2>
                </div>
              </header>
              <p className="outlook-lead">
                Страна-партнёр во внешнеторговой статистике не обязательно является конечным местом
                потребления угля. Это особенно важно при интерпретации Латвии, Литвы, Нидерландов, ОАЭ и
                других логистических направлений.
              </p>
              {rankingRows.some((row) => row.transit) ? (
                <p className="outlook-hint">
                  Пометка «возможен транзит / реэкспорт» означает только то, что страна-партнёр может не
                  совпадать с конечным потребителем. Она не является доказательством транзита.
                </p>
              ) : null}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Контекст</p>
                  <h2>Внешние рынки: факторы и ограничения</h2>
                </div>
              </header>
              <p className="outlook-hint">
                Это не рейтинг и не оценка «лучшего» рынка. Показаны факты текущего ряда и структурные
                ограничения с указанием источника.
              </p>
              <div className="exports-factor-grid">
                {EXPORT_MARKET_FACTORS.map((item) => {
                  const current = (ytdCmp?.countries || []).filter((row) => item.codes.includes(row.partnerCode))
                  return (
                    <article key={item.id} className="exports-factor-card">
                      <p className="outlook-kicker">{item.logisticsCase ? 'торгово-логистический кейс' : 'направление'}</p>
                      <h3>{item.title}</h3>
                      {current.length ? (
                        <ul className="exports-factor-metrics">
                          {current.map((row) => (
                            <li key={row.partnerCode}>
                              {countryNameRu(row.partnerCode, row.partnerCountry)}:{' '}
                              {row.currentTonnes != null
                                ? `${formatTonnes(row.currentTonnes).text} ${formatTonnes(row.currentTonnes).unit}`
                                : 'нет в январе–июле 2026'}
                              {partnerYoySuffix(row.volumeYoy)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="outlook-hint">Нет сопоставимого наблюдения в январе–июле 2026.</p>
                      )}
                      <p className="outlook-metric-caption">Факты</p>
                      <ul>
                        {item.facts.map((fact) => (
                          <li key={fact.text}>
                            {fact.text}
                            {(fact.sourceIds || []).map((id) => (
                              <QuietSource key={id} sourceId={id} />
                            ))}
                          </li>
                        ))}
                      </ul>
                      <p className="outlook-metric-caption">Ограничения</p>
                      <ul>
                        {item.constraints.map((fact) => (
                          <li key={fact.text}>
                            {fact.text}
                            {(fact.sourceIds || []).map((id) => (
                              <QuietSource key={id} sourceId={id} />
                            ))}
                          </li>
                        ))}
                      </ul>
                      <p className="outlook-hint">
                        {item.sourceIds.map((id) => (
                          <QuietSource key={id} sourceId={id} />
                        ))}
                      </p>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Как читать</p>
                  <h2>Методология</h2>
                </div>
              </header>
              <ul className="companies-legend-list">
                <li>
                  Основная товарная группа — каменный уголь, ТН ВЭД 2701. Ряды 2702 (лигнит), 2703 (торф) и
                  2704 (кокс) не смешиваются с этим разделом.
                </li>
                <li>
                  Январь–июль не сравнивается с полным годом. Полный 2026 год не прогнозируется и не
                  пересчитывается из семи месяцев.
                </li>
                <li>
                  Сопоставимый январь–июль 2025 восстановлен из официальных месячных таблиц БНС. Live-файл
                  публикации больше недоступен; использована архивная копия официального распространения БНС.
                  Подробности — в карточке источника.
                </li>
                <li>
                  Годовые итоги 2023–2025 — UN Comtrade, национальная отчётность Казахстана. Они не
                  выдаются за извлечённый XLSX БНС.
                </li>
                <li>
                  Отсутствие строки в периоде не записывается как ноль, если полнота набора не подтверждена.
                </li>
              </ul>
            </section>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
