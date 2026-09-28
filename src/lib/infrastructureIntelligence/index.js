export {
  INFRA_CLASS,
  INFRA_NODE_TYPE,
  INFRA_RELATION,
  INFRA_MEASURE,
  GAP_TYPE,
  INFRA_PRODUCERS,
  INFRA_CONTEXT_VERSION,
  NATIONAL_INFRA_EXCLUSIONS,
  FORBIDDEN_INFRA_COPY,
  infraProducerById,
  resolveInfraProducerId,
  isSolidConnector,
  carriesMaterialFlow,
} from './registry.js'
export { INFRASTRUCTURE_FIXTURE, INFRASTRUCTURE_SOURCES } from './fixture.js'
export { mapLiveInfrastructure } from './liveMap.js'
export { assembleInfrastructure, listInfrastructureProducers, findSelection } from './graph.js'
export { infrastructureCapabilities, hasExposedInfrastructureCalculation } from './capabilities.js'
export { buildEvidencePanel, provenanceForSelection } from './evidence.js'
export {
  snapshotInfrastructureHandoff,
  describeInfrastructureHandoff,
  parseInfrastructureSearch,
  infrastructureSearch,
  isValidHandoff,
  INFRA_HANDOFF_COMPARISON,
} from './handoff.js'
