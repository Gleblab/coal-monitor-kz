export function MarketIntelligence({ pack, onOpenSignal, showBrief = true }) {
  if (!pack?.signals?.length) return null

  return (
    <section className={`intel-panel${showBrief ? '' : ' is-signals-only'}`} aria-labelledby="intel-signals-title">
      <div className="intel-panel-main">
        <h2 id="intel-signals-title">Ключевые сигналы рынка</h2>
        <ul className="intel-signal-list">
          {pack.signals.map((signal) => (
            <li key={signal.id}>
              <button
                type="button"
                className="intel-signal"
                onClick={() => onOpenSignal(signal)}
                aria-label={`${signal.domain}: ${signal.headline}. Открыть подробности.`}
              >
                <span className="intel-signal-domain">{signal.domain}</span>
                <span className="intel-signal-glyph" aria-hidden="true">
                  {signal.glyph}
                </span>
                <span className="intel-signal-text">{signal.headline}</span>
                <span className="intel-signal-more">Подробнее</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {showBrief && pack.brief?.length ? (
        <aside className="intel-brief" aria-labelledby="intel-brief-title">
          <h2 id="intel-brief-title">Кратко о рынке</h2>
          <ol>
            {pack.brief.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </aside>
      ) : null}
    </section>
  )
}
