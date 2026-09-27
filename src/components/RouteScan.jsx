import { useEffect, useState } from 'react'
import { SCAN_MS, useRouteScan } from '../hooks/useRouteScan'

export function RouteScan() {
  const scanKey = useRouteScan()
  const [visibleKey, setVisibleKey] = useState(0)

  useEffect(() => {
    if (!scanKey) return undefined
    setVisibleKey(scanKey)
    const timer = window.setTimeout(() => setVisibleKey(0), SCAN_MS)
    return () => window.clearTimeout(timer)
  }, [scanKey])

  if (!visibleKey) return null

  return (
    <div className="route-scan" aria-hidden="true">
      <div key={visibleKey} className="route-scan-mover">
        <div className="route-scan-line" />
      </div>
    </div>
  )
}
