export const INFRA_CLASS = Object.freeze({
  RELATIONSHIP_VERIFIED: 'RELATIONSHIP_VERIFIED',
  QUANTITATIVE_VERIFIED: 'QUANTITATIVE_VERIFIED',
  HISTORICAL: 'HISTORICAL',
  CONTEXT_ONLY: 'CONTEXT_ONLY',
  PARTIAL: 'PARTIAL',
  DATA_GAP: 'DATA_GAP',
})

export const INFRA_NODE_TYPE = Object.freeze({
  PRODUCER: 'producer',
  MINE: 'mine',
  PROCESSING: 'processing',
  LOADING: 'loading',
  RAIL_STATION: 'rail_station',
  RAIL_SECTION: 'rail_section',
  SUPPLY_DIRECTION: 'supply_direction',
  DATA_GAP: 'data_gap',
})

export const INFRA_RELATION = Object.freeze({
  PROCESSES_AT: 'PROCESSES_AT',
  LOADS_AT: 'LOADS_AT',
  CONNECTED_TO: 'CONNECTED_TO',
  SHIPS_VIA: 'SHIPS_VIA',
  SUPPLIES_TOWARD: 'SUPPLIES_TOWARD',
})

export const INFRA_MEASURE = Object.freeze({
  PHYSICAL_EXTENT: 'physical_extent',
  EQUIPMENT_COUNT: 'equipment_count',
  STORAGE_VOLUME: 'storage_volume',
  MONTHLY_LOADING: 'monthly_loading',
  WAGON_RATE: 'wagon_rate',
  WAGON_COUNT: 'wagon_count',
  TONNAGE: 'tonnage',
  STATION_COUNT: 'station_count',
  SIDING_COUNT: 'siding_count',
  PROJECT_CAPACITY: 'project_capacity',
  PROJECT_EXTENT: 'project_extent',
})

export const GAP_TYPE = Object.freeze({
  MISSING_RELATIONSHIP: 'MISSING_RELATIONSHIP',
  MISSING_CAPACITY: 'MISSING_CAPACITY',
  MISSING_THROUGHPUT: 'MISSING_THROUGHPUT',
  PERIOD_MISMATCH: 'PERIOD_MISMATCH',
  UNIT_MISMATCH: 'UNIT_MISMATCH',
  ENTITY_MISMATCH: 'ENTITY_MISMATCH',
  SCOPE_MISMATCH: 'SCOPE_MISMATCH',
  SOURCE_INSUFFICIENT: 'SOURCE_INSUFFICIENT',
})

export const INFRA_CONTEXT_VERSION = 1

export const NATIONAL_INFRA_EXCLUSIONS = Object.freeze([
  { value: 600, unit: 'ед. в сутки', label: 'national gondolas' },
  { value: 951, unit: 'ед.', label: 'national sidings' },
  { value: 586, unit: 'ед.', label: 'national operators' },
])

export const INFRA_PRODUCERS = Object.freeze([
  {
    id: 'bogatyr',
    companyId: 'bogatyr-komir',
    companyUuid: '33333333-3333-4333-8333-333333333001',
    assetId: 'bogatyr-company',
    label: 'ТОО «Богатырь Комир»',
    selectorLabel: 'Богатырь Комир',
    depthLine: 'Подтверждено 5 звеньев · далее пробел',
  },
  {
    id: 'shubarkol',
    companyId: 'shubarkol-komir',
    companyUuid: '33333333-3333-4333-8333-333333333002',
    assetId: 'shubarkol-company',
    label: 'АО «Шубарколь Комир»',
    selectorLabel: 'Шубарколь комир',
    depthLine: 'Подтверждено 4 звена · текущие ж/д наблюдения',
  },
  {
    id: 'karazhyra',
    companyId: 'karazhyra',
    companyUuid: '33333333-3333-4333-8333-333333333003',
    assetId: 'karazhyra-deposit',
    label: 'АО «Каражыра»',
    selectorLabel: 'Каражыра',
    depthLine: 'Подтверждено 5 звеньев · текущие ж/д наблюдения',
  },
  {
    id: 'maikuben',
    companyId: 'maikuben-west',
    companyUuid: '33333333-3333-4333-8333-333333333004',
    assetId: 'maikuben-pit',
    label: 'АО «Майкубен-Вест»',
    selectorLabel: 'Майкубен-Вест',
    depthLine: 'Топология подтверждена · текущая фактическая нагрузка отсутствует',
  },
])

export function resolveInfraProducerId(id) {
  const match = INFRA_PRODUCERS.find((item) => item.id === id || item.companyId === id)
  return match?.id || null
}

export function infraProducerById(id) {
  return INFRA_PRODUCERS.find((item) => item.id === id || item.companyId === id) || INFRA_PRODUCERS[0]
}

export function isSolidConnector(classification) {
  return (
    classification === INFRA_CLASS.RELATIONSHIP_VERIFIED ||
    classification === INFRA_CLASS.QUANTITATIVE_VERIFIED
  )
}

export function carriesMaterialFlow(classification, nodeType) {
  if (nodeType === INFRA_NODE_TYPE.DATA_GAP) return false
  return isSolidConnector(classification)
}

export const FORBIDDEN_INFRA_COPY = Object.freeze([
  /bottleneck/i,
  /узк(ое|ого) мест/i,
  /spare capacity/i,
  /unused capacity/i,
  /свободн(ая|ой) мощност/i,
  /дефицит пропуск/i,
  /70[- ]вагон/i,
  /scenario becomes feasible/i,
  /инфраструктура выдержит/i,
])
