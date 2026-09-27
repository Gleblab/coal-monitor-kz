import { QuietSource } from './ui'
import { DataSkeleton } from './DataSkeleton'
import { formatNumber, formatSignedPercent, formatTonnes, formatUsdAmount } from '../lib/format'

function periodTitle(period) {
  if (!period) return ''
  if (period.is_full_year) return `Полный год ${period.year}`
  return `Январь–июль ${period.year}`
}

function periodShort(period) {
  if (!period) return ''
  if (period.is_full_year) return String(period.year)
  return `Jan–Jul ${period.year}`
}

function yoyCaption(period) {
  if (!period) return ''
  if (period.is_full_year) return `к ${period.year} году`
  return `к январю–июлю ${period.year}`
}

function HistoryGroup({ title, note, items }) {
  const observed = items.filter((item) => typeof item.observation?.netWeightTonnes === 'number')
  const max = observed.length ? Math.max(...observed.map((item) => item.observation.netWeightTonnes)) : 0
  return (
    <div className="export-history-group">
      <p className="outlook-metric-caption">{title}</p>
      {note ? <p className="outlook-hint">{note}</p> : null}
      <ul className="export-history-list">
        {items.map((item) => {
          const tonnes = item.observation?.netWeightTonnes
          const has = typeof tonnes === 'number'
          const volume = has ? formatTonnes(tonnes) : null
          const width = has && max > 0 ? Math.max(6, (tonnes / max) * 100) : 0
          return (
            <li key={item.period.id}>
              <div className="export-history-meta">
                <span>{periodShort(item.period)}</span>
                <strong>{has ? `${volume.text} ${volume.unit}` : 'нет данных'}</strong>
              </div>
              <div className="export-history-track" aria-hidden="true">
                {has ? <span style={{ width: `${width}%` }} /> : <span className="is-gap" />}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ExportCountryDetail({
  row,
  period,
  yoy,
  previousPeriod,
  comparableAvailable,
  history,
  onBack,
}) {
  const volume = row ? formatTonnes(row.tonnes) : null
  const usd = row ? formatUsdAmount(row.usd) : null
  const fyItems = (history?.items || []).filter((item) => item.period.is_full_year)
  const ytdItems = (history?.items || []).filter((item) => !item.period.is_full_year)
  const showYoy = comparableAvailable && yoy?.status === 'ok' && yoy.pct != null
  const showNew = comparableAvailable && yoy?.status === 'new'

  return (
    <aside className="export-map-detail" aria-live="polite">
      <button type="button" className="export-map-back" onClick={onBack}>
        ← Назад к карте
      </button>
      {row ? (
        <>
          <p className="outlook-kicker">Заявленный торговый партнёр</p>
          <h3>{row.name}</h3>
          <p className="outlook-hint">{periodTitle(period)}</p>
          {volume ? (
            <p className="export-detail-metric">
              <span>Объём экспорта</span>
              <strong>
                {volume.text} {volume.unit}
              </strong>
            </p>
          ) : null}
          {row.share != null ? (
            <p className="export-detail-metric">
              <span>Доля в экспорте Казахстана · {periodShort(period)}</span>
              <strong>{formatNumber(row.share, 2)}%</strong>
            </p>
          ) : null}
          {row.usd != null ? (
            <p className="export-detail-metric">
              <span>Стоимость</span>
              <strong>
                {usd.text} {usd.unit}
              </strong>
            </p>
          ) : null}
          {showYoy ? (
            <p className="export-detail-metric">
              <span>Изменение {yoyCaption(previousPeriod)}</span>
              <strong>{formatSignedPercent(yoy.pct)}</strong>
            </p>
          ) : null}
          {showNew ? (
            <p className="outlook-hint">
              Есть экспорт в текущем сопоставимом периоде; в предыдущем сопоставимом наборе не
              зафиксирован.
            </p>
          ) : null}
          {row.sourceId ? (
            <p className="outlook-hint">
              Источник
              {' '}
              <QuietSource sourceId={row.sourceId} />
            </p>
          ) : null}
          {history?.loading ? <DataSkeleton variant="compact" /> : null}
          {history?.error ? <p className="outlook-hint">Не удалось загрузить данные.</p> : null}
          {!history?.loading && !history?.error && (fyItems.length || ytdItems.length) ? (
            <div className="export-history">
              <p className="outlook-metric-caption">Динамика</p>
              {fyItems.length ? (
                <HistoryGroup
                  title="Полный год"
                  note="Ряды полного года не соединяются с январём–июлем."
                  items={fyItems}
                />
              ) : null}
              {ytdItems.length ? (
                <HistoryGroup
                  title="Январь–июль"
                  note="Сопоставимый отрезок внутри года. Не сравнивается с полным годом."
                  items={ytdItems}
                />
              ) : null}
            </div>
          ) : null}
          <p className="outlook-hint">
            Страна-партнёр во внешнеторговой статистике не обязательно является конечным местом
            потребления угля.
          </p>
        </>
      ) : (
        <p className="outlook-hint">В выбранном периоде наблюдение по этой стране отсутствует.</p>
      )}
    </aside>
  )
}
