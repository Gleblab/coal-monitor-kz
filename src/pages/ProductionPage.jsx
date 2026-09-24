import { getProduction } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { KpiCard, NoData, PageHeader, StateBlock } from '../components/ui'
import { formatNumber } from '../lib/format'

export function ProductionPage() {
  const { data, loading, error } = useMarketData(getProduction, { region: 'all', coalType: 'all' })

  return (
    <section>
      <PageHeader
        title="Объёмы и баланс"
        description="Фактические итоги 2025 года и план 2026 года публикуются Министерством энергетики. План не подписывается как факт."
      />
      <StateBlock loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <div
              className="kpi-grid"
              data-production-origin={data.productionDataOrigin}
              data-production-count={data.productionRemoteCount ?? ''}
            >
              {data.extraction.length === 0 ? (
                <NoData text="Нет подтвержденных данных по добыче." />
              ) : (
                data.extraction.map((item) => (
                  <KpiCard
                    key={item.id}
                    item={{
                      ...item,
                      label: item.title,
                      display: formatNumber(item.value),
                    }}
                  />
                ))
              )}
            </div>
            <div
              className="kpi-grid"
              data-flows-origin={data.flowsDataOrigin}
              data-trade-count={data.tradeRemoteCount ?? ''}
            >
              {data.flows.length === 0 ? (
                <NoData text="Нет подтвержденных данных по внутреннему направлению и экспорту." />
              ) : (
                data.flows.map((item) => <KpiCard key={item.id} item={item} />)
              )}
            </div>
            <div
              className="kpi-grid"
              data-indicators-origin={data.indicatorsDataOrigin}
              data-industry-count={data.industryRemoteCount ?? ''}
            >
              {data.plan ? <KpiCard item={data.plan} /> : null}
              {data.users ? <KpiCard item={data.users} /> : null}
              {data.investments.map((item) => (
                <KpiCard key={item.id} item={item} />
              ))}
            </div>
            <article className="panel">
              <h2>Методологическое предупреждение</h2>
              <p>
                90,2 млн т — добыча 2024 года в статистическом счете БНС. 115 млн т — добыча 2025 года по
                сообщению Минэнерго. 128,9 млн т — план добычи на 2026 год, а не фактическая добыча 2026 года.
              </p>
            </article>
            {data.missingMonthly.map((text) => (
              <NoData key={text} text={text} />
            ))}
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
