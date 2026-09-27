import { createContext, useContext, useMemo, useState } from 'react'

const FilterContext = createContext(null)

const DEFAULT_FILTERS = { region: 'all', segment: 'all' }

export function FilterProvider({ children }) {
  const [region, setRegion] = useState(DEFAULT_FILTERS.region)
  const [coalType, setCoalType] = useState(DEFAULT_FILTERS.segment)

  const value = useMemo(
    () => ({
      region,
      coalType,
      segment: coalType,
      setRegion,
      setCoalType,
      setSegment: setCoalType,
      resetFilters: () => {
        setRegion(DEFAULT_FILTERS.region)
        setCoalType(DEFAULT_FILTERS.segment)
      },
      filtersActive: region !== 'all' || coalType !== 'all',
      filters: { region, coalType, segment: coalType },
      snapshot: () => ({ region, segment: coalType }),
    }),
    [region, coalType],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters должен использоваться внутри FilterProvider')
  }
  return context
}
