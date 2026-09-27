const VARIANT_BY_PATH = {
  '/': 'dashboard',
  '/energy-role': 'dashboard',
  '/resources': 'dashboard',
  '/production': 'dashboard',
  '/concentration': 'dashboard',
  '/dynamics': 'dashboard',
  '/geography': 'map',
  '/exports': 'map',
  '/companies': 'table',
  '/retail': 'dashboard',
  '/sources': 'content',
  '/constraints': 'content',
  '/outlook': 'content',
}

export function getPageSkeletonVariant(pathname) {
  return VARIANT_BY_PATH[pathname] || 'dashboard'
}

export function SkeletonBone({ className }) {
  return <span className={`sk-bone ${className || ''}`.trim()} />
}

function Bone({ className }) {
  return <SkeletonBone className={className} />
}

function SkeletonHeader() {
  return (
    <header className="sk-header">
      <Bone className="sk-line sk-line-eyebrow" />
      <Bone className="sk-line sk-line-title" />
      <Bone className="sk-line sk-line-copy" />
      <Bone className="sk-line sk-line-copy-short" />
    </header>
  )
}

function KpiCardSkeleton() {
  return (
    <article className="sk-kpi">
      <Bone className="sk-line sk-line-kpi-label" />
      <Bone className="sk-line sk-line-kpi-value" />
      <Bone className="sk-line sk-line-kpi-meta" />
    </article>
  )
}

function ChartPanelSkeleton() {
  return (
    <article className="sk-panel sk-panel-chart">
      <Bone className="sk-line sk-line-panel-title" />
      <div className="sk-guides" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="sk-bars">
        <span style={{ '--sk-h': '42%' }} />
        <span style={{ '--sk-h': '68%' }} />
        <span style={{ '--sk-h': '51%' }} />
        <span style={{ '--sk-h': '86%' }} />
        <span style={{ '--sk-h': '37%' }} />
        <span style={{ '--sk-h': '59%' }} />
      </div>
    </article>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="sk-kpi-row">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className="sk-analytics">
        <ChartPanelSkeleton />
        <article className="sk-panel sk-panel-side">
          <Bone className="sk-line sk-line-panel-title" />
          <Bone className="sk-line sk-line-copy" />
          <Bone className="sk-line sk-line-copy-short" />
          <Bone className="sk-line sk-line-copy" />
        </article>
      </div>
    </>
  )
}

function MapSkeleton() {
  return (
    <>
      <div className="sk-controls">
        <Bone className="sk-chip" />
        <Bone className="sk-chip" />
        <Bone className="sk-chip sk-chip-wide" />
      </div>
      <div className="sk-map-layout">
        <article className="sk-panel sk-panel-map" />
        <article className="sk-panel sk-panel-side">
          <Bone className="sk-line sk-line-panel-title" />
          <Bone className="sk-line sk-line-copy" />
          <Bone className="sk-line sk-line-copy-short" />
          <Bone className="sk-line sk-line-copy" />
          <Bone className="sk-line sk-line-kpi-meta" />
        </article>
      </div>
    </>
  )
}

function TableSkeleton() {
  return (
    <>
      <div className="sk-kpi-row sk-kpi-row-compact">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <article className="sk-panel sk-panel-table">
        <Bone className="sk-line sk-line-panel-title" />
        <div className="sk-table">
          {['a', 'b', 'c', 'd', 'e', 'f'].map((row) => (
            <div className="sk-table-row" key={row}>
              <Bone className="sk-line sk-cell-wide" />
              <Bone className="sk-line sk-cell" />
              <Bone className="sk-line sk-cell" />
              <Bone className="sk-line sk-cell-short" />
            </div>
          ))}
        </div>
      </article>
    </>
  )
}

function ContentSkeleton() {
  return (
    <div className="sk-content-stack">
      <article className="sk-panel">
        <Bone className="sk-line sk-line-panel-title" />
        <Bone className="sk-line sk-line-copy" />
        <Bone className="sk-line sk-line-copy" />
        <Bone className="sk-line sk-line-copy-short" />
      </article>
      <article className="sk-panel">
        <Bone className="sk-line sk-line-panel-title" />
        <Bone className="sk-line sk-line-copy" />
        <Bone className="sk-line sk-line-copy-short" />
        <Bone className="sk-line sk-line-copy" />
      </article>
      <article className="sk-panel">
        <Bone className="sk-line sk-line-panel-title" />
        <Bone className="sk-line sk-line-copy-short" />
        <Bone className="sk-line sk-line-copy" />
      </article>
    </div>
  )
}

export function PageSkeleton({ variant = 'dashboard' }) {
  return (
    <div className={`page-skeleton is-${variant}`} aria-hidden="true">
      <SkeletonHeader />
      {variant === 'map' ? <MapSkeleton /> : null}
      {variant === 'table' ? <TableSkeleton /> : null}
      {variant === 'content' ? <ContentSkeleton /> : null}
      {variant === 'dashboard' ? <DashboardSkeleton /> : null}
    </div>
  )
}
