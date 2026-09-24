import { Link } from 'react-router-dom'
import { useFilters } from '../context/FilterContext'
import { getOverview, getEnergyRole } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { KpiCard, PageHeader, StateBlock } from '../components/ui'

export function OverviewPage() {
  const { filters } = useFilters()
  const { data, loading, error } = useMarketData(getOverview, filters)
  const energy = useMarketData(getEnergyRole, filters)

  return (
    <section>
      <PageHeader
        title="Обзор рынка угля"
        description="На главной странице только показатели, подтверждённые официальными публикациями БНС, Министерства энергетики, АЗРК и акимата г. Астаны."
      />
      <StateBlock loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            {data.regionalNote ? <p className="context-line">{data.regionalNote}</p> : null}
            <div
              className="kpi-grid six"
              data-kpis-origin={data.kpisDataOrigin}
            >
              {data.kpis.map((item) => (
                <KpiCard key={item.id} item={item} />
              ))}
            </div>
            <StateBlock
              loading={energy.loading}
              error={energy.error}
              empty={!energy.data?.items?.length}
              emptyText="Нет подтвержденных данных по топливно-энергетическому балансу."
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
    </section>
  )
}
