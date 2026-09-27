import { SkeletonBone as Bone } from './PageSkeleton'

function KpiRow({ count = 3 }) {
  return (
    <div className={`sk-kpi-row${count === 3 ? ' sk-kpi-row-compact' : ''}`}>
      {Array.from({ length: count }, (_, index) => (
        <article className="sk-kpi" key={index}>
          <Bone className="sk-line sk-line-kpi-label" />
          <Bone className="sk-line sk-line-kpi-value" />
          <Bone className="sk-line sk-line-kpi-meta" />
        </article>
      ))}
    </div>
  )
}

function AnalyticsPanel() {
  return (
    <article className="sk-panel sk-panel-chart">
      <Bone className="sk-line sk-line-panel-title" />
      <Bone className="sk-line sk-line-copy" />
      <Bone className="sk-line sk-line-copy-short" />
      <div className="sk-guides" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="sk-bars">
        <span style={{ '--sk-h': '44%' }} />
        <span style={{ '--sk-h': '71%' }} />
        <span style={{ '--sk-h': '53%' }} />
        <span style={{ '--sk-h': '82%' }} />
        <span style={{ '--sk-h': '38%' }} />
        <span style={{ '--sk-h': '61%' }} />
      </div>
    </article>
  )
}

function CardsBody() {
  return (
    <>
      <KpiRow count={3} />
      <AnalyticsPanel />
      <div className="sk-content-stack sk-content-pair">
        <article className="sk-panel">
          <Bone className="sk-line sk-line-panel-title" />
          <Bone className="sk-line sk-line-copy" />
          <Bone className="sk-line sk-line-copy-short" />
        </article>
        <article className="sk-panel">
          <Bone className="sk-line sk-line-panel-title" />
          <Bone className="sk-line sk-line-copy" />
          <Bone className="sk-line sk-line-copy-short" />
        </article>
      </div>
    </>
  )
}

function ChartBody() {
  return (
    <>
      <KpiRow count={3} />
      <AnalyticsPanel />
    </>
  )
}

function TableBody() {
  return (
    <>
      <KpiRow count={3} />
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

function ContentBody() {
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
      </article>
    </div>
  )
}

function CompactBody() {
  return (
    <article className="sk-panel sk-panel-compact">
      <Bone className="sk-line sk-line-panel-title" />
      <Bone className="sk-line sk-line-copy" />
      <Bone className="sk-line sk-line-copy-short" />
      <div className="sk-bars sk-bars-compact">
        <span style={{ '--sk-h': '48%' }} />
        <span style={{ '--sk-h': '72%' }} />
        <span style={{ '--sk-h': '40%' }} />
        <span style={{ '--sk-h': '63%' }} />
      </div>
    </article>
  )
}

export function DataSkeleton({ variant = 'cards' }) {
  return (
    <div className={`data-skeleton is-${variant}`} aria-hidden="true">
      {variant === 'table' ? <TableBody /> : null}
      {variant === 'chart' ? <ChartBody /> : null}
      {variant === 'content' ? <ContentBody /> : null}
      {variant === 'compact' ? <CompactBody /> : null}
      {variant === 'cards' ? <CardsBody /> : null}
    </div>
  )
}
