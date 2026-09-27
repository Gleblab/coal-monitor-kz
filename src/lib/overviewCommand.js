import { CHANGE_CATEGORIES, formatChangeDelta } from './changeDetection'

const MONITOR_PREVIEW_IDS = [
  'national-production-2026',
  'shubarkol-production-2026',
  'bogatyr-production-2026',
  'investments-2026',
]

export function selectChangePreview(changes) {
  const list = Array.isArray(changes) ? changes : []
  const picked = []

  const production = list.find((item) => item.category === 'production')
  if (production) picked.push(production)

  const exportChange = list.find(
    (item) => item.category === 'export' && !String(item.id).includes('partner'),
  )
  if (exportChange) picked.push(exportChange)

  const concentrationRows = list.filter((item) => item.category === 'concentration')
  const concentration =
    concentrationRows.find((item) => /коммунальн/i.test(item.title || '')) || concentrationRows[0]
  if (concentration) picked.push(concentration)

  return picked.slice(0, 3)
}

export function changePreviewDelta(change) {
  return formatChangeDelta(change)
}

export function changeCategoryLabel(categoryId) {
  return CHANGE_CATEGORIES.find((item) => item.id === categoryId)?.label || categoryId
}

export function buildExecutiveBrief(pack) {
  const lines = []
  const signals = pack?.signals || []
  for (const signal of signals) {
    if (!signal?.brief) continue
    if (signal.id === 'production-bns-yoy') continue
    lines.push(signal.brief)
  }
  if (pack?.conflicts?.production2025) {
    lines.push(
      'Отраслевой итог Министерства энергетики и промышленный ряд Бюро национальной статистики (БНС) за 2025 год относятся к разным статистическим контурам и не суммируются.',
    )
  }
  return lines.slice(0, 6)
}

export function selectMonitorPreview(targetMonitor) {
  const items = targetMonitor?.items || []
  const byId = new Map(items.map((item) => [item.id, item]))
  return MONITOR_PREVIEW_IDS.map((id) => byId.get(id)).filter(Boolean)
}

export function monitorFactCaption(item) {
  const evaluation = item?.evaluation
  const fact = item?.fact
  if (!evaluation) return null
  if (evaluation.status === 'COMPARABLE' && item.factDisplay) {
    return `Факт ${fact?.periodLabel || fact?.year || ''}: ${item.factDisplay}`.trim()
  }
  if (evaluation.status === 'PARTIAL_PERIOD' && item.factDisplay) {
    return `Доступный факт: ${fact?.periodLabel || 'неполный период'} · периоды не являются прямым сравнением`
  }
  if (evaluation.status === 'PREVIOUS_PERIOD' && item.factDisplay) {
    return `Доступный факт: ${fact?.year || fact?.periodLabel} · не выполнение плана`
  }
  if (evaluation.status === 'EXPECTED_2026') {
    return 'Ожидание / план. Не исполненный факт.'
  }
  if (item.factDisplay && fact?.year !== 2026) {
    return `Доступный факт: ${fact?.year || fact?.periodLabel}`
  }
  return 'Подтверждённый факт 2026: нет данных'
}

export function buildCoverageItems({ overview, intelligence, outlook }) {
  const items = []
  const kpis = overview?.kpis || []
  const hasPlan = kpis.some((item) => item.id === 'plan2026' && item.value != null)
  const hasBns = kpis.some((item) => item.id === 'bnsIndustrial2025' && item.value != null)
  const hasMinistry = kpis.some((item) => item.id === 'production2025' && item.value != null)
  const hasExportKpi = kpis.some((item) => item.id === 'export2025' && item.value != null)
  const signals = intelligence?.signals || []
  const hasExportYtd = signals.some((item) => item.id === 'export-hs2701-ytd')
  const hasRetail2026 = signals.some((item) => item.id === 'retail-2026-freshness')
  const hasConcentration = signals.some((item) => item.id === 'concentration-cr')
  const monitorItems = outlook?.targetMonitor?.items || []
  const has2026Plans = hasPlan || monitorItems.some((item) => item.target?.year === 2026)

  const parts2026 = []
  if (hasExportYtd) parts2026.push('экспорту за январь–июль')
  if (has2026Plans) parts2026.push('планы добычи')
  if (hasRetail2026) parts2026.push('часть розничных цен')
  items.push({
    id: 'cov-2026',
    label: '2026',
    text: parts2026.length
      ? `есть данные по ${parts2026.join(', ')}`
      : 'подтверждённый годовой факт добычи пока не опубликован в этом контуре',
  })

  const parts2025 = []
  if (hasBns || hasMinistry) parts2025.push('добыче')
  if (hasExportKpi) parts2025.push('отраслевому экспорту')
  if (hasConcentration) parts2025.push('концентрации')
  items.push({
    id: 'cov-2025',
    label: '2025',
    text: parts2025.length
      ? `есть национальные данные по ${parts2025.join(', ')}`
      : 'национальные публикации зависят от источника',
  })

  items.push({
    id: 'cov-regions',
    label: 'Регионы',
    text: 'покрытие зависит от показателя и не обобщается в одну карту',
  })

  items.push({
    id: 'cov-method',
    label: 'Методологии',
    text: 'часть официальных источников не является напрямую сопоставимой',
  })

  return items
}

export const OVERVIEW_DEEP_LINKS = [
  { to: '/production', label: 'Объёмы и баланс' },
  { to: '/exports', label: 'Экспорт' },
  { to: '/outlook', label: 'Планы и развитие' },
  { to: '/concentration', label: 'Концентрация' },
  { to: '/retail', label: 'Розничные цены' },
  { to: '/resources', label: 'Ресурсы' },
  { to: '/companies', label: 'Компании' },
  { to: '/energy-role', label: 'Роль в энергетике' },
  { to: '/sources', label: 'Источники' },
]
