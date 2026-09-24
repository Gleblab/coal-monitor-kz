import { getResources } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { useFilters } from '../context/FilterContext'
import { PageHeader, SourceButton, StateBlock, StatusBadge } from '../components/ui'
import { formatNumber } from '../lib/format'
import { getSource } from '../data/catalog'

function DashCell({ cell }) {
  return (
    <span className="dash-cell" title={cell.title}>
      {cell.display}
    </span>
  )
}

export function ResourcesPage() {
  const { filters } = useFilters()
  const { data, loading, error } = useMarketData(getResources, filters)

  return (
    <section>
      <PageHeader
        title="Ресурсная база"
        description="Главный статистический показатель запасов БНС сохранён отдельно. Каталог активов справочный: бассейны, месторождения и предприятия не суммируются."
      />
      <StateBlock loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <article className="panel">
              <h2>Как читать ресурсную базу</h2>
              <p>{data.guide}</p>
            </article>
            <div
              className="split"
              data-reserves-origin={data.reservesDataOrigin}
              data-reserves-count={data.reservesRemoteCount ?? ''}
            >
              {data.reserves.length === 0 ? (
                <p className="state-block">Нет подтвержденных данных по запасам.</p>
              ) : (
                data.reserves.map((item) => (
                  <article key={item.id} className="panel">
                    <div className="kpi-top">
                      <StatusBadge status={item.status} />
                      <SourceButton sourceId={item.sourceId} />
                    </div>
                    <h2>{item.title}</h2>
                    <p className="hero-value">
                      {item.display}
                      {item.altDisplay ? <span className="kpi-alt">{item.altDisplay}</span> : null}
                    </p>
                    <p className="kpi-period">{item.period}</p>
                    <p className="kpi-note">{item.methodology}</p>
                  </article>
                ))
              )}
            </div>
            <article
              className="panel"
              data-extraction-origin={data.extractionDataOrigin}
              data-production-count={data.productionRemoteCount ?? ''}
            >
              <h2>Добыча в разных системах учета</h2>
              <p className="kpi-note">
                Показатели 90,2 млн т (БНС, 2024) и 115 млн т (Минэнерго, 2025) не являются взаимозаменяемыми.
              </p>
              <div className="split">
                {data.extraction.map((item) => (
                  <div key={item.id} className="mini-metric">
                    <div className="kpi-top">
                      <StatusBadge status={item.status} />
                      <SourceButton sourceId={item.sourceId} />
                    </div>
                    <h3>{item.title}</h3>
                    <p className="kpi-value">
                      {formatNumber(item.value)} <span className="kpi-unit">{item.unit}</span>
                    </p>
                    <p className="kpi-period">{item.period}</p>
                    <p className="kpi-note">{item.methodology}</p>
                  </div>
                ))}
              </div>
            </article>
            <article
              className="panel"
              data-assets-origin={data.assetsDataOrigin}
              data-assets-count={data.assetsRemoteCount ?? ''}
              data-companies-count={data.companiesRemoteCount ?? ''}
              data-regions-count={data.regionsRemoteCount ?? ''}
            >
              <h2>Ключевые угольные активы Казахстана</h2>
              <p className="kpi-note">
                Справочно-аналитический каталог, а не рейтинг запасов. Показатели предприятий не заменяют
                статистический учет запасов БНС (28,7185 млрд т на конец 2024 года).
              </p>
              {data.assetsEmpty ? (
                <p className="state-block">{data.assetsEmpty}</p>
              ) : (
                <div className="table-wrap">
                  <table className="assets-table">
                    <thead>
                      <tr>
                        <th>Объект</th>
                        <th>Тип объекта</th>
                        <th>Регион</th>
                        <th>Оператор / ключевой производитель</th>
                        <th>Тип/назначение угля</th>
                        <th>Запасы</th>
                        <th>Производственная мощность</th>
                        <th>Источник</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.assets.map((row) => {
                        const source = getSource(row.sourceId)
                        const sourceUrl = row.sourceUrl || source?.url
                        return (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.name}</strong>
                              {row.note ? <p className="kpi-note">{row.note}</p> : null}
                            </td>
                            <td>{row.objectType}</td>
                            <td>
                              <DashCell
                                cell={
                                  row.region === '—'
                                    ? {
                                        display: '—',
                                        title: 'Сопоставимые подтвержденные данные пока отсутствуют',
                                      }
                                    : { display: row.region, title: row.region }
                                }
                              />
                            </td>
                            <td>
                              {row.operator === '—' ? (
                                <DashCell
                                  cell={{
                                    display: '—',
                                    title: 'Сопоставимые подтвержденные данные пока отсутствуют',
                                  }}
                                />
                              ) : (
                                row.operator
                              )}
                            </td>
                            <td>{row.coalUse}</td>
                            <td>
                              <DashCell cell={row.reserves} />
                            </td>
                            <td>
                              <DashCell cell={row.capacity} />
                            </td>
                            <td>
                              <StatusBadge status={row.status} />
                              <div className="source-cell">
                                {row.sourceId ? <SourceButton sourceId={row.sourceId} /> : null}
                                {sourceUrl ? (
                                  <a href={sourceUrl} target="_blank" rel="noreferrer">
                                    {source?.organization || 'Первоисточник'}
                                  </a>
                                ) : (
                                  <span className="kpi-note">
                                    Отдельный официальный показатель запасов бассейна в текущей модели не приведён.
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
