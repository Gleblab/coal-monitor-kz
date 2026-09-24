import { getEnergyRole } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { KpiCard, PageHeader, StateBlock } from '../components/ui'

export function EnergyRolePage() {
  const { data, loading, error } = useMarketData(getEnergyRole, { region: 'all', coalType: 'all' })

  return (
    <section>
      <PageHeader
        title="Роль угля в энергетике Казахстана"
        description="Показатели топливно-энергетического баланса БНС за 2025 год. Общее первичное потребление и конечное потребление — разные статьи баланса."
      />
      <StateBlock
        loading={loading}
        error={error}
        empty={!data?.items?.length}
        emptyText="Нет подтвержденных данных по топливно-энергетическому балансу."
      >
        {data?.items?.length ? (
          <div
            data-energy-origin={data.energyDataOrigin}
            data-energy-count={data.energyRemoteCount ?? ''}
          >
            <p className="callout">{data.quote}</p>
            <div className="split">
              {data.items.map((item) => (
                <KpiCard key={item.id} item={item} />
              ))}
            </div>
            <p className="kpi-note other-fuels-note">{data.otherFuels}</p>
          </div>
        ) : null}
      </StateBlock>
    </section>
  )
}
