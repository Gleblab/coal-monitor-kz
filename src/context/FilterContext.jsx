import { createContext, useContext, useMemo, useState } from 'react'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [region, setRegion] = useState('all')
  const [coalType, setCoalType] = useState('all')

  const value = useMemo(
    () => ({
      region,
      coalType,
      setRegion,
      setCoalType,
      resetFilters: () => {
        setRegion('all')
        setCoalType('all')
      },
      filtersActive: region !== 'all' || coalType !== 'all',
      filters: { region, coalType },
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
