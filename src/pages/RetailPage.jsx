import { useFilters } from '../context/FilterContext'
import { getRetailPrices } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { PageHeader, SourceButton, StateBlock, StatusBadge } from '../components/ui'
import { formatNumber } from '../lib/format'

export function RetailPage() {
  const { filters } = useFilters()
  const { data, loading, error } = useMarketData(getRetailPrices, filters)

  return (
    <section>
      <PageHeader
        title="Региональный мониторинг розничных цен"
        description="Раздел не является обзором средних цен по Казахстану. Сейчас подтверждены только значения акимата г. Астаны."
      />
      <StateBlock
        loading={loading}
        error={error}
        empty={!data?.items?.length}
        emptyText={data?.emptyNote || 'Нет подтвержденных данных'}
      >
        {data?.items?.length ? (
          <>
            <p className="callout">{data.disclaimer}</p>
            <div className="kpi-top page-source">
              <StatusBadge status="Региональные данные" />
              <SourceButton sourceId="astanaAkimat" />
            </div>
            <div
              className="kpi-grid three"
              data-prices-origin={data.pricesDataOrigin}
              data-prices-count={data.pricesRemoteCount ?? ''}
            >
              {data.items.map((item) => (
                <article key={item.id} className="kpi-card">
                  <p className="kpi-label">{item.product}</p>
                  <p className="kpi-value">
                    {formatNumber(item.value, 0)}
                    <span className="kpi-unit">{item.unit}</span>
                  </p>
                  <p className="kpi-period">{item.geography || 'г. Астана'} · розничная цена</p>
                  <p className="kpi-note">{item.note}</p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
