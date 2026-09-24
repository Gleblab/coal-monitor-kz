import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getFiltersMeta } from '../api/marketApi'
import { useFilters } from '../context/FilterContext'
import { coalTypeLabel, regionLabel } from '../lib/format'
import { SourceDialog } from './ui'

const navItems = [
  { to: '/', label: 'Обзор рынка', code: '01' },
  { to: '/energy-role', label: 'Роль угля в энергетике', code: '02' },
  { to: '/resources', label: 'Ресурсная база', code: '03' },
  { to: '/production', label: 'Объёмы и баланс', code: '04' },
  { to: '/outlook', label: 'Перспективы и развитие', code: '05' },
  { to: '/concentration', label: 'Концентрация рынка', code: '06' },
  { to: '/dynamics', label: 'Динамика цен', code: '07' },
  { to: '/retail', label: 'Розничные цены', code: '08' },
  { to: '/sources', label: 'Источники данных', code: '09' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <strong>Coal Monitor KZ</strong>
          <span>Верифицированный контур</span>
        </div>
      </div>
      <nav>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <span className="nav-code">{item.code}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-meta">
        <p>Правило: нет источника — нет цифры</p>
        <p>При отсутствии данных: «Нет подтвержденных данных»</p>
      </div>
    </aside>
  )
}

function FilterBar() {
  const { region, coalType, setRegion, setCoalType, resetFilters, filtersActive } = useFilters()
  const [meta, setMeta] = useState({ regions: [], coalTypes: [] })

  useEffect(() => {
    getFiltersMeta()
      .then(setMeta)
      .catch(() => setMeta({ regions: [], coalTypes: [] }))
  }, [])

  return (
    <section className="filter-bar" aria-label="Фильтры по регионам и типам угля">
      <div className="filter-title">
        <span>Фильтры среза</span>
        <small>
          {filtersActive
            ? `${regionLabel(region)} · ${coalTypeLabel(coalType)}`
            : 'Республика · все сегменты'}
        </small>
      </div>
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
      <label>
        Сегмент
        <select value={coalType} onChange={(e) => setCoalType(e.target.value)}>
          {meta.coalTypes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="ghost-btn" onClick={resetFilters} disabled={!filtersActive}>
        Сбросить
      </button>
    </section>
  )
}

export function Layout({ children }) {
  return (
    <div className="app-shell">
      <div className="info-banner" role="status">
        Показатели основного контура сопровождаются источником, периодом и единицей измерения.
        Неподтвержденные значения не подставляются.
      </div>
      <Sidebar />
      <div className="main-column">
        <header className="topbar">
          <div>
            <strong>Аналитический модуль рынка угля</strong>
            <span>Республика Казахстан · официальные публикации</span>
          </div>
          <div className="topbar-status">
            <span className="status-dot official" />
            Контур достоверности включён
          </div>
        </header>
        <FilterBar />
        <main className="content">{children}</main>
      </div>
      <SourceDialog />
    </div>
  )
}
