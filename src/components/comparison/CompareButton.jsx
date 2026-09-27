import { useComparison } from '../../context/ComparisonContext'
import { useSources } from '../../context/SourceContext'

export function CompareButton({ item, extras }) {
  const { addComparisonItem, isCompared } = useComparison()
  const { remoteByCode } = useSources()
  const id = extras?.id || item?.id
  if (!id || item?.value == null || Number.isNaN(Number(item.value))) return null
  const active = isCompared(id)
  const sourceId = extras?.sourceId || item.sourceId

  return (
    <button
      type="button"
      className={`compare-btn${active ? ' is-active' : ''}`}
      onClick={() =>
        addComparisonItem(item, {
          ...extras,
          sourceId,
          sourceRecord: extras?.sourceRecord || remoteByCode?.[sourceId] || null,
        })
      }
      aria-pressed={active}
    >
      {active ? 'В сравнении ✓' : 'Сравнить'}
    </button>
  )
}
