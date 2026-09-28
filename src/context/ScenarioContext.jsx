import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { isViewMode, normalizeViewMode } from '../lib/scenarioEvidence.js'
import {
  DEFAULT_SCENARIO_SLICE,
  SCENARIO_REGIONS,
  isScenarioHorizon,
  resolveAssetSelection,
  regionOption,
  assetOption,
} from '../lib/scenarioSlice.js'
import { DEFAULT_DEMAND_LAB_UI } from '../lib/scenarioLab/demandSlice.js'

const ScenarioContext = createContext(null)

function normalizeSlice(partial = {}) {
  const viewMode = isViewMode(partial.viewMode) ? partial.viewMode : DEFAULT_SCENARIO_SLICE.viewMode
  const horizon = isScenarioHorizon(partial.horizon) ? Number(partial.horizon) : DEFAULT_SCENARIO_SLICE.horizon
  const region = regionOption(partial.regionId)
  const regionId = region.enabled ? region.id : DEFAULT_SCENARIO_SLICE.regionId
  const asset = resolveAssetSelection(partial.assetId)
  return {
    viewMode: normalizeViewMode(viewMode),
    horizon,
    regionId,
    assetId: asset.assetId,
    companyId: asset.companyId,
  }
}

export function ScenarioProvider({ children }) {
  const [slice, setSlice] = useState(() => normalizeSlice(DEFAULT_SCENARIO_SLICE))
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [demandLab, setDemandLab] = useState(DEFAULT_DEMAND_LAB_UI)

  const setViewMode = useCallback((viewMode) => {
    setSlice((current) => normalizeSlice({ ...current, viewMode }))
  }, [])

  const setHorizon = useCallback((horizon) => {
    setSlice((current) => normalizeSlice({ ...current, horizon }))
  }, [])

  const setRegionId = useCallback((regionId) => {
    const next = regionOption(regionId)
    if (!next.enabled) return
    setSlice((current) => normalizeSlice({ ...current, regionId: next.id }))
  }, [])

  const setAssetId = useCallback((assetId) => {
    const next = assetOption(assetId)
    if (!next.enabled) return
    setSlice((current) => normalizeSlice({ ...current, assetId: next.id }))
  }, [])

  const setSliceFields = useCallback((partial) => {
    setSlice((current) => normalizeSlice({ ...current, ...partial }))
  }, [])

  const setDemandPercent = useCallback((percent) => {
    setDemandLab((current) => ({ ...current, percent }))
  }, [])

  const setDemandPercentA = useCallback((percentA) => {
    setDemandLab((current) => ({ ...current, percentA }))
  }, [])

  const setDemandPercentB = useCallback((percentB) => {
    setDemandLab((current) => ({ ...current, percentB }))
  }, [])

  const setDemandCompareOpen = useCallback((compareOpen) => {
    setDemandLab((current) => ({ ...current, compareOpen: Boolean(compareOpen) }))
  }, [])

  const setQuestionId = useCallback((questionId) => {
    setDemandLab((current) => ({ ...current, questionId }))
  }, [])

  const setProductionComparison = useCallback((productionComparison) => {
    setDemandLab((current) => ({ ...current, productionComparison }))
  }, [])

  const setProductionProducerId = useCallback((productionProducerId) => {
    setDemandLab((current) => ({ ...current, productionProducerId }))
  }, [])

  const value = useMemo(
    () => ({
      ...slice,
      selectedNodeId,
      setSelectedNodeId,
      regions: SCENARIO_REGIONS,
      setViewMode,
      setHorizon,
      setRegionId,
      setAssetId,
      setSliceFields,
      demandLab,
      setDemandPercent,
      setDemandPercentA,
      setDemandPercentB,
      setDemandCompareOpen,
      setQuestionId,
      setProductionComparison,
      setProductionProducerId,
    }),
    [
      slice,
      selectedNodeId,
      setViewMode,
      setHorizon,
      setRegionId,
      setAssetId,
      setSliceFields,
      demandLab,
      setDemandPercent,
      setDemandPercentA,
      setDemandPercentB,
      setDemandCompareOpen,
      setQuestionId,
      setProductionComparison,
      setProductionProducerId,
    ],
  )

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useScenario() {
  const ctx = useContext(ScenarioContext)
  if (!ctx) throw new Error('useScenario must be used within ScenarioProvider')
  return ctx
}
