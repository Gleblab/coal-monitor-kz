export function infrastructureCapabilities() {
  return Object.freeze({
    calculationsEnabled: false,
    exposedCalculations: [],
    canCompareScenarioToInfrastructure: false,
    canInferBottleneck: false,
    canInferSpareCapacity: false,
    canAnnualizeThroughput: false,
    reason: 'MISSING_CAPACITY',
    statement:
      'Нет сопоставимого наблюдения текущей инфраструктурной мощности. Расчёты не выполняются.',
  })
}

export function hasExposedInfrastructureCalculation(capabilities = infrastructureCapabilities()) {
  return Boolean(
    capabilities.calculationsEnabled ||
      (capabilities.exposedCalculations && capabilities.exposedCalculations.length > 0) ||
      capabilities.canCompareScenarioToInfrastructure,
  )
}
