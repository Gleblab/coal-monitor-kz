import { coalTypes, energySectors, regions } from '../data/catalog'
import { getChartTooltipStyle as readChartTooltipStyle } from './theme'

export function labelById(list, id) {
  return list.find((item) => item.id === id)?.name ?? id
}

export function regionLabel(id) {
  return labelById(regions, id)
}

export function coalTypeLabel(id) {
  return labelById(coalTypes, id)
}

export function sliceLabel(regionId, segmentId, segmentList = coalTypes) {
  const regionName = regionId === 'all' ? 'Казахстан' : regionLabel(regionId)
  return `${regionName} · ${labelById(segmentList, segmentId)}`
}

export function energySliceLabel(regionId, sectorId) {
  return sliceLabel(regionId, sectorId, energySectors)
}

/** Объём ТЭБ в 1000 тнэ (тыс. тнэ). В данных не округлять. */
export function formatEnergyKtoe(ktoe, digits = 2) {
  if (typeof ktoe !== 'number' || Number.isNaN(ktoe)) {
    return { compact: '—', unitCompact: '', detail: '—', unitDetail: 'тыс. тнэ' }
  }
  const million = ktoe / 1000
  if (Math.abs(million) >= 0.1) {
    return {
      compact: formatNumber(million, digits),
      unitCompact: 'млн тнэ',
      detail: formatNumber(ktoe, digits),
      unitDetail: 'тыс. тнэ',
    }
  }
  return {
    compact: formatNumber(ktoe, digits),
    unitCompact: 'тыс. тнэ',
    detail: formatNumber(ktoe, digits),
    unitDetail: 'тыс. тнэ',
  }
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

export function getChartTooltipStyle() {
  return readChartTooltipStyle()
}

/** Dark production defaults; live theme via getChartTooltipStyle(). */
export const chartTooltipStyle = {
  background: '#101826',
  border: '1px solid #2c3a52',
  borderRadius: 6,
  fontSize: 12,
}

/** Presentation only: БД хранит кг. Не записывать конверсию обратно. */
export function formatHouseholdCoalKg(kg) {
  if (typeof kg !== 'number' || Number.isNaN(kg) || kg <= 0) {
    return { text: '—', unit: '', kg: null }
  }
  if (kg >= 1_000_000_000) {
    const millionTons = kg / 1_000_000_000
    return {
      text: formatNumber(millionTons, 3),
      unit: 'млн т',
      kg,
    }
  }
  if (kg >= 1_000_000) {
    const thousandTons = kg / 1_000_000
    return {
      text: formatNumber(thousandTons, thousandTons >= 100 ? 0 : 1),
      unit: 'тыс. т',
      kg,
    }
  }
  if (kg >= 1000) {
    return { text: formatNumber(kg / 1000, 1), unit: 'т', kg }
  }
  return { text: formatNumber(kg, 0), unit: 'кг', kg }
}

export function formatCoalVolume(valueMt) {
  if (typeof valueMt !== 'number' || Number.isNaN(valueMt)) {
    return { text: '—', unit: '', millionTons: null }
  }
  if (valueMt > 0 && valueMt < 0.1) {
    return {
      text: formatNumber(valueMt * 1000, 1),
      unit: 'тыс. т',
      millionTons: valueMt,
    }
  }
  return {
    text: formatNumber(valueMt, 1),
    unit: 'млн т',
    millionTons: valueMt,
  }
}

export function formatTonnes(tonnes, digits) {
  if (typeof tonnes !== 'number' || Number.isNaN(tonnes)) {
    return { text: '—', unit: '', millionTons: null }
  }
  const mt = tonnes / 1e6
  if (mt > 0 && mt < 0.1) {
    return { text: formatNumber(mt * 1000, mt * 1000 >= 10 ? 0 : 1), unit: 'тыс. т', millionTons: mt }
  }
  const resolved = digits ?? (mt >= 10 ? 2 : 3)
  return { text: formatNumber(mt, resolved), unit: 'млн т', millionTons: mt }
}

export function formatUsdAmount(usd, digits) {
  if (typeof usd !== 'number' || Number.isNaN(usd)) {
    return { text: '—', unit: '' }
  }
  const million = usd / 1e6
  const resolved = digits == null ? (million >= 10 ? 1 : 2) : digits
  return { text: formatNumber(million, resolved), unit: 'млн $' }
}

export function formatSignedPercent(pct, digits = 2) {
  if (typeof pct !== 'number' || Number.isNaN(pct)) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${formatNumber(pct, digits)}%`
}
