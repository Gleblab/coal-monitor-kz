import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useId, useState } from 'react'
import { getFiltersMeta } from '../api/marketApi'
import { useAuth } from '../context/AuthContext'
import { useFilters } from '../context/FilterContext'
import { useWatchlist } from '../context/WatchlistContext'
import { coalTypes as catalogCoalTypes, energySectors, ENERGY_ROLE_SECTOR_IDS, regions as catalogRegions } from '../data/catalog'
import { getFilterCapability } from '../data/filterCapabilities'
import { energySliceLabel, sliceLabel } from '../lib/format'
import { AuthDialog } from './AuthDialog'
import { ComparisonBar } from './comparison/ComparisonBar'
import { ComparisonWorkspace } from './comparison/ComparisonWorkspace'
import { MetricTraceDrawer } from './traceability/MetricTraceDrawer'
import { MarketSearchButton, MarketSearchPalette } from './search/MarketSearch'
import { WatchlistButton } from './watchlist/WatchlistButton'
import { WatchlistDrawer } from './watchlist/WatchlistDrawer'
import { ChangeCenterButton } from './change/ChangeCenterButton'
import { ChangeCenterDrawer } from './change/ChangeCenterDrawer'
import { SavedViewsBar } from './SavedViewsBar'
import { RouteScan } from './RouteScan'
import { SourceDialog } from './ui'

const navItems = [
  { to: '/', label: 'Обзор рынка', code: '01' },
  { to: '/energy-role', label: 'Роль угля в энергетике', code: '02' },
  { to: '/resources', label: 'Ресурсная база', code: '03' },
  { to: '/production', label: 'Объёмы и баланс', code: '04' },
  { to: '/geography', label: 'География и структура добычи', code: '05' },
  { to: '/outlook', label: 'Перспективы и развитие', code: '06' },
  { to: '/concentration', label: 'Концентрация рынка', code: '07' },
  { to: '/dynamics', label: 'Динамика цен', code: '08' },
  { to: '/retail', label: 'Розничные цены', code: '09' },
  { to: '/sources', label: 'Источники данных', code: '10' },
  { to: '/companies', label: 'Компании и добыча', code: '11' },
  { to: '/exports', label: 'Экспорт и внешние рынки', code: '12' },
  { to: '/constraints', label: 'Ограничения и задачи', code: '13' },
]

