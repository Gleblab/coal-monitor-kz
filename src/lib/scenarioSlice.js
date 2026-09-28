import { VIEW_MODE, VIEW_MODE_LABEL } from './scenarioEvidence.js'

export const SCENARIO_HORIZONS = Object.freeze([2026, 2030, 2032])

export const DEFAULT_SCENARIO_SLICE = Object.freeze({
  viewMode: VIEW_MODE.VERIFIED,
  horizon: 2026,
  regionId: 'all',
  assetId: null,
  companyId: null,
})

/** Conservative U1 option set — identity only, not an evidence guarantee for later nodes. */
export const SCENARIO_REGIONS = Object.freeze([
  { id: 'all', label: 'Казахстан', shortLabel: 'Казахстан', enabled: true },
  {
    id: 'pavlodar',
    label: 'Павлодарская область',
    shortLabel: 'Павлодар',
    enabled: true,
  },
])

export const SCENARIO_ASSETS = Object.freeze([
  { id: null, label: 'Без актива', shortLabel: null, enabled: true, companyId: null },
  {
    id: 'bogatyr-company',
    label: 'ТОО «Богатырь Комир»',
    shortLabel: 'Богатырь Комир',
    enabled: true,
    companyId: 'bogatyr-komir',
    regionId: 'pavlodar',
  },
])

export const VIEW_MODE_CONTROL = Object.freeze([
  {
    id: VIEW_MODE.VERIFIED,
    shortLabel: 'Подтверждённый',
    label: VIEW_MODE_LABEL.verified,
  },
  {
    id: VIEW_MODE.PLANNED,
    shortLabel: 'Плановый',
    label: VIEW_MODE_LABEL.planned,
  },
  {
    id: VIEW_MODE.CONSTRAINTS,
    shortLabel: 'Ограничения',
    label: VIEW_MODE_LABEL.constraints,
  },
])

export function isScenarioHorizon(value) {
  return SCENARIO_HORIZONS.includes(Number(value))
}

export function regionOption(regionId) {
  return SCENARIO_REGIONS.find((item) => item.id === regionId) || SCENARIO_REGIONS[0]
}

export function assetOption(assetId) {
  return SCENARIO_ASSETS.find((item) => item.id === assetId) || SCENARIO_ASSETS[0]
}

export function viewModeOption(viewMode) {
  return VIEW_MODE_CONTROL.find((item) => item.id === viewMode) || VIEW_MODE_CONTROL[0]
}

export function formatSliceLine(slice, { compact = false } = {}) {
  const region = regionOption(slice.regionId)
  const asset = assetOption(slice.assetId)
  const horizon = isScenarioHorizon(slice.horizon) ? String(slice.horizon) : String(DEFAULT_SCENARIO_SLICE.horizon)
  const regionName = compact ? region.shortLabel : region.label
  const parts = [regionName]
  if (asset.id) parts.push(compact ? asset.shortLabel : asset.label)
  parts.push(horizon)
  return parts.join(' · ')
}

export function formatViewModeLine(viewMode) {
  return viewModeOption(viewMode).label
}

export function resolveAssetSelection(assetId) {
  const asset = assetOption(assetId)
  if (!asset.enabled) {
    return { assetId: null, companyId: null }
  }
  return { assetId: asset.id, companyId: asset.companyId }
}
