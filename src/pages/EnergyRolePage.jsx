import { KpiCard, NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import { useFilters } from '../context/FilterContext'
import { useMarketData } from '../hooks/useMarketData'
import { formatNumber } from '../lib/format'
import { getEnergyRole } from '../api/marketApi'

function shareText(share) {
  if (typeof share !== 'number' || Number.isNaN(share)) return null
  return `${formatNumber(share, 2)}%`
}

function EnergyBarList({ rows, showShare, shareCaption }) {
  const max = Math.max(0, ...rows.map((row) => row.value))
  return (
    <ul className="energy-bar-list">
      {rows.map((row) => {
        const width = max > 0 ? `${(row.value / max) * 100}%` : '0%'
        const share = showShare ? shareText(row.share) : null
        return (
          <li key={row.code} title={row.officialLabel}>
            <div className="energy-bar-head">
              <span className="energy-bar-label">{row.officialLabel}</span>
              <span className="energy-bar-meta">
                {row.compact} {row.unitCompact}
                {share ? ` · ${share}` : ''}
              </span>
            </div>
            <div className="energy-bar-track" aria-hidden="true">
              <div className="energy-bar-fill" style={{ width }} />
            </div>
            <p className="energy-bar-detail">
              {row.detail} {row.unitDetail}
              {share && shareCaption ? ` · ${shareCaption}` : ''}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function tfcKpi(tfc) {
  return {
    id: 'tfcTotal2025',
    label: tfc.officialLabel,
    value: tfc.value,
    display: tfc.compact,
    unit: tfc.unitCompact,
    altDisplay: `${tfc.detail} ${tfc.unitDetail}`,
    period: '2025 год',
    status: 'Официальные данные',
    sourceId: tfc.sourceId,
    note: 'Национальный итог конечного потребления энергии (ТЭБ БНС). Не является объёмом потребления только угля.',
  }
}

function sectorKpi(sector, shortName) {
  const share = shareText(sector.share)
  return {
    id: `sector-${sector.code}`,
    label: sector.officialLabel || shortName,
    value: sector.value,
    display: sector.compact,
    unit: sector.unitCompact,
    altDisplay: `${sector.detail} ${sector.unitDetail}${share ? ` · ${share} конечного энергопотребления` : ''}`,
    period: '2025 год',
    status: 'Официальные данные',
    sourceId: sector.sourceId,
    note: share
      ? `${sector.officialLabel} составляет ${share} конечного энергопотребления Республики Казахстан, а не долю потребления угля.`
      : 'Национальный показатель ТЭБ БНС. Не является сегментом АЗРК.',
  }
}

export function EnergyRolePage() {
  const { filters, setRegion } = useFilters()
  const { data, loading, error, reload } = useMarketData(getEnergyRole, filters)
  const regional = data?.mode === 'regional-profile'

  return (
    <section>
      <PageHeader
        title={regional ? 'Энергетический профиль региона' : 'Роль угля в энергетике'}
        description={
          regional
            ? 'Независимые верифицированные показатели выбранного региона. Это не региональный топливно-энергетический баланс БНС.'
            : 'Показатели топливно-энергетического баланса БНС за 2025 год. Секторы ТЭБ не равны рыночным сегментам АЗРК. Общее первичное потребление и конечное потребление — разные статьи баланса.'
        }
      />
      <StateBlock loading={loading} error={error} skeleton="chart" onRetry={reload}>
        {data?.sliceLabel ? <p className="scope-badge">{data.sliceLabel}</p> : null}
        {data?.mode === 'error' || data?.ok === false ? (
          <NoData text={data.emptyNote} hint={data.energyError || data.nationalHint} />
        ) : regional ? (
          <div className="energy-regional-market" data-energy-mode="regional-profile">
            <p className="callout">{data.regionalNotice}</p>

            <article className="panel energy-panel energy-regional-panel">
              <div className="panel-head">
                <div>
                  <p className="energy-kicker">Добыча · 2025</p>
                  <h2>Промышленная добыча угля</h2>
                </div>
                <QuietSource sourceId={data.productionSourceId} />
              </div>
              {data.productionState === 'published' && data.productionKpi ? (
                <div className="split">
                  <KpiCard item={data.productionKpi} />
                  {data.shareKpi ? <KpiCard item={data.shareKpi} /> : null}
                </div>
              ) : (
                <NoData text={data.productionLabel} />
              )}

              <h3 className="energy-subhead">Угольные активы</h3>
              {data.assetsEmpty ? (
                <NoData text={data.assetsEmpty} />
              ) : (
                <ul className="energy-asset-list">
                  {data.assets.map((asset) => (
                    <li key={asset.id}>
                      <div className="energy-asset-head">
                        <strong>{asset.name}</strong>
                        <QuietSource sourceId={asset.sourceId} />
                      </div>
                      <p>
                        {asset.objectType}
                        {asset.region && asset.region !== '—' ? ` · ${asset.region}` : ''}
                      </p>
                      {asset.operator && asset.operator !== '—' ? (
                        <p className="kpi-note">{asset.operator}</p>
                      ) : (
                        <p className="kpi-note">Оператор в текущем наборе не подтверждён.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel energy-panel energy-regional-panel">
              <div className="panel-head">
                <div>
                  <p className="energy-kicker">Домашние хозяйства · 2022</p>
                  <h2>Потребление каменного угля домашними хозяйствами</h2>
                </div>
                <QuietSource sourceId={data.householdSourceId} />
              </div>
              <p className="kpi-note">
                БНС, выборочное обследование домашних хозяйств, 2022. Оценка обследования, распространённая на
                генеральную совокупность; не административный учёт 2025 года.
              </p>
              {data.householdState === 'published' ? (
                <div className="split">
                  {data.householdVolumeKpi ? <KpiCard item={data.householdVolumeKpi} /> : null}
                  {data.householdAverageKpi ? <KpiCard item={data.householdAverageKpi} /> : null}
                </div>
              ) : (
                <NoData text={data.householdEmpty} />
              )}
            </article>

            <article className="panel energy-panel energy-regional-panel">
              <div className="panel-head">
                <div>
                  <p className="energy-kicker">Энергопотребители · 2023–2025</p>
                  <h2>Поставки угля отдельным энергопотребителям</h2>
                </div>
                {data.powerState === 'published' ? <QuietSource sourceId={data.powerSourceId} /> : null}
              </div>
              {data.powerState === 'published' ? (
                <>
                  <div className="energy-consumer-scroll">
                    <table className="energy-consumer-table">
                      <caption>
                        Фактическая реализация угля названным предприятиям, млн т. Строки независимы и не суммируются.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Потребитель</th>
                          <th scope="col">2023</th>
                          <th scope="col">2024</th>
                          <th scope="col">2025</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.powerConsumers.map((consumer) => (
                          <tr key={consumer.name}>
                            <th scope="row">
                              <span>{consumer.name}</span>
                              <QuietSource sourceId={consumer.sourceId} />
                            </th>
                            {consumer.series.map((cell) => (
                              <td key={cell.year}>{cell.display ?? '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="kpi-note">
                    Показатели относятся к названным предприятиям и не являются полным объёмом потребления угля
                    региона.
                  </p>
                </>
              ) : (
                <p className="energy-power-empty">{data.powerEmpty}</p>
              )}
            </article>

            {data.methodology?.map((note) => (
              <p key={note} className="energy-method">
                {note}
              </p>
            ))}
            <div className="energy-regional-cta">
              <p>{data.nationalHint}</p>
              <p className="kpi-note">Национальные показатели ТЭБ не относятся к выбранной области.</p>
              <button type="button" className="ghost-btn" onClick={() => setRegion('all')}>
                Показать по Казахстану
              </button>
            </div>
          </div>
        ) : data?.mode === 'overview' ? (
          <div
            data-energy-origin={data.energyDataOrigin}
            data-energy-count={data.energyRemoteCount ?? ''}
          >
            <p className="scope-badge">Национальный показатель</p>
            <p className="callout">{data.quote}</p>
            <div className="split">
              {data.items.map((item) => (
                <KpiCard key={item.id} item={item} />
              ))}
            </div>
            <div className="split energy-tfc-row">
              <KpiCard item={tfcKpi(data.tfc)} />
            </div>
            <article className="panel energy-panel">
              <div className="panel-head">
                <h2>Структура конечного потребления</h2>
                <QuietSource sourceId={data.tfc.sourceId} />
              </div>
              <p className="kpi-note">
                Непересекающиеся категории конечного энергопотребления. Родитель «Другие секторы» в этот ряд не
                включён.
              </p>
              <EnergyBarList
                rows={data.composition}
                showShare
                shareCaption="доли конечного энергопотребления"
              />
            </article>
            <article className="panel energy-panel">
              <div className="panel-head">
                <h2>Конечное потребление по видам топлива</h2>
                <QuietSource sourceId={data.tfc.sourceId} />
              </div>
              <p className="kpi-note">{data.otherFuels}</p>
              <EnergyBarList
                rows={data.fuels}
                showShare
                shareCaption="доли общего конечного энергопотребления"
              />
            </article>
            {data.methodology?.map((note) => (
              <p key={note} className="energy-method">
                {note}
              </p>
            ))}
          </div>
        ) : data?.mode === 'sector' ? (
          <div
            data-energy-origin={data.energyDataOrigin}
            data-energy-count={data.energyRemoteCount ?? ''}
          >
            <p className="scope-badge">Национальный показатель · 2025</p>
            <div className="split">
              <KpiCard item={sectorKpi(data.sector, data.sectorShortName)} />
            </div>
            {data.childKind === 'industry' && data.children?.length ? (
              <article className="panel energy-panel">
                <div className="panel-head">
                  <h2>Подсекторы промышленности</h2>
                  <QuietSource sourceId={data.sector.sourceId} />
                </div>
                <p className="kpi-note">
                  Доля подсектора рассчитана относительно конечного энергопотребления промышленности, а не всего
                  энергопотребления Казахстана.
                </p>
                <EnergyBarList
                  rows={data.children}
                  showShare
                  shareCaption="доли конечного энергопотребления промышленности"
                />
              </article>
            ) : null}
            {data.childKind === 'transport' && data.children?.length ? (
              <article className="panel energy-panel">
                <div className="panel-head">
                  <h2>Подсекторы транспорта</h2>
                  <QuietSource sourceId={data.sector.sourceId} />
                </div>
                <p className="kpi-note">
                  Для транспорта в текущем наборе сохранены объёмы подсекторов; доли подсекторов не публикуются.
                </p>
                <EnergyBarList rows={data.children} showShare={false} />
              </article>
            ) : null}
            {data.methodology?.map((note) => (
              <p key={note} className="energy-method">
                {note}
              </p>
            ))}
          </div>
        ) : (
          <NoData text={data?.emptyNote} hint={data?.nationalHint} />
        )}
      </StateBlock>
    </section>
  )
}
