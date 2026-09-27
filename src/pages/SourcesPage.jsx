import { useMemo, useState } from 'react'
import { getSourcesCatalog } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { DataQualityCenter } from '../components/intelligence/DataQualityCenter'
import { PageHeader, StateBlock, StatusBadge } from '../components/ui'
import { filterSourceCatalog } from '../lib/dataQuality'

export function SourcesPage() {
  const { data, loading, error, reload } = useMarketData(getSourcesCatalog, {
    region: 'all',
    coalType: 'all',
  })
  const [query, setQuery] = useState('')
  const items = data?.items || []
  const visibleCatalog = useMemo(() => filterSourceCatalog(items, query), [items, query])

  return (
    <section className="sources-page">
      <PageHeader
        title="Источники данных"
        description="Насколько свежие и полные данные доступны по разделам. Каталог официальных публикаций сохранён ниже."
      />
      <StateBlock
        loading={loading}
        error={error}
        empty={!items.length && !data?.quality?.contours?.length}
        emptyText="Нет подтвержденных опубликованных источников."
        skeleton="content"
        onRetry={reload}
      >
        <DataQualityCenter pack={data?.quality} query={query} onQueryChange={setQuery} />

        <div
          className="source-list"
          data-sources-origin={data?.sourcesDataOrigin}
          data-sources-count={data?.sourcesRemoteCount ?? ''}
        >
          <header className="intel-monitor-head">
            <div>
              <h2>Каталог первоисточников</h2>
              <p className="chart-hint">
                Официальные публикации и корпоративные первоисточники, используемые в аналитических разделах проекта.
              </p>
            </div>
          </header>
          {visibleCatalog.length ? (
            visibleCatalog.map((item) => (
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
                  {item.usedIn?.length ? (
                    <>
                      <dt>Используется в</dt>
                      <dd>{item.usedIn.map((row) => row.label).join(' · ')}</dd>
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
            ))
          ) : (
            <p className="intel-monitor-empty">По запросу в каталоге ничего не найдено.</p>
          )}
        </div>
      </StateBlock>
    </section>
  )
}
