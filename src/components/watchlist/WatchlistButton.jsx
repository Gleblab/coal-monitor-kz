import { BookmarkIcon } from './BookmarkIcon'
import { useWatchlist } from '../../context/WatchlistContext'

export function WatchlistButton() {
  const { openWatchlist, count } = useWatchlist()
  return (
    <button
      type="button"
      className="market-search-trigger"
      title="Мой мониторинг"
      aria-label="Мой мониторинг"
      onClick={(event) => openWatchlist(event.currentTarget)}
    >
      <BookmarkIcon className="market-search-trigger-icon" />
      <span className="market-search-trigger-label">Мой мониторинг</span>
      {count > 0 ? <span className="watchlist-count">{count}</span> : null}
    </button>
  )
}
