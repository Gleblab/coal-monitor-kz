import { useSources } from '../../context/SourceContext'
import { AnimatedNumber } from './ScenarioMotion'

export function InfrastructureEvidencePanel({ panel }) {
  const { openSource } = useSources()
  if (!panel) return null

  return (
    <aside className="ii-panel" aria-labelledby="ii-panel-title">
      <header className="ii-panel-head">
        <p className="ii-panel-cat">{panel.category}</p>
        <h2 id="ii-panel-title">{panel.title}</h2>
      </header>

      <section>
        <h3>Что известно</h3>
        <p>{panel.known}</p>
      </section>

      <section>
        <h3>Что подтверждено цифрами</h3>
        {panel.figures?.length ? (
          <ul className="ii-panel-figures">
            {panel.figures.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <strong>
                  <AnimatedNumber
                    value={item.value}
                    qualifier={item.qualifier}
                    approx={item.qualifier === 'about'}
                    animationKey={item.id}
                  />{' '}
                  {item.unit}
                </strong>
                <em>
                  {item.periodLabel} · {item.classification === 'HISTORICAL' ? 'историческое / не текущее' : item.classification === 'PARTIAL' ? 'частичное' : 'наблюдение'}
                </em>
              </li>
            ))}
          </ul>
        ) : (
          <p>{panel.isGap ? 'Количественное наблюдение для этого пробела не опубликовано.' : 'Для этого объекта нет отдельного количественного наблюдения.'}</p>
        )}
      </section>

      <section>
        <h3>Как это читать</h3>
        <p>{panel.howToRead}</p>
        {panel.historicalNote ? <p className="ii-panel-note">{panel.historicalNote}</p> : null}
      </section>

      <section>
        <h3>Что нельзя заключить</h3>
        <p>{panel.cannotConclude}</p>
      </section>

      <section>
        <h3>Каких данных не хватает</h3>
        <p>{panel.missing}</p>
        {panel.needed ? <p className="ii-panel-note">{panel.needed}</p> : null}
        {panel.afterData ? <p className="ii-panel-note">{panel.afterData}</p> : null}
      </section>

      <section>
        <h3>Источники</h3>
        {panel.sources?.length ? (
          <ul className="ii-panel-sources">
            {panel.sources.map((source) => (
              <li key={source.id}>
                <button type="button" className="ii-source-btn" onClick={() => openSource(source.id)}>
                  {[source.organization, source.publication].filter(Boolean).join(' · ')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Отдельный источник для пробела не требуется: отсутствие связи само является результатом.</p>
        )}
      </section>

      {panel.technical ? (
        <details className="ii-tech">
          <summary>Технические детали</summary>
          <dl>
            {Object.entries(panel.technical).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{Array.isArray(value) ? value.join(', ') || '—' : String(value ?? '—')}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </aside>
  )
}

function ProvenanceBranch({ node, depth = 0, onOpenSource }) {
  const clickable = node.kind === 'source' && node.sourceId && typeof onOpenSource === 'function'
  return (
    <li className={`ii-prov-node is-${node.kind}`}>
      <p>
        <span>{node.title}</span>
        {clickable ? (
          <button type="button" className="ii-source-btn" onClick={() => onOpenSource(node.sourceId)}>
            {node.text}
          </button>
        ) : (
          <strong>{node.text}</strong>
        )}
      </p>
      {node.children?.length ? (
        <ul style={{ marginLeft: depth === 0 ? 0 : 14 }}>
          {node.children.map((child) => (
            <ProvenanceBranch key={child.id} node={child} depth={depth + 1} onOpenSource={onOpenSource} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function InfrastructureProvenance({ tree }) {
  const { openSource } = useSources()
  if (!tree) return null
  return (
    <div className="ii-prov" aria-label="Доказательства">
      <p className="ii-prov-note">{tree.note}</p>
      <ul className="ii-prov-tree">
        {tree.branches.map((branch) => (
          <ProvenanceBranch key={branch.id} node={branch} onOpenSource={openSource} />
        ))}
      </ul>
    </div>
  )
}
