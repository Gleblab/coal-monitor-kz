import { TrendIcon } from './TrendIcon'
import { useChangeCenter } from '../../context/ChangeCenterContext'

export function ChangeCenterButton() {
  const { openChangeCenter, count } = useChangeCenter()
  return (
    <button
      type="button"
      className="market-search-trigger"
      title="Что изменилось?"
      aria-label="Что изменилось?"
      onClick={(event) => openChangeCenter(event.currentTarget)}
    >
      <TrendIcon className="market-search-trigger-icon" />
      <span className="market-search-trigger-label">Что изменилось?</span>
      {count > 0 ? <span className="watchlist-count">{count}</span> : null}
    </button>
  )
}
