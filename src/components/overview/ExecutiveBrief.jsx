export function ExecutiveBrief({ lines }) {
  if (!lines?.length) return null

  return (
    <aside className="cmd-brief intel-brief" aria-labelledby="cmd-brief-title">
      <h2 id="cmd-brief-title">Кратко о рынке</h2>
      <ol>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </aside>
  )
}
