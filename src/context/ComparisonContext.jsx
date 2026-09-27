import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { COMPARISON_LIMIT, toComparisonItem } from '../lib/comparison'

const ComparisonContext = createContext(null)

export function ComparisonProvider({ children }) {
  const [items, setItems] = useState([])
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  const addComparisonItem = useCallback((metric, extras, options = {}) => {
    const next = toComparisonItem(metric, extras)
    if (!next) return { ok: false, reason: 'Показатель без подтверждённого числового значения нельзя добавить.' }
    setItems((current) => {
      if (current.some((item) => item.id === next.id)) {
        if (options.addOnly) return current
        setNotice(null)
        return current.filter((item) => item.id !== next.id)
      }
      if (current.length >= COMPARISON_LIMIT) {
        setNotice('Можно сравнить не более 4 показателей одновременно.')
        return current
      }
      setNotice(null)
      return [...current, next]
    })
    return { ok: true }
  }, [])

  const removeComparisonItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const clearComparison = useCallback(() => {
    setItems([])
    setWorkspaceOpen(false)
    setNotice(null)
  }, [])

  const isCompared = useCallback((id) => items.some((item) => item.id === id), [items])

  const value = useMemo(
    () => ({
      items,
      notice,
      workspaceOpen,
      addComparisonItem,
      removeComparisonItem,
      clearComparison,
      isCompared,
      openComparison: () => setWorkspaceOpen(true),
      closeComparison: () => setWorkspaceOpen(false),
      dismissNotice: () => setNotice(null),
    }),
    [items, notice, workspaceOpen, addComparisonItem, removeComparisonItem, clearComparison, isCompared],
  )

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>
}

export function useComparison() {
  const context = useContext(ComparisonContext)
  if (!context) {
    throw new Error('useComparison должен использоваться внутри ComparisonProvider')
  }
  return context
}
