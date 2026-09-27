import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COVERAGE_STATUS, filterQualityContours } from '../../lib/dataQuality'
import { DataQualityInspector } from './DataQualityInspector'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'has2026', label: 'Есть данные за 2026' },
  { id: 'older', label: 'Данные до 2025' },
  { id: 'limits', label: 'Есть особенности' },
  { id: 'partial', label: 'Ограниченные данные' },
]

const READING_PRINCIPLES = [
  {
    id: 'periods',
    title: 'Годовые и неполные периоды',
    text: 'Данные за часть года нельзя напрямую сравнивать с итогом полного года.',
  },
  {
    id: 'plan',
    title: 'Факт и план',
    text: 'План, ожидание или целевой показатель не является фактическим результатом.',
  },
  {
    id: 'methods',
    title: 'Разные методологии',
    text: 'Показатели разных официальных методологий отображаются отдельно, если их сопоставимость не подтверждена.',
  },
  {
    id: 'missing',
    title: 'Нет данных',
    text: 'Отсутствующее или конфиденциальное значение не считается нулём.',
  },
]

function freshnessCaption(item, group) {
  if (group === '2026') {
    if (item.id === 'exports') return 'Январь–июль 2026 · неполный год'
    if (item.id === 'retail') return 'Отдельные подтверждённые наблюдения 2026'
    if (item.id === 'outlook') return 'Планы и ожидания на 2026 · не фактический результат'
    return item.period || '2026'
  }
  if (group === '2025') {
    if (item.id === 'prices' || String(item.period || '').includes('2022')) return 'ряд 2022–2025'
    return item.period || '2025'
  }
  if (item.id === 'resources') return 'Статистический учёт запасов · на конец 2024'
  return item.period || 'последний подтверждённый период'
}

function FreshnessLine({ item, group }) {
  const caption = freshnessCaption(item, group)
  if (group === '2025' && item.id === 'prices') {
    return (
      <li>
        {item.label} · {caption}
      </li>
    )
  }
  if (group === '2025') {
    return (
      <li>
        {item.label} — {caption}
      </li>
    )
  }
  return (
    <li>
      <strong>{item.label}</strong>
      <span>{caption}</span>
    </li>
  )
}

function matrixLatest(item) {
  if (item.id === 'exports' && item.coverageStatus === COVERAGE_STATUS.YTD_2026) return 'Январь–июль 2026'
  if (String(item.latestPeriod || '').startsWith('Jan')) return 'Январь–июль 2026'
  return item.latestPeriod || 'нет данных'
}

function matrixPeriod(item) {
  if (item.coverageStatus === COVERAGE_STATUS.YTD_2026) return 'Данные за часть года'
  if (item.coverageStatus === COVERAGE_STATUS.PARTIAL_COVERAGE) return 'Частичный набор наблюдений'
  if (item.coverageStatus === COVERAGE_STATUS.PLAN_2026) return 'Планы и ожидания'
  if (item.coverageStatus === COVERAGE_STATUS.OLDER) return 'Срез на конец 2024'
  if (item.coverageStatus === COVERAGE_STATUS.MISSING) return 'Нет подтверждённых данных'
  if (item.periodType === 'analysis') return 'Официальный анализ'
  if (item.periodType === 'retail_observation') return 'Точечные наблюдения'
  return 'Данные за полный год'
}

function matrixGeography(item) {
  if (item.id === 'exports') return 'Казахстан и страны-партнёры'
  if (item.id === 'energy') return 'Казахстан · национальный топливно-энергетический баланс'
  if (item.id === 'production') return 'Казахстан; региональная структура — отдельный раздел'
  if (item.id === 'geography') return 'Казахстан, опубликованные области'
  return item.geography || 'не указана в текущем наборе'
}

function matrixFeatures(item) {
  if (item.id === 'exports' && item.coverageStatus === COVERAGE_STATUS.YTD_2026) {
    return 'Данные за часть года нельзя напрямую сравнивать с итогом полного года'
  }
  if (item.id === 'exports') return 'Отраслевой экспорт и внешнеторговая статистика учитываются раздельно'
  if (item.id === 'production') return 'Используются несколько официальных статистических источников'
  if (item.id === 'resources') return 'Показатели запасов рассчитаны по разным методологиям'
  if (item.id === 'energy') return 'Топливно-энергетический баланс описывает всю энергию, не только уголь'
  if (item.id === 'retail') return 'Нет единой национальной розничной статистики'
  if (item.id === 'concentration') return 'Доли крупнейших участников; индекс концентрации не опубликован'
  if (item.id === 'prices') return 'Оптовые цены не являются розничными'
  if (item.id === 'companies') return 'План предприятия не равен национальному факту; мощность не равна добыче'
  if (item.id === 'outlook') return 'Планы и ожидания не являются фактическим результатом'
  if (item.id === 'geography') return 'Показаны только опубликованные области одного статистического ряда'
  return item.qualityLabel
}

