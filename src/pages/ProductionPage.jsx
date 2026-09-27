import { Link } from 'react-router-dom'
import { getProduction } from '../api/marketApi'
import { useMarketData } from '../hooks/useMarketData'
import { CompareButton } from '../components/comparison/CompareButton'
import { MetricTraceButton } from '../components/traceability/MetricTraceButton'
import { KpiCard, NoData, PageHeader, QuietSource, StateBlock, StatusBadge } from '../components/ui'
import { chartTooltipStyle, formatNumber } from '../lib/format'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function productionCompareExtras(item, extras = {}) {
  return {
    route: '/production',
    methodology: extras.methodology || item.methodology || item.note,
    year: extras.year ?? item.year,
    id: extras.id,
    seriesKey: extras.seriesKey,
    measureKind: extras.measureKind,
    label: extras.label,
  }
}

function formatMt(value, digits) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${formatNumber(value, digits)} млн т`
}

function formatSigned(value, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const text = formatNumber(Math.abs(value), digits)
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

function ProductionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  if (value == null || Number.isNaN(Number(value))) return null
  return (
    <div className="dynamics-tooltip">
      <p className="dynamics-tooltip-period">{label}</p>
      <p>{formatMt(Number(value))} · БНС</p>
    </div>
  )
}

export function ProductionPage() {
  const { data, loading, error, reload } = useMarketData(getProduction, { region: 'all', coalType: 'all' })
  const bns2025 = data?.bnsSeries?.find((item) => item.year === 2025 && item.value != null) || null
  const ministry = data?.ministryProduction || data?.ministryBalance?.production || null
  const domestic = data?.ministryDomestic || data?.ministryBalance?.domestic || null
  const ministryExport = data?.ministryExport || data?.ministryBalance?.export || null
  const hs2025 = data?.hsAnnual?.find((item) => item.year === 2025) || null
  const bns2024 = data?.bnsSeries?.find((item) => item.year === 2024 && item.value != null) || null
  const balance = data?.ministryBalance
  const chartRows = (data?.bnsSeries || []).map((item) => ({
    year: String(item.year),
    value: item.value,
  }))
  const chartHasValues = chartRows.some((item) => item.value != null)
  const productionRelated = {
    bns2025,
    ministry2025: ministry,
    hs2025: hs2025
      ? { value: hs2025.millionTons, unit: 'млн т', year: 2025 }
      : null,
    ministryExport,
  }
  const confirmedInvestments = data?.indicatorsDataOrigin === 'supabase' ? data.investments : []
  const confirmedUsers = data?.indicatorsDataOrigin === 'supabase' ? data.users : null

  const topKpis = [
    bns2025
      ? {
          id: 'bns-2025',
          label: 'БНС · годовой промышленный ряд',
          value: bns2025.value,
          display: formatNumber(bns2025.value),
          unit: 'млн т',
          period: '2025 год',
          status: 'Официальные данные',
          sourceId: bns2025.sourceId,
          note: 'Промышленный статистический ряд БНС. Не является показателем Минэнерго.',
        }
      : null,
    ministry
      ? {
          ...ministry,
          label: 'Минэнерго · добыча',
          display: formatNumber(ministry.value),
        }
      : null,
    domestic
      ? {
          ...domestic,
          label: 'Внутренний рынок · Минэнерго',
          display: formatNumber(domestic.value),
        }
      : null,
    ministryExport
      ? {
          ...ministryExport,
          label: 'Экспорт · Минэнерго',
          display: formatNumber(ministryExport.value),
        }
      : null,
  ].filter(Boolean)

  return (
    <section className="production-page">
      <PageHeader
        title="Объёмы и баланс"
        description="Добыча, внутренний рынок, экспорт и планы отрасли — с разделением статистических контуров."
      />
      <StateBlock loading={loading} error={error} empty={!data} skeleton="chart" onRetry={reload}>
        {data ? (
          <>
            {topKpis.length ? (
              <div className="kpi-grid" data-production-origin={data.productionDataOrigin}>
                {topKpis.map((item) => (
                  <KpiCard
                    key={item.id}
                    item={item}
                    comparable
                    comparisonExtras={productionCompareExtras(
                      item,
                      item.id === 'bns-2025'
                        ? {
                            label: 'Добыча угля — данные БНС',
                            methodology:
                              'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.',
                          }
                        : {},
                    )}
                    traceable
                    traceExtras={{
                      related: productionRelated,
                      route: item.id === 'exportFlow' || item.id === 'export2025' ? '/exports' : '/production',
                      label: item.id === 'bns-2025' ? 'Добыча угля — данные БНС' : undefined,
                      methodology:
                        item.id === 'bns-2025'
                          ? 'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.'
                          : item.methodology || item.note,
                    }}
                  />
                ))}
              </div>
            ) : (
              <NoData text="Нет подтвержденных данных по добыче 2025 года." />
            )}

            <section className="panel" id="production-bns-chart">
              <div className="panel-head">
                <h2>Динамика добычи угля</h2>
                <QuietSource sourceId={data.bnsSourceId || 'bnsIndustryCoalProduction'} />
              </div>
              <p className="scope-badge">БНС · годовой промышленный статистический ряд · млн т</p>
              {chartHasValues ? (
                <div className="chart-box dynamics-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartRows} margin={{ top: 16, right: 8, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="year" stroke="#7d8ca3" tick={{ fill: '#7d8ca3', fontSize: 12 }} />
                      <YAxis
                        stroke="#7d8ca3"
                        tick={{ fill: '#7d8ca3', fontSize: 11 }}
                        width={52}
                        domain={[
                          (min) => (Number.isFinite(Number(min)) ? Math.floor(Number(min) - 2) : 'auto'),
                          (max) => (Number.isFinite(Number(max)) ? Math.ceil(Number(max) + 2) : 'auto'),
                        ]}
                        tickFormatter={(value) => formatNumber(Number(value), 1)}
                      />
                      <Tooltip content={<ProductionTooltip />} contentStyle={chartTooltipStyle} />
                      <Line
                        type="linear"
                        dataKey="value"
                        stroke="#c4a056"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#c4a056', stroke: '#0f1624', strokeWidth: 1 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <NoData text="Нет подтвержденных наблюдений годового промышленного ряда БНС." />
              )}
              {data.bnsSeries?.some((item) => item.value != null) ? (
                <ul className="compare-series-list">
                  {data.bnsSeries
                    .filter((item) => item.value != null)
                    .map((item) => {
                      const card = {
                        id: `bns-industry-${item.year}`,
                        label: `БНС · добыча ${item.year}`,
                        value: item.value,
                        display: formatNumber(item.value),
                        unit: item.unit || 'млн т',
                        period: String(item.year),
                        year: item.year,
                        status: 'Официальные данные',
                        sourceId: item.sourceId || data.bnsSourceId,
                        methodology:
                          'Годовой промышленный статистический ряд БНС. Не является показателем Минэнерго.',
                        label: 'Добыча угля — данные БНС',
                      }
                      return (
                        <li key={card.id}>
                          <span>
                            {item.year}: {formatMt(item.value)}
                          </span>
                          <CompareButton
                            item={card}
                            extras={productionCompareExtras(card, {
                              id: card.id,
                              year: item.year,
                              seriesKey: 'bns_industry_annual',
                              label: card.label,
                              methodology: card.methodology,
                            })}
                          />
                          <MetricTraceButton
                            item={card}
                            extras={{
                              id: card.id,
                              year: item.year,
                              related: productionRelated,
                              route: '/production',
                              methodology: card.methodology,
                              label: card.label,
                            }}
                          />
                        </li>
                      )
                    })}
                </ul>
              ) : null}
              <p className="chart-hint">
                Значения одного статистического ряда сопоставляются между годами. Показатели из других
                официальных контуров не подставляются в этот ряд.
              </p>
              {data.bnsInsights ? (
                <div className="production-insights">
                  {data.bnsInsights.change2025to2024 ? (
                    <article>
                      <p>2025 к 2024</p>
                      <strong>
                        {formatSigned(data.bnsInsights.change2025to2024.abs, 4)} млн т (
                        {formatSigned(data.bnsInsights.change2025to2024.pct, 1)}%)
                      </strong>
                      <small>{data.bnsInsights.change2025to2024.note}</small>
                    </article>
                  ) : null}
                  {data.bnsInsights.change2025to2020 ? (
                    <article>
                      <p>2025 к 2020</p>
                      <strong>
                        {formatSigned(data.bnsInsights.change2025to2020.abs, 4)} млн т (
                        {formatSigned(data.bnsInsights.change2025to2020.pct, 1)}%)
                      </strong>
                      <small>{data.bnsInsights.change2025to2020.note}</small>
                    </article>
                  ) : null}
                  {data.bnsInsights.max ? (
                    <article>
                      <p>Максимум ряда</p>
                      <strong>
                        {formatMt(data.bnsInsights.max.value)} · {data.bnsInsights.max.year}
                      </strong>
                      <small>Расчёт Coal Monitor KZ на основе ряда БНС.</small>
                    </article>
                  ) : null}
                  {data.bnsInsights.min ? (
                    <article>
                      <p>Минимум ряда</p>
                      <strong>
                        {formatMt(data.bnsInsights.min.value)} · {data.bnsInsights.min.year}
                      </strong>
                      <small>Расчёт Coal Monitor KZ на основе ряда БНС.</small>
                    </article>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="panel" id="production-ministry-balance">
              <div className="panel-head">
                <h2>Баланс 2025 по данным Минэнерго</h2>
                <QuietSource sourceId="minenergo2025" />
              </div>
              {balance ? (
                <>
                  <p className="hero-value">
                    {formatNumber(balance.production.value)} <span className="kpi-unit">млн т</span>
                  </p>
                  <p className="kpi-note">Общий объём в контуре сообщения Минэнерго. Не смешивается с рядом БНС.</p>
                  <div className="balance-track" aria-hidden="true">
                    <span
                      className="balance-domestic"
                      style={{ flexGrow: balance.domestic.value }}
                      title={`${formatNumber(balance.domestic.value)} млн т`}
                    />
                    <span
                      className="balance-export"
                      style={{ flexGrow: balance.export.value }}
                      title={`${formatNumber(balance.export.value)} млн т`}
                    />
                  </div>
                  <div className="balance-legend">
                    <p>
                      <span className="swatch is-domestic" />
                      Внутренний рынок {formatNumber(balance.domestic.value)} млн т
                      {' · '}
                      {formatNumber(balance.domesticShare * 100, 1)}%
                    </p>
                    <p>
                      <span className="swatch is-export" />
                      Экспорт {formatNumber(balance.export.value)} млн т
                      {' · '}
                      {formatNumber(balance.exportShare * 100, 1)}%
                    </p>
                  </div>
                  <p className="kpi-note">{balance.shareNote}</p>
                  <p className="outlook-callout">
                    Внутренний рынок и экспорт в данном блоке сопоставляются только с показателем{' '}
                    {formatNumber(balance.production.value)} млн т из того же сообщения Минэнерго.
                  </p>
                </>
              ) : (
                <NoData text="Нет подтвержденных данных Минэнерго по распределению 2025 года." />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Экспорт: два официальных контура</h2>
                <QuietSource sourceId={hs2025?.sourceId || 'unComtradeKazHs2701'} />
              </div>
              <div className="production-compare">
                <article>
                  <p>Минэнерго · 2025</p>
                  <strong>{ministryExport ? `${formatNumber(ministryExport.value, 1)} млн т` : '—'}</strong>
                  <QuietSource sourceId="minenergo2025" />
                </article>
                <article>
                  <p>HS2701 · 2025</p>
                  <strong>{hs2025 ? formatMt(hs2025.millionTons) : '—'}</strong>
                  {hs2025?.usdMillion != null ? (
                    <small>{formatNumber(hs2025.usdMillion)} млн USD</small>
                  ) : null}
                </article>
              </div>
              {data.hsAnnual?.length ? (
                <ul className="production-hs-years">
                  {data.hsAnnual.map((item) => (
                    <li key={item.year}>
                      {item.year}: {formatMt(item.millionTons)}
                    </li>
                  ))}
                </ul>
              ) : (
                <NoData text="Нет подтвержденных годовых итогов HS2701." />
              )}
              <p className="outlook-callout">
                Показатели относятся к разным статистическим контурам. HS2701 представляет внешнеторговую
                статистику по товарной группе, тогда как объём Минэнерго опубликован как отраслевой
                показатель экспорта. Значения отображаются отдельно и не принудительно согласуются.
              </p>
              <Link className="production-export-link" to="/exports">
                Подробнее → Экспорт и внешние рынки
              </Link>
            </section>

            <section className="panel is-plan" id="production-plan">
              <div className="panel-head">
                <h2>Отраслевой контур и план 2026</h2>
                <QuietSource sourceId="minenergo2025" />
              </div>
              <div className="kpi-grid">
                {data.plan ? (
                  <KpiCard
                    item={{
                      ...data.plan,
                      label: 'План добычи на 2026 год',
                      display: data.plan.display || formatNumber(data.plan.value),
                    }}
                    comparable
                    comparisonExtras={productionCompareExtras(
                      {
                        ...data.plan,
                        label: 'План добычи на 2026 год',
                      },
                      { measureKind: 'plan', id: data.plan.id || 'plan2026' },
                    )}
                    traceable
                    traceExtras={{
                      measureKind: 'plan',
                      id: data.plan.id || 'plan2026',
                      route: '/outlook',
                      profileKey: 'plan2026',
                    }}
                  />
                ) : (
                  <NoData text="Нет подтвержденного плана добычи на 2026 год." />
                )}
                {confirmedUsers ? <KpiCard item={confirmedUsers} /> : null}
                {confirmedInvestments.map((item) => (
                  <KpiCard key={item.id} item={item} />
                ))}
              </div>
              {data.plan ? (
                <p className="kpi-note">
                  {formatNumber(data.plan.value)} млн т — план добычи на 2026 год, а не фактическая добыча
                  2026 года. Показатель не добавляется в промышленный ряд БНС.
                </p>
              ) : null}
            </section>

            <section className="panel">
              <h2>Почему официальные показатели различаются</h2>
              <p className="kpi-note">
                Даже внутри официальной статистики показатель добычи может относиться к разным
                статистическим продуктам.
              </p>
              <div className="production-method-grid">
                <article>
                  <StatusBadge status="Официальные данные" />
                  <p>БНС · годовой промышленный ряд</p>
                  <strong>{bns2025 ? formatMt(bns2025.value) : '—'}</strong>
                  <small>2025</small>
                  <QuietSource sourceId={data.bnsSourceId || 'bnsIndustryCoalProduction'} />
                </article>
                <article>
                  <StatusBadge status="Официальные данные" />
                  <p>Минэнерго · отраслевое сообщение</p>
                  <strong>{ministry ? formatMt(ministry.value, 0) : '—'}</strong>
                  <small>2025</small>
                  <QuietSource sourceId="minenergo2025" />
                </article>
                <article>
                  <StatusBadge status="Официальные данные" />
                  <p>БНС · ресурсный счёт</p>
                  <strong>
                    {data.resourceAccount ? formatMt(data.resourceAccount.value) : '—'}
                  </strong>
                  <small>2024</small>
                  <QuietSource sourceId="bnsReserves2024" />
                </article>
              </div>
              {bns2024 && data.resourceAccount ? (
                <p className="outlook-callout">
                  БНС · промышленный годовой ряд, 2024: {formatMt(bns2024.value)}. БНС · ресурсный счёт,
                  2024: {formatMt(data.resourceAccount.value)}. Показатели относятся к разным
                  статистическим продуктам/методологическим контурам и поэтому хранятся и отображаются
                  раздельно.
                </p>
              ) : null}
              <p>
                Coal Monitor KZ не объединяет показатели разных официальных статистических продуктов в
                искусственно единый ряд. Каждый показатель сохраняется вместе с источником, периодом и
                методологическим контекстом.
              </p>
            </section>

            <section className="panel production-availability">
              <h2>Доступность данных</h2>
              <ul className="coverage-list">
                {(data.availability || []).map((item) => (
                  <li key={item.id} className="coverage-row">
                    <span className={`coverage-status is-${item.state}`}>{item.stateLabel}</span>
                    <div className="coverage-copy">
                      <strong>{item.label}</strong>
                      <small>{item.context}</small>
                    </div>
                    {item.action?.kind === 'route' ? (
                      <Link className="coverage-action" to={item.action.to}>
                        {item.action.text}
                      </Link>
                    ) : item.action?.kind === 'anchor' ? (
                      <a className="coverage-action" href={item.action.href}>
                        {item.action.text}
                      </a>
                    ) : (
                      <span className="coverage-action is-empty" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
