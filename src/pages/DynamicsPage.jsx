import { useFilters } from '../context/FilterContext'
import { getPriceDynamics } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { PageHeader, SourceButton, StateBlock, StatusBadge } from '../components/ui'

export function DynamicsPage() {
  const { filters } = useFilters()
  const { data, loading, error } = useMarketData(getPriceDynamics, filters)

  return (
    <section>
      <PageHeader
        title="Динамика цен"
        description="Накопленный рост цен при первичной оптовой реализации по данным АЗРК за 2022–2025 годы. Показатели не переводятся в тенге за тонну."
      />
      <StateBlock
        loading={loading}
        error={error}
        empty={!data?.items?.length}
        emptyText={data?.emptyNote || 'Нет подтвержденных данных'}
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
      </StateBlock>
    </section>
  )
}
