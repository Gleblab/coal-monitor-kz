import { getSourcesCatalog } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { PageHeader, StateBlock, StatusBadge } from '../components/ui'

export function SourcesPage() {
  const { data, loading, error } = useMarketData(getSourcesCatalog, {
    region: 'all',
    coalType: 'all',
  })
  const items = data?.items || []

  return (
    <section>
      <PageHeader
        title="Источники данных"
        description="Каждый показатель основного контура привязан к государственной публикации. Ссылки ведут на первоисточник."
      />
      <StateBlock
        loading={loading}
        error={error}
        empty={!items.length}
        emptyText="Нет подтвержденных опубликованных источников."
      >
        <div
          className="source-list"
          data-sources-origin={data?.sourcesDataOrigin}
          data-sources-count={data?.sourcesRemoteCount ?? ''}
        >
          {items.map((item) => (
            <article key={item.id} className="panel">
              <div className="kpi-top">
                <StatusBadge status={item.sourceStatus} />
              </div>
              <h2>{item.organization}</h2>
              <dl className="source-dl">
                <dt>Публикация</dt>
                <dd>{item.publication}</dd>
                {item.period ? (
                  <>
                    <dt>Дата публикации</dt>
                    <dd>{item.period}</dd>
                  </>
                ) : null}
                {item.notes ? (
                  <>
                    <dt>Методологическая заметка</dt>
                    <dd>{item.notes}</dd>
                  </>
                ) : null}
                {item.indicators?.length ? (
                  <>
                    <dt>Какие показатели используются</dt>
                    <dd>
                      <ul>
                        {item.indicators.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </dd>
                  </>
                ) : null}
                <dt>Ссылка</dt>
                <dd>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </dd>
              </dl>
            </article>
          ))}
        </div>
      </StateBlock>
    </section>
  )
}
