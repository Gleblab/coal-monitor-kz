import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEnergyRole, getMarketIntelligence, getOutlook, getOverview } from '../api/marketApi'
import { ChangePreview } from '../components/overview/ChangePreview'
import { DataCoverageStrip } from '../components/overview/DataCoverageStrip'
import { ExecutiveBrief } from '../components/overview/ExecutiveBrief'
import { MarketPulse } from '../components/overview/MarketPulse'
import { Monitor2026Preview } from '../components/overview/Monitor2026Preview'
import { MarketIntelligence } from '../components/intelligence/MarketIntelligence'
import { MetricInspector } from '../components/intelligence/MetricInspector'
import { SignalDetail } from '../components/intelligence/SignalDetail'
import { KpiCard, NoData, PageHeader, StateBlock } from '../components/ui'
import { DataSkeleton } from '../components/DataSkeleton'
import { useOverviewAwakening } from '../hooks/useOverviewAwakening'
import { useMarketData } from '../hooks/useMarketData'
import { buildCoverageItems, buildExecutiveBrief, OVERVIEW_DEEP_LINKS } from '../lib/overviewCommand'

const OVERVIEW_COMPARABLE = new Set(['production2025', 'export2025', 'domestic2025', 'bnsIndustrial2025'])

export function OverviewPage() {
  const { data, loading, error, reload } = useMarketData(getOverview)
  const energy = useMarketData(getEnergyRole)
  const intelligence = useMarketData(getMarketIntelligence)
  const outlook = useMarketData(getOutlook)
  const awakening = useOverviewAwakening(Boolean(data))
  const [openSignal, setOpenSignal] = useState(null)
  const [openKpi, setOpenKpi] = useState(null)
  const related = data
    ? {
        bns2025:
          data.kpis.find((item) => item.id === 'bnsIndustrial2025' && item.origin === 'supabase') || null,
        ministry2025:
          data.kpis.find((item) => item.id === 'production2025' && item.origin === 'supabase') || null,
      }
    : null

  const briefLines = useMemo(() => buildExecutiveBrief(intelligence.data), [intelligence.data])
  const coverageItems = useMemo(
    () => buildCoverageItems({ overview: data, intelligence: intelligence.data, outlook: outlook.data }),
    [data, intelligence.data, outlook.data],
  )

  function openSignalDetail(signal) {
    setOpenKpi(null)
    setOpenSignal(signal)
  }

  function openKpiInspector(item) {
    setOpenSignal(null)
    setOpenKpi(item)
  }

  return (
    <section className={`overview-page${awakening ? ' is-awakening' : ''}`}>
      {awakening && data ? (
        <>
          <div className="overview-awake-scan" aria-hidden="true" />
          <div className="overview-awake-sweep" aria-hidden="true" />
        </>
      ) : null}
      <PageHeader
        title="Обзор рынка угля"
        description="Точка входа в подтверждённую аналитику. Первое упоминание: Бюро национальной статистики (БНС). Показатели БНС, Министерства энергетики, АЗРК и акимата г. Астаны публикуются в своих контурах и не смешиваются."
      />
      <StateBlock loading={loading} error={error} empty={!data} skeleton="cards" onRetry={reload}>
        {data ? (
          <>
            {data.regionalNote ? <p className="context-line">{data.regionalNote}</p> : null}
            {intelligence.loading && !intelligence.data ? (
              <DataSkeleton variant="compact" />
            ) : (
              <MarketPulse facts={intelligence.data?.pulseFacts} />
            )}
            <p className="scope-badge">Национальные показатели</p>
            <div className="kpi-grid six" data-kpis-origin={data.kpisDataOrigin}>
              {data.kpis.map((item) =>
                item.origin === 'supabase' && item.value != null ? (
                <KpiCard
                  key={item.id}
                  item={item}
                  comparable={OVERVIEW_COMPARABLE.has(item.id)}
                  comparisonExtras={{
                    route: '/',
                    methodology:
                      item.id === 'bnsIndustrial2025'
                        ? 'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.'
                        : item.methodology || item.note,
                    label: item.id === 'bnsIndustrial2025' ? 'Добыча угля — данные БНС' : undefined,
                  }}
                  traceable
                  traceExtras={{
                    related,
                    route:
                      item.id === 'export2025'
                        ? '/exports'
                        : item.id === 'bnsReserves'
                          ? '/resources'
                          : item.id === 'plan2026'
                            ? '/outlook'
                            : '/production',
                    methodology:
                      item.id === 'bnsIndustrial2025'
                        ? 'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.'
                        : item.methodology || item.note,
                    label: item.id === 'bnsIndustrial2025' ? 'Добыча угля — данные БНС' : undefined,
                  }}
                  onInspect={() => openKpiInspector(item)}
                />
                ) : (
                  <article key={item.id} className="kpi-card">
                    <p className="kpi-label">{item.label}</p>
                    <NoData text="Нет подтверждённых данных" />
                  </article>
                ),
              )}
            </div>
            <div className="cmd-split">
              <ChangePreview />
              <ExecutiveBrief lines={briefLines} />
            </div>
            <Monitor2026Preview outlook={outlook.data} loading={outlook.loading} error={outlook.error} />
            <MarketIntelligence pack={intelligence.data} onOpenSignal={openSignalDetail} showBrief={false} />
            <DataCoverageStrip items={coverageItems} />
            <nav className="cmd-links" aria-label="Разделы мониторинга">
              {OVERVIEW_DEEP_LINKS.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <StateBlock
              loading={energy.loading}
              error={energy.error}
              empty={!energy.data?.items?.length}
              emptyText="Нет подтвержденных данных по топливно-энергетическому балансу."
              skeleton="compact"
              onRetry={energy.reload}
            >
              {energy.data?.items?.length ? (
                <article
                  className="panel energy-preview"
                  data-energy-origin={energy.data.energyDataOrigin}
                  data-energy-count={energy.data.energyRemoteCount ?? ''}
                >
                  <div className="panel-head">
                    <h2>Роль угля в энергетике Казахстана</h2>
                    <Link to="/energy-role">Открыть блок</Link>
                  </div>
                  <p className="scope-badge">Национальный показатель</p>
                  <p className="callout">{energy.data.quote}</p>
                  <div className="split">
                    {energy.data.items.map((item) => (
                      <KpiCard key={item.id} item={item} />
                    ))}
                  </div>
                </article>
              ) : null}
            </StateBlock>
          </>
        ) : null}
      </StateBlock>
      {openSignal ? <SignalDetail signal={openSignal} onClose={() => setOpenSignal(null)} /> : null}
      {openKpi ? (
        <MetricInspector
          item={openKpi}
          conflict={intelligence.data?.conflicts?.[openKpi.id] || null}
          sourceByCode={intelligence.data?.sourceByCode}
          onClose={() => setOpenKpi(null)}
        />
      ) : null}
    </section>
  )
}