function SummaryCell({ label, value }) {
  return (
    <div className="dq-summary-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function DataQualityCenter({ pack, query, onQueryChange }) {
  const [filterId, setFilterId] = useState('all')
  const [open, setOpen] = useState(null)
  const contours = pack?.contours || []
  const visible = useMemo(
    () => filterQualityContours(contours, filterId, query),
    [contours, filterId, query],
  )
  const summary = pack?.summary
  const watch = pack?.watch || []
  const freshness = pack?.freshness

  if (!contours.length) return null

  return (
    <div className="dq-center">
      <header className="intel-monitor-head">
        <div>
          <h2 id="dq-title">Качество и актуальность данных</h2>
          <p className="chart-hint">Насколько свежие и полные данные доступны по каждому разделу мониторинга.</p>
        </div>
      </header>

      {summary ? (
        <div className="dq-summary" aria-label="Сводка качества данных">
          <SummaryCell label="Самый свежий период" value={summary.latestCoveredPeriod} />
          <SummaryCell label="Разделы с данными за 2026" value={summary.contoursWith2026} />
          <SummaryCell label="Разделы с особенностями методологии" value={summary.methodologyLimitations} />
          <SummaryCell label="Разделы с ограниченным набором данных" value={summary.incompleteCoverage} />
        </div>
      ) : null}

      <label className="dq-search">
        <span>Найти раздел или источник</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Раздел, организация, публикация или методология"
        />
      </label>

      <div className="intel-monitor-filters" role="tablist" aria-label="Фильтр доступности данных">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`intel-monitor-filter${filterId === item.id ? ' is-active' : ''}`}
            onClick={() => setFilterId(item.id)}
            aria-pressed={filterId === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="dq-matrix" aria-labelledby="dq-matrix-title">
        <h3 id="dq-matrix-title">Доступность данных по разделам</h3>
        <p className="chart-hint">Последний доступный период, география и особенности данных по каждому направлению.</p>
        {visible.length ? (
          <ul className="intel-monitor-list dq-matrix-list">
            {visible.map((item) => (
              <li key={item.id} className="intel-monitor-row dq-matrix-row">
                <div className="intel-monitor-dir">
                  <span className="intel-monitor-label">Раздел</span>
                  <strong>{item.label}</strong>
                </div>
                <div>
                  <span className="intel-monitor-label">Последние данные</span>
                  <p>{matrixLatest(item)}</p>
                </div>
                <div>
                  <span className="intel-monitor-label">Период</span>
                  <p>{matrixPeriod(item)}</p>
                </div>
                <div>
                  <span className="intel-monitor-label">География</span>
                  <p>{matrixGeography(item)}</p>
                </div>
                <div>
                  <span className="intel-monitor-label">Особенности данных</span>
                  <p>{matrixFeatures(item)}</p>
                </div>
                <div className="intel-monitor-action">
                  <button type="button" className="ghost-btn" onClick={() => setOpen(item)}>
                    Подробнее
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="intel-monitor-empty">Нет разделов в выбранном срезе. Измените фильтр или поисковый запрос.</p>
        )}
      </section>

      <section className="dq-watch" aria-labelledby="dq-watch-title">
        <h3 id="dq-watch-title">Методологические различия</h3>
        <p className="chart-hint">
          Различия могут быть связаны с методологией и способом учёта. Показатели сопоставляются только при
          подтверждённой совместимости.
        </p>
        <ul className="dq-watch-list">
          {watch.map((item) => (
            <li key={item.id} className="dq-watch-card">
              <div className="dq-watch-head">
                <strong>{item.title}</strong>
                <span>{item.status}</span>
              </div>
              <div className="dq-watch-sides">
                {item.sides.map((side) => (
                  <article key={side.label}>
                    <h4>{side.label}</h4>
                    <p className="intel-compare-value">{side.value}</p>
                    <p>{side.period}</p>
                    <p>
                      {String(side.contour || '').includes('HS2701')
                        ? 'внешнеторговая статистика каменного угля'
                        : side.contour}
                    </p>
                  </article>
                ))}
              </div>
              {item.related ? (
                <Link className="ghost-btn" to={item.related.to}>
                  {item.related.label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="dq-fresh" aria-labelledby="dq-fresh-title">
        <h3 id="dq-fresh-title">Актуальность данных</h3>
        <div className="dq-fresh-grid">
          <div>
            <h4>2026</h4>
            <p className="chart-hint">Самые свежие данные</p>
            {freshness?.y2026?.length ? (
              <ul>
                {(freshness.y2026 || []).map((item) => (
                  <FreshnessLine key={item.id} item={item} group="2026" />
                ))}
              </ul>
            ) : (
              <p className="intel-monitor-empty">Нет разделов с периодом 2026.</p>
            )}
          </div>
          <div>
            <h4>2025</h4>
            <p className="chart-hint">Последние годовые данные</p>
            <ul>
              {(freshness?.y2025 || []).map((item) => (
                <FreshnessLine key={item.id} item={item} group="2025" />
              ))}
            </ul>
          </div>
          <div>
            <h4>2024 и ранее</h4>
            <p className="chart-hint">Требуют более свежего официального обновления</p>
            <ul>
              {(freshness?.older || []).map((item) => (
                <FreshnessLine key={item.id} item={item} group="older" />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="dq-read" aria-labelledby="dq-read-title">
        <h3 id="dq-read-title">Как читать данные</h3>
        <ul className="dq-read-list">
          {READING_PRINCIPLES.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {open ? <DataQualityInspector contour={open} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}
