import { Link } from 'react-router-dom'

export function DataCoverageStrip({ items }) {
  if (!items?.length) return null

  return (
    <section className="cmd-cover" aria-labelledby="cmd-cover-title">
      <div className="cmd-section-head">
        <h2 id="cmd-cover-title">Покрытие данных</h2>
        <Link to="/sources" className="cmd-text-btn">
          Подробнее о данных
        </Link>
      </div>
      <ul className="cmd-cover-grid">
        {items.map((item) => (
          <li key={item.id}>
            <p className="cmd-kicker">{item.label}</p>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
