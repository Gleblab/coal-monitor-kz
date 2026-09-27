import { useComparison } from '../../context/ComparisonContext'

export function ComparisonBar() {
  const { items, notice, openComparison, clearComparison, dismissNotice } = useComparison()
  if (!items.length) return null
  const countLabel =
    items.length === 1 ? '1 показатель выбран' : `${items.length} показателя выбрано`

  return (
    <div className="compare-bar" role="region" aria-label="Сравнение показателей">
      <div className="compare-bar-copy">
        <strong>Сравнение</strong>
        <span>{countLabel}</span>
        <p className="compare-bar-names">
          {items.map((item) => item.label).join(' · ')}
        </p>
        {notice ? (
          <p className="compare-bar-notice" role="status">
            {notice}{' '}
            <button type="button" className="compare-bar-dismiss" onClick={dismissNotice}>
              Закрыть
            </button>
          </p>
        ) : null}
      </div>
      <div className="compare-bar-actions">
        <button type="button" className="ghost-btn" onClick={openComparison}>
          Открыть сравнение
        </button>
        <button type="button" className="ghost-btn" onClick={clearComparison}>
          Очистить
        </button>
      </div>
    </div>
  )
}
