import { IntelligenceDrawer } from '../intelligence/MetricInspector'
import { useComparison } from '../../context/ComparisonContext'
import { evaluateComparison } from '../../lib/comparison'
import { formatNumber } from '../../lib/format'

function MetaRow({ label, value, href }) {
  if (value == null || value === '') return null
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </>
  )
}

export function ComparisonWorkspace() {
  const { items, workspaceOpen, closeComparison, removeComparisonItem } = useComparison()
  if (!workspaceOpen) return null
  const verdict = evaluateComparison(items)
  const delta = verdict.comparable ? verdict.difference : null

  return (
    <div className="compare-workspace">
      <IntelligenceDrawer title="Сравнение показателей" onClose={closeComparison}>
        <p className="chart-hint">Период, значение, источник и методология выбранных показателей.</p>
        <p className={`compare-verdict${verdict.comparable ? ' is-ok' : ''}`}>{verdict.message}</p>
        {delta?.abs != null && delta.pct != null ? (
          <p className="compare-delta">
            Изменение: {delta.abs > 0 ? '+' : ''}
            {formatNumber(Number(delta.abs.toFixed(4)))} {delta.to.unit}
            {' · '}
            {delta.pct > 0 ? '+' : ''}
            {formatNumber(Number(delta.pct.toFixed(2)), 2)}%
            {delta.from.year && delta.to.year ? ` (${delta.from.year} → ${delta.to.year})` : ''}
          </p>
        ) : null}
        <div className="compare-grid">
          {items.map((item) => (
            <article key={item.id} className={`compare-card${item.measureKind !== 'actual' ? ' is-plan' : ''}`}>
              <header>
                <strong>{item.label}</strong>
                <button type="button" className="ghost-btn" onClick={() => removeComparisonItem(item.id)}>
                  Убрать
                </button>
              </header>
              <dl className="intel-meta">
                <MetaRow label="Значение" value={`${item.display} ${item.unit || ''}`.trim()} />
                <MetaRow label="Период" value={item.period} />
                <MetaRow label="География" value={item.geography} />
                <MetaRow label="Статус" value={item.statusLabel} />
                <MetaRow label="Источник" value={item.publisher} />
                <MetaRow label="Методология" value={item.methodology} />
                <MetaRow
                  label="Первоисточник"
                  value={item.sourceUrl ? 'Открыть публикацию' : null}
                  href={item.sourceUrl}
                />
                <MetaRow label="Сущность" value={item.entity} />
              </dl>
            </article>
          ))}
        </div>
      </IntelligenceDrawer>
    </div>
  )
}
