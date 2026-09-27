import { useFilters } from '../context/FilterContext'
import { getRetailPage } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { LoadErrorState, NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import {
  RetailAstanaChart,
  RetailBrandRanges,
  RetailGeoPlot,
  RetailStockScatter,
} from '../components/retail/RetailCharts'
import { formatNumber } from '../lib/format'
import { pluralizeBrand, pluralizeLocality, pluralizeObservation, pluralizeRegion } from '../lib/retailAnalytics'
import { useSources } from '../context/SourceContext'

function formatKzt(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return formatNumber(value, 0)
}

function formatSupplyValue(item) {
  const value = item?.value
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  if (item.unit === 'млн т') return formatNumber(value, 1)
  return formatNumber(value, 0)
}

function PriceFigure({ value, rangeMax }) {
  const text =
    rangeMax != null && rangeMax !== value
      ? `${formatKzt(value)}–${formatKzt(rangeMax)}`
      : formatKzt(value)
  return (
    <span className="retail-price-figure">
      <span>{text}</span>
      <span className="retail-price-unit">₸/т</span>
    </span>
  )
}

function sharePercent(part, total) {
  if (typeof part !== 'number' || typeof total !== 'number' || !(total > 0) || Number.isNaN(part)) {
    return null
  }
  return (part / total) * 100
}

function pickSupply(items, test) {
  return (items || []).find((item) => test(item)) || null
}

function uniqueSources(items) {
  return [
    ...new Map(
      (items || [])
        .filter((item) => item.source?.code)
        .map((item) => [item.source.code, item.source]),
    ).values(),
  ]
}

function SourceName({ sourceId, children }) {
  const { openSource } = useSources()
  if (!sourceId) return <span>{children}</span>
  return (
    <button type="button" className="retail-source-name" onClick={() => openSource(sourceId)}>
      {children}
    </button>
  )
}

function FreshnessTag({ label }) {
  if (!label) return null
  const text =
    label === 'undated' ? 'без даты в dataset' : label === '2026' || label === '2025' ? label : label
  return <span className={`retail-freshness is-${label === 'undated' ? 'undated' : label}`}>{text}</span>
}

export function RetailPage() {
  const { filters } = useFilters()
  const { data, loading, error, reload } = useMarketData(getRetailPage, filters)
  const coverage = data?.coverage
  const supplyPool = data?.ok ? [...(data.nationalSupply || []), ...(data.localSupply || [])] : []
  const shubarkolPlan = pickSupply(supplyPool, (item) => item.source?.code === 'etsShubarkol2026')
  const karazhyraTotal = pickSupply(
    supplyPool,
    (item) => item.source?.code === 'ccxKarazhyraPlan2026' && /внутренн/i.test(item.indicator || ''),
  )
  const karazhyraDirect = pickSupply(
    supplyPool,
    (item) => item.source?.code === 'ccxKarazhyraPlan2026' && /прям/i.test(item.indicator || ''),
  )
  const karazhyraExchange = pickSupply(
    supplyPool,
    (item) => item.source?.code === 'ccxKarazhyraPlan2026' && /биржев/i.test(item.indicator || ''),
  )
  const seasonDemand = pickSupply(supplyPool, (item) => /потребност/i.test(item.indicator || ''))
  const operators = pickSupply(supplyPool, (item) => /оператор/i.test(item.indicator || ''))
  const sidings = pickSupply(supplyPool, (item) => /тупик/i.test(item.indicator || ''))
  const oskemenSupply = pickSupply(supplyPool, (item) => item.group === 'local-plan')

  return (
    <section className="retail-page">
      <PageHeader
        title="Розничные цены"
        description="Официальные наблюдения цен на коммунально-бытовой уголь по территориям, маркам и продавцам. Не средняя цена по Казахстану."
      />
      <StateBlock loading={loading} error={error} empty={!data} skeleton="chart" onRetry={reload}>
        {data == null ? null : data.ok === false ? (
          <LoadErrorState onRetry={reload} />
        ) : data.empty ? (
          <NoData text={data.emptyNote} />
        ) : (
          <>
            <div className="retail-meta" data-retail-count={coverage?.count ?? ''}>
              {coverage?.latestYear ? (
                <p className="retail-latest">
                  Максимальный доступный период: <strong>{coverage.latestYear}</strong>
                </p>
              ) : (
                <p className="retail-latest">В текущей выборке нет подтверждённого календарного периода</p>
              )}
            </div>

            <section className="panel">
              <div className="panel-head">
                <h2>Последние подтверждённые цены</h2>
              </div>
              <p className="chart-hint">Срезы разных территорий не приведены к одной дате.</p>
              <div className="retail-exec">
                {!data.astanaLatest.brands.length && !data.oskemen2026.length ? (
                  <p className="kpi-note">
                    В этом региональном срезе нет отдельного городского snapshot; ниже — все наблюдения выборки.
                  </p>
                ) : null}
                {data.astanaLatest.brands.length ? (
                  <article>
                    <div className="retail-exec-head">
                      <h3>Астана</h3>
                    </div>
                    <p className="retail-exec-kicker">
                      {data.astanaLatest.sliceLabel
                        ? `Официальный срез ${data.astanaLatest.sliceLabel}`
                        : 'Официальный срез Астаны'}
                    </p>
                    <p className="retail-year-unknown">Дата публикации в dataset не подтверждена.</p>
                    <ul className="retail-price-list">
                      {data.astanaLatest.brands.map((item) => (
                        <li key={item.brand}>
                          <span>{item.brand}</span>
                          <PriceFigure value={item.price} />
                        </li>
                      ))}
                    </ul>
                    <QuietSource sourceId="astanaAkimat" />
                  </article>
                ) : null}
                {data.oskemen2026.length ? (
                  <article>
                    <div className="retail-exec-head">
                      <h3>Усть-Каменогорск</h3>
                      <FreshnessTag label="2026" />
                    </div>
                    <p className="retail-exec-kicker">
                      Сезон 2026–2027. Наблюдаемый диапазон по опубликованным продавцам — не средняя цена города.
                    </p>
                    <ul className="retail-price-list">
                      {data.oskemen2026.map((item) => (
                        <li key={item.brand}>
                          <span>{item.brand}</span>
                          <PriceFigure value={item.min} rangeMax={item.max} />
                          <em>{pluralizeObservation(item.count)}</em>
                        </li>
                      ))}
                    </ul>
                    <QuietSource sourceId="vkoOskemenCoal2026" />
                  </article>
                ) : null}
              </div>
            </section>

            {data.showAstanaHistory ? (
              <section className="panel">
                <div className="panel-head">
                  <h2>Сравнение опубликованных розничных цен в Астане</h2>
                  <QuietSource sourceId="astanaAkimat" />
                </div>
                <p className="chart-hint">
                  Цены на марки угля в отдельных официальных публикациях акимата. Каждый столбец — отдельная публикация с зафиксированными на тот момент розничными ценами.
                </p>
                <p className="chart-hint">Для части публикаций точная дата не подтверждена.</p>
                <RetailAstanaChart pack={data.astanaHistory} />
              </section>
            ) : (
              <p className="callout">
                Опубликованные розничные цены Астаны относятся к г. Астана и не применяются к выбранному региону.
              </p>
            )}

            <section className="panel">
              <div className="panel-head">
                <h2>Розничные цены по населённым пунктам</h2>
              </div>
              <p className="chart-hint">Опубликованные розничные цены на уголь по населённым пунктам и маркам, ₸/т.</p>
              {data.geo.length ? (
                <RetailGeoPlot points={data.geo} />
              ) : (
                <NoData text="Для выбранного региона подтверждённых розничных наблюдений в базе нет." />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Наблюдаемые диапазоны цен по маркам</h2>
              </div>
              <p className="chart-hint">Минимальная и максимальная опубликованная розничная цена в текущей выборке.</p>
              <p className="chart-hint">
                Это диапазон наблюдений, а не средняя цена марки и не диапазон цен по всему Казахстану.
              </p>
              {data.brands.rows.length ? (
                <RetailBrandRanges pack={data.brands} />
              ) : (
                <NoData text="Нет точечных цен для сравнения марок в текущей выборке." />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Цена и наличие на момент наблюдения</h2>
              </div>
              {data.stock.length ? (
                <>
                  <RetailStockScatter points={data.stock} />
                  <p className="chart-hint">
                    Цена и запас опубликованы для одного наблюдения; график не предполагает причинной связи.
                  </p>
                  <div className="table-wrap retail-stock-table">
                    <table className="assets-table">
                      <thead>
                        <tr>
                          <th>Населённый пункт</th>
                          <th>Марка</th>
                          <th>Продавец</th>
                          <th>Цена</th>
                          <th>Запас</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.stock]
                          .sort((a, b) =>
                            `${a.locality}${a.brand}${a.seller || ''}`.localeCompare(
                              `${b.locality}${b.brand}${b.seller || ''}`,
                              'ru',
                            ),
                          )
                          .map((row) => (
                            <tr key={row.id}>
                              <td>{row.locality}</td>
                              <td>
                                {row.brand}
                                {row.variant ? ` (${row.variant})` : ''}
                              </td>
                              <td>{row.seller || '—'}</td>
                              <td>
                                <span className="retail-num">
                                  {formatKzt(row.price)} <span className="retail-price-unit">₸/т</span>
                                </span>
                              </td>
                              <td>
                                <span className="retail-num">
                                  {formatNumber(row.stockTonnes, 0)} <span className="retail-price-unit">т</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <NoData text="В текущей выборке нет наблюдений с одновременно указанными ценой и запасом." />
              )}
            </section>

            <section className="panel retail-contour">
              <div className="panel-head">
                <h2>Контур 2026</h2>
              </div>
              <p className="chart-hint">
                Розничные наблюдения, планы поставок и параметры отопительного сезона. Планы не являются фактом поставки.
              </p>
              {data.supplyError ? (
                <p className="kpi-note">Контекст поставок 2026 не загрузился: {data.supplyError}</p>
              ) : null}
              {data.region && data.region !== 'all' ? (
                <p className="chart-hint">Планы и сезон — национальный / отраслевой контекст, не срез выбранного региона.</p>
              ) : null}
              <div className="retail-contour-grid">
                <section className="retail-contour-col">
                  <p className="retail-contour-index">01</p>
                  <h3 className="retail-block-title">Розничный срез</h3>
                  {data.oskemen2026.length ? (
                    <>
                      <p className="retail-plan-name">Усть-Каменогорск</p>
                      <p className="retail-plan-caption">Сезон 2026–2027</p>
                      <ul className="retail-price-list">
                        {data.oskemen2026.map((item) => (
                          <li key={`y-${item.brand}`}>
                            <span>{item.brand}</span>
                            <PriceFigure value={item.min} rangeMax={item.max} />
                            <em>{pluralizeObservation(item.count)}</em>
                          </li>
                        ))}
                      </ul>
                      <p className="retail-plan-caption">Опубликованные цены отдельных продавцов, не средняя цена города.</p>
                      <p className="retail-attr">
                        <SourceName sourceId="vkoOskemenCoal2026">Акимат Усть-Каменогорска</SourceName>
                      </p>
                    </>
                  ) : (
                    <p className="kpi-note">В текущей выборке нет датированных розничных наблюдений 2026.</p>
                  )}
                </section>

                <section className="retail-contour-col">
                  <p className="retail-contour-index">02</p>
                  <h3 className="retail-block-title">Планы поставок</h3>
                  <p className="retail-plan-caption">План — не факт поставки.</p>
                  {shubarkolPlan ? (
                    <div className="retail-plan-item">
                      <p className="retail-eyebrow">Шубарколь Комир</p>
                      <p className="retail-plan-value">
                        {formatSupplyValue(shubarkolPlan)}
                        <span className="retail-price-unit">{shubarkolPlan.unit}</span>
                      </p>
                      <p className="retail-plan-caption">биржевой план</p>
                    </div>
                  ) : null}
                  {karazhyraTotal ? (
                    <div className="retail-plan-item">
                      <p className="retail-eyebrow">Каражыра</p>
                      <p className="retail-plan-value">
                        {formatSupplyValue(karazhyraTotal)}
                        <span className="retail-price-unit">{karazhyraTotal.unit}</span>
                      </p>
                      <p className="retail-plan-caption">план поставок на внутренний рынок</p>
                      {karazhyraDirect && karazhyraExchange && Number(karazhyraTotal.value) > 0 ? (
                        <figure className="retail-compose">
                          <figcaption className="retail-compose-label">Структура плана поставок</figcaption>
                          <p className="retail-plan-caption">
                            Из общего плана {formatSupplyValue(karazhyraTotal)} {karazhyraTotal.unit}
                          </p>
                          <div className="retail-compose-track" aria-hidden="true">
                            <span
                              className="retail-compose-seg is-direct"
                              style={{
                                width: `${(karazhyraDirect.value / karazhyraTotal.value) * 100}%`,
                              }}
                            />
                            <span
                              className="retail-compose-seg is-exchange"
                              style={{
                                width: `${(karazhyraExchange.value / karazhyraTotal.value) * 100}%`,
                              }}
                            />
                          </div>
                          <ul className="retail-compose-legend">
                            <li>
                              <span className="retail-compose-swatch is-direct" aria-hidden="true" />
                              <span>
                                Прямые контракты
                                <strong>
                                  {formatSupplyValue(karazhyraDirect)}
                                  <span className="retail-price-unit">{karazhyraDirect.unit}</span>
                                  {sharePercent(karazhyraDirect.value, karazhyraTotal.value) != null ? (
                                    <span className="retail-compose-pct">
                                      · {formatNumber(sharePercent(karazhyraDirect.value, karazhyraTotal.value), 1)}%
                                    </span>
                                  ) : null}
                                </strong>
                              </span>
                            </li>
                            <li>
                              <span className="retail-compose-swatch is-exchange" aria-hidden="true" />
                              <span>
                                Биржа
                                <strong>
                                  {formatSupplyValue(karazhyraExchange)}
                                  <span className="retail-price-unit">{karazhyraExchange.unit}</span>
                                  {sharePercent(karazhyraExchange.value, karazhyraTotal.value) != null ? (
                                    <span className="retail-compose-pct">
                                      · {formatNumber(sharePercent(karazhyraExchange.value, karazhyraTotal.value), 1)}%
                                    </span>
                                  ) : null}
                                </strong>
                              </span>
                            </li>
                          </ul>
                        </figure>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="retail-attr">
                    {shubarkolPlan ? <SourceName sourceId={shubarkolPlan.source?.code}>ETS</SourceName> : null}
                    {shubarkolPlan && karazhyraTotal ? <span> · </span> : null}
                    {karazhyraTotal ? <SourceName sourceId={karazhyraTotal.source?.code}>CCX</SourceName> : null}
                  </p>
                </section>

                <section className="retail-contour-col">
                  <p className="retail-contour-index">03</p>
                  <h3 className="retail-block-title">Сезон и инфраструктура</h3>
                  {seasonDemand ? (
                    <div className="retail-plan-item">
                      <p className="retail-plan-value retail-plan-value-lg">
                        {formatSupplyValue(seasonDemand)}
                        <span className="retail-price-unit">{seasonDemand.unit}</span>
                      </p>
                      <p className="retail-plan-caption">предварительная потребность регионов, сезон 2026–2027</p>
                    </div>
                  ) : null}
                  <div className="retail-infra-pair">
                    {operators ? (
                      <div>
                        <p className="retail-plan-value">{formatSupplyValue(operators)}</p>
                        <p className="retail-plan-caption">угольных операторов</p>
                      </div>
                    ) : null}
                    {sidings ? (
                      <div>
                        <p className="retail-plan-value">{formatSupplyValue(sidings)}</p>
                        <p className="retail-plan-caption">железнодорожный тупик</p>
                      </div>
                    ) : null}
                  </div>
                  {oskemenSupply ? (
                    <div className="retail-plan-item">
                      <p className="retail-plan-value">
                        {formatSupplyValue(oskemenSupply)}
                        <span className="retail-price-unit">{oskemenSupply.unit}</span>
                      </p>
                      <p className="retail-plan-caption">план обеспечения населения Усть-Каменогорска</p>
                    </div>
                  ) : null}
                  <p className="retail-attr">
                    {seasonDemand || operators || sidings ? (
                      <SourceName sourceId="kaenkHouseholdCoal2026">Минэнерго РК</SourceName>
                    ) : null}
                    {(seasonDemand || operators || sidings) && oskemenSupply ? <span> · </span> : null}
                    {oskemenSupply ? (
                      <SourceName sourceId="vkoOskemenCoal2026">Акимат Усть-Каменогорска</SourceName>
                    ) : null}
                  </p>
                </section>
              </div>
            </section>

            <section className="panel retail-coverage">
              <div className="panel-head">
                <h2>Покрытие и качество данных</h2>
              </div>
              <p className="chart-hint">Фактический охват текущей выборки и границы анализа.</p>
              <ul className="retail-coverage-kpis">
                <li>
                  <strong>{coverage?.count ?? 0}</strong>
                  <span>{pluralizeObservation(coverage?.count ?? 0).replace(/^\d+\s/, '')}</span>
                </li>
                <li>
                  <strong>{coverage?.regionCount ?? 0}</strong>
                  <span>{pluralizeRegion(coverage?.regionCount ?? 0).replace(/^\d+\s/, '')}</span>
                </li>
                <li>
                  <strong>{coverage?.localityCount ?? 0}</strong>
                  <span>{pluralizeLocality(coverage?.localityCount ?? 0).replace(/^\d+\s/, '')}</span>
                </li>
                <li>
                  <strong>{coverage?.brandCount ?? 0}</strong>
                  <span>{pluralizeBrand(coverage?.brandCount ?? 0).replace(/^\d+\s/, '')}</span>
                </li>
                <li>
                  <strong>{coverage?.stockCount ?? 0}</strong>
                  <span>с запасом</span>
                </li>
              </ul>
              <dl className="retail-coverage-status">
                <div>
                  <dt>Розничные цены</dt>
                  <dd>
                    {coverage?.count ? 'Доступны' : 'Нет наблюдений'}
                    {coverage?.regionNames?.length ? ` · ${coverage.regionNames.join(' · ')}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Наличие / запас</dt>
                  <dd>
                    {coverage?.stockCount && coverage.stockCount < (coverage.count || 0)
                      ? `Частичное покрытие · ${coverage.stockCount} из ${coverage.count} наблюдений`
                      : coverage?.stockCount
                        ? `${coverage.stockCount} из ${coverage.count} наблюдений`
                        : 'В выборке нет наблюдений с запасом'}
                  </dd>
                </div>
                <div>
                  <dt>Временная полнота</dt>
                  <dd>
                    {coverage?.undatedCount
                      ? 'Ограничена · для части официальных публикаций дата не подтверждена в наборе данных'
                      : 'У наблюдений выборки есть подтверждённый период'}
                  </dd>
                </div>
                <div>
                  <dt>Актуальность</dt>
                  <dd>
                    Максимальный доступный период: {coverage?.latestYear ?? 'не датирован'}.
                    {coverage?.dated2026Localities?.length
                      ? ` Подтверждённые розничные наблюдения 2026: ${coverage.dated2026Localities.join(' · ')}.`
                      : ' Подтверждённых розничных наблюдений 2026 в выборке нет.'}
                    {(data.items || []).some((item) => item.region?.code === 'astana')
                      ? ' Астана: дата последнего официального среза не подтверждена.'
                      : ''}
                  </dd>
                </div>
              </dl>
              <p className="retail-coverage-bound">
                <strong>Граница анализа.</strong> Розничные графики используют только retail observations. Цены производителей, биржевые цены и планы поставок не смешиваются с розничными ценами. Планы поставок показываются отдельно в Контуре 2026.
              </p>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Источники этого раздела</h2>
              </div>
              <p className="chart-hint">
                Источник привязан к наблюдению или показателю. Один URL не подтверждает весь раздел.
              </p>
              <div className="retail-source-groups">
                <div>
                  <p className="retail-eyebrow">Розничные наблюдения</p>
                  <ul className="retail-source-list">
                    {uniqueSources(data.items).map((source) => (
                      <li key={source.code}>
                        <SourceName sourceId={source.code}>{source.organization || source.code}</SourceName>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="retail-eyebrow">Планы и инфраструктура</p>
                  <ul className="retail-source-list">
                    {uniqueSources([...(data.nationalSupply || []), ...(data.localSupply || [])]).map((source) => (
                      <li key={source.code}>
                        <SourceName sourceId={source.code}>{source.organization || source.code}</SourceName>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </StateBlock>
    </section>
  )
}
