function presentationFractionDigits(cleaned, digits) {
  if (digits !== undefined) return digits
  if (!Number.isFinite(cleaned) || Number.isInteger(cleaned)) return 0
  const frac = cleaned.toFixed(10).replace(/0+$/, '').split('.')[1] || ''
  return Math.min(frac.length, 6)
}

export function formatNumber(value, digits) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const cleaned = Number(value.toPrecision(12))
  const resolved = presentationFractionDigits(cleaned, digits)
  return cleaned.toLocaleString('ru-RU', {
    minimumFractionDigits: resolved,
    maximumFractionDigits: resolved,
  })
}

export function valueQualifierPrefix(qualifier, approx = false) {
  if (qualifier === 'about') return '≈ '
  if (qualifier === 'more_than') return '> '
  if (qualifier === 'less_than') return '< '
  if (qualifier === 'exact') return ''
  return approx ? '≈ ' : ''
}

export function formatQualifiedNumber(value, qualifier, approx = false, digits) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${valueQualifierPrefix(qualifier, approx)}${formatNumber(value, digits)}`
}