function BrandBlock({ compact = false }) {
  return (
    <div className={`brand${compact ? ' is-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true" />
      <div>
        <strong>Coal Monitor KZ</strong>
        {compact ? null : (
          <>
            <span className="brand-for">Prepared for Echelon Alpha</span>
            <span>Верифицированный контур</span>
          </>
        )}
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }) {
  return (
    <nav aria-label="Разделы мониторинга">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
        >
          <span className="nav-code">{item.code}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function AccountControl({ placement, onOpenLogin }) {
  const { user, loading, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  if (loading) {
    return (
      <div className={`account-control is-loading placement-${placement}`} aria-busy="true">
        <span className="account-placeholder" />
      </div>
    )
  }

  if (!user) {
    if (placement === 'sidebar') return null
    return (
      <div className={`account-control placement-${placement}`}>
        <button type="button" className="ghost-btn account-btn" onClick={onOpenLogin}>
          Войти
        </button>
      </div>
    )
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
  }

  return (
    <div className={`account-control placement-${placement}`}>
      <span className="account-email" title={user.email || ''}>
        {user.email}
      </span>
      <button
        type="button"
        className="ghost-btn account-btn"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? 'Выход…' : 'Выйти'}
      </button>
    </div>
  )
}

function Sidebar({ open, drawerId, onClose, inertMobile, onOpenLogin }) {
  return (
    <aside
      className={`sidebar${open ? ' is-open' : ''}`}
      id={drawerId}
      aria-label="Навигация"
      aria-hidden={inertMobile || undefined}
      inert={inertMobile || undefined}
    >
      <div className="sidebar-drawer-head">
        <BrandBlock />
        <button
          type="button"
          className="nav-icon-btn sidebar-close"
          onClick={onClose}
          aria-label="Закрыть меню"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <SidebarNav onNavigate={onClose} />
      <div className="sidebar-meta">
        <AccountControl
          placement="sidebar"
          onOpenLogin={() => {
            onClose()
            onOpenLogin()
          }}
        />
      </div>
    </aside>
  )
}

function FilterBar({ children }) {
  const location = useLocation()
  const { region, coalType, setRegion, setCoalType, resetFilters, filtersActive } = useFilters()
  const capability = getFilterCapability(location.pathname, { region, coalType })
  const [meta, setMeta] = useState({ regions: catalogRegions, coalTypes: catalogCoalTypes })

  useEffect(() => {
    getFiltersMeta()
      .then(setMeta)
      .catch(() => setMeta({ regions: catalogRegions, coalTypes: catalogCoalTypes }))
  }, [])

  const showRegion = capability.region
  const showSegment = capability.segment
  const showReset = showRegion || showSegment
  const overviewPage = location.pathname === '/'
  const energyRolePage = location.pathname === '/energy-role'
  const segmentOptions = energyRolePage ? energySectors : meta.coalTypes
  const segmentValue =
    energyRolePage && coalType !== 'all' && !ENERGY_ROLE_SECTOR_IDS.has(coalType)
      ? 'all'
      : coalType
  const activeSlice = energyRolePage
    ? energySliceLabel(region, segmentValue)
    : sliceLabel(region, coalType)

  return (
    <section className="filter-bar" aria-label="Фильтры по регионам и типам угля">
      <div className="filter-title">
        <span>Срез данных</span>
        <small>{activeSlice}</small>
      </div>
      {!showRegion ? (
        <div className="filter-scope">
          <span>Охват данных</span>
          <small>
            {overviewPage ? 'Казахстан · Национальный уровень' : 'Национальный уровень'}
          </small>
        </div>
      ) : (
        <label>
          Регион
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {meta.regions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showSegment ? (
        <label>
          Сегмент
          <select value={segmentValue} onChange={(e) => setCoalType(e.target.value)}>
            {segmentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showReset ? (
        <button type="button" className="ghost-btn" onClick={resetFilters} disabled={!filtersActive}>
          Сбросить
        </button>
      ) : null}
      {(showRegion === false || showSegment === false) && capability.reason ? (
        <p className="filter-slice-note">{capability.reason}</p>
      ) : null}
      {children}
    </section>
  )
}

function canGoBackInApp() {
  const idx = window.history.state?.idx
  return typeof idx === 'number' ? idx > 0 : false
}

export function Layout({ children }) {
  const { authNeed, clearAuthNeed, cancelPending } = useWatchlist()
  const [navOpen, setNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [resumeSave, setResumeSave] = useState(false)
  const [resumeList, setResumeList] = useState(false)
  const [authIntent, setAuthIntent] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const drawerId = useId()

  function goBack() {
    if (canGoBackInApp()) {
      navigate(-1)
      return
    }
    if (location.pathname !== '/') navigate('/')
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)')
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!authNeed) return undefined
    setAuthIntent('watchlist')
    setNavOpen(false)
    setAuthOpen(true)
    clearAuthNeed()
    return undefined
  }, [authNeed, clearAuthNeed])

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [navOpen])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        if (authOpen) return
        setNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authOpen])

  return (
    <div className={`app-shell${navOpen ? ' is-nav-open' : ''}`}>
      <header className="mobile-bar">
        <p className="mobile-bar-title">Coal Monitor KZ</p>
        <AccountControl
          placement="mobile"
          onOpenLogin={() => {
            setNavOpen(false)
            setAuthOpen(true)
          }}
        />
      </header>
      {navOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <Sidebar
        open={navOpen}
        drawerId={drawerId}
        onClose={() => setNavOpen(false)}
        inertMobile={isMobile && !navOpen}
        onOpenLogin={() => setAuthOpen(true)}
      />
      <div className="main-column">
        <div className="topbar-identity">
          <strong>Аналитический модуль рынка угля</strong>
          <span>Республика Казахстан · официальные публикации</span>
        </div>
        <header className="topbar">
          <div className="topbar-nav">
            <button
              type="button"
              className="nav-icon-btn topbar-menu"
              aria-label={navOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={navOpen}
              aria-controls={drawerId}
              onClick={() => setNavOpen((open) => !open)}
            >
              <span aria-hidden="true">{navOpen ? '×' : '☰'}</span>
            </button>
            <button
              type="button"
              className="nav-icon-btn topbar-back"
              aria-label="Назад"
              onClick={goBack}
            >
              <span aria-hidden="true">←</span>
            </button>
          </div>
          <div className="topbar-status">
            <div className="topbar-tools">
              <MarketSearchButton />
              <WatchlistButton />
              <ChangeCenterButton />
            </div>
            <span
              className="topbar-integrity"
              title="Контур достоверности включён"
              aria-label="Контур достоверности включён"
            >
              <span className="status-dot official" aria-hidden="true" />
              <span className="topbar-status-label">Контур достоверности включён</span>
            </span>
            <AccountControl placement="topbar" onOpenLogin={() => setAuthOpen(true)} />
          </div>
        </header>
        <FilterBar>
          <SavedViewsBar
            resumeSave={resumeSave}
            resumeList={resumeList}
            onResumeConsumed={() => {
              setResumeSave(false)
              setResumeList(false)
            }}
            onNeedAuth={(intent) => {
              setAuthIntent(intent === 'list' ? 'list' : 'save')
              setNavOpen(false)
              setAuthOpen(true)
            }}
          />
        </FilterBar>
        <main className="content">
          <RouteScan />
          {children}
        </main>
        <ComparisonBar />
      </div>
      <ComparisonWorkspace />
      <MetricTraceDrawer />
      <WatchlistDrawer />
      <ChangeCenterDrawer />
      <MarketSearchPalette />
      <SourceDialog />
      <AuthDialog
        open={authOpen}
        onClose={() => {
          if (authIntent === 'watchlist') cancelPending()
          setAuthOpen(false)
          setAuthIntent(null)
        }}
        onSignedIn={() => {
          if (authIntent === 'list') setResumeList(true)
          if (authIntent === 'save') setResumeSave(true)
          setAuthIntent(null)
        }}
      />
    </div>
  )
}
