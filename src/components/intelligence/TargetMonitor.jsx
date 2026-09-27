import { useMemo, useState } from 'react'
import { filterMonitorItems } from '../../lib/targetMonitor'
import { TargetMonitorDetail } from './TargetMonitorDetail'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'fact2026', label: 'Есть факт 2026' },
  { id: 'plans', label: 'Только планы' },
  { id: 'none', label: 'Нет сопоставимого факта' },
]

export function TargetMonitor({ pack }) {
  const [filterId, setFilterId] = useState('all')
  const [openItem, setOpenItem] = useState(null)
  const items = pack?.items || []
  const visible = useMemo(() => filterMonitorItems(items, filterId), [items, filterId])
  const summary = pack?.summary || { total: 0, withFact2026: 0, noComparable: 0 }

  if (!items.length) return null

  return (
    <section className="intel-monitor" aria-labelledby="monitor-2026-title">
      <header className="intel-monitor-head">
        <div>
          <h2 id="monitor-2026-title">2026 Monitor</h2>
          <p className="chart-hint">Контроль подтверждённых целей и доступных фактических данных</p>
        </div>
      </header>
      <p className="intel-monitor-summary">
        Целей в мониторинге: {summary.total}
        {' · '}С фактом за 2026: {summary.withFact2026}
        {' · '}Без сопоставимого факта: {summary.noComparable}
      </p>
      <div className="intel-monitor-filters" role="tablist" aria-label="Фильтр 2026 Monitor">
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
      {visible.length ? (
        <ul className="intel-monitor-list">
          {visible.map((item) => (
            <li key={item.id} className="intel-monitor-row">
              <div className="intel-monitor-dir">
                <strong>{item.direction}</strong>
                {item.target?.entityLabel ? <span>{item.target.entityLabel}</span> : null}
              </div>
              <div>
                <span className="intel-monitor-label">Цель / план</span>
                <p>
                  {item.target?.measureKind === 'expected' ? 'Ожидание' : 'План'} {item.target?.periodLabel}:{' '}
                  {item.targetDisplay || 'не указано в текущем наборе данных'}
                </p>
              </div>
              <div>
                <span className="intel-monitor-label">Доступный факт</span>
                <p>
                  {item.factDisplay
                    ? `${item.fact?.year === item.target?.year ? 'Факт' : 'Последний доступный факт'}: ${item.factDisplay}${
                        item.fact?.periodLabel ? ` · ${item.fact.periodLabel}` : ''
                      }`
                    : 'Подтверждённый факт исполнения: нет данных'}
                </p>
              </div>
              <div>
                <span className="intel-monitor-label">Сопоставимость</span>
                <p>{item.comparabilityLabel}</p>
              </div>
              <div>
                <span className="intel-monitor-label">Статус данных</span>
                <p>{item.dataStatusLabel}</p>
              </div>
              <div className="intel-monitor-action">
                <button type="button" className="ghost-btn" onClick={() => setOpenItem(item)}>
                  Подробнее
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="intel-monitor-empty">Нет целей в выбранном срезе монитора.</p>
      )}
      {openItem ? <TargetMonitorDetail item={openItem} onClose={() => setOpenItem(null)} /> : null}
    </section>
  )
}
