import { coalTypes, regions } from '../data/catalog'

export function labelById(list, id) {
  return list.find((item) => item.id === id)?.name ?? id
}

export function regionLabel(id) {
  return labelById(regions, id)
}

export function coalTypeLabel(id) {
  return labelById(coalTypes, id)
}

export function formatNumber(value, digits) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const resolved =
    digits === undefined ? (String(value).split('.')[1]?.length ?? 0) : digits
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: resolved,
    maximumFractionDigits: resolved,
  })
}

export const chartTooltipStyle = {
  background: '#101826',
  border: '1px solid #2c3a52',
  borderRadius: 6,
  fontSize: 12,
}
