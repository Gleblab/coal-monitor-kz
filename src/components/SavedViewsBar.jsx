import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFilters } from '../context/FilterContext'
import { coalTypes, energySectors, regions } from '../data/catalog'
import { getFilterCapability } from '../data/filterCapabilities'
import { SkeletonBone as Bone } from './PageSkeleton'
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  renameSavedView,
} from '../services/savedViewsService'

const ROUTE_LABELS = {
  '/': 'Обзор рынка',
  '/energy-role': 'Роль угля в энергетике',
  '/resources': 'Ресурсная база',
  '/production': 'Объёмы и баланс',
  '/geography': 'География и структура добычи',
  '/outlook': 'Перспективы и развитие',
  '/concentration': 'Концентрация рынка',
  '/dynamics': 'Динамика цен',
  '/retail': 'Розничные цены',
  '/sources': 'Источники данных',
  '/companies': 'Компании и добыча',
  '/exports': 'Экспорт и внешние рынки',
  '/constraints': 'Ограничения и задачи',
}

function regionLabel(code) {
  return regions.find((item) => item.id === code)?.name || code
}

function segmentLabel(route, code) {
  const list = route === '/energy-role' ? energySectors : coalTypes
  return list.find((item) => item.id === code)?.name || code
}

function routeLabel(route) {
  return ROUTE_LABELS[route] || route
}

function suggestName(pathname, snapshot) {
  const page = routeLabel(pathname)
  if (snapshot.region === 'all' && snapshot.segment === 'all') return page.slice(0, 80)
  const region = regionLabel(snapshot.region)
  const shortPage = pathname === '/energy-role' ? 'энергетика' : page
  if (snapshot.segment === 'all') return `${region} — ${shortPage}`.slice(0, 80)
  return `${region} — ${segmentLabel(pathname, snapshot.segment)}`.slice(0, 80)
}

function filtersUnusedNotice(route, snapshot) {
  const capability = getFilterCapability(route, {
    region: snapshot.region,
    coalType: snapshot.segment,
  })
  const unusedRegion = !capability.region && snapshot.region !== 'all'
  const unusedSegment = !capability.segment && snapshot.segment !== 'all'
  if (!unusedRegion && !unusedSegment) return null
  return 'Часть сохранённых фильтров не применяется к этому разделу.'
}

function ModalShell({ title, onClose, busy, children, labelledBy }) {
  return (
    <div
      className="modal-back saved-views-modal-back"
      onClick={() => {
        if (!busy) onClose()
      }}
      role="presentation"
    >
      <div
        className="modal saved-views-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={labelledBy}>{title}</h2>
          <button type="button" className="ghost-btn" onClick={onClose} disabled={busy} aria-label="Закрыть">
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SavedViewsBar({ onNeedAuth, resumeSave, resumeList, onResumeConsumed }) {
  const { user } = useAuth()
  const { snapshot, setRegion, setCoalType } = useFilters()
  const location = useLocation()
  const navigate = useNavigate()
  const saveTitleId = useId()
  const listTitleId = useId()
  const renameTitleId = useId()
  const deleteTitleId = useId()
  const nameRef = useRef(null)

  const [listOpen, setListOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [name, setName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [rows, setRows] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const [status, setStatus] = useState(null)

  const loadList = useCallback(async () => {
    if (!user) {
      setRows([])
      setListError(null)
      setListLoading(false)
      return
    }
    setListLoading(true)
    const result = await listSavedViews()
    setListLoading(false)
    if (!result.ok) {
      setListError(result.error)
      setRows([])
      return
    }
    setListError(null)
    setRows(result.rows)
  }, [user])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!user) {
      setListOpen(false)
      setSaveOpen(false)
      setRenameTarget(null)
      setDeleteTarget(null)
      setRows([])
    }
  }, [user])

  useEffect(() => {
    if (!status) return undefined
    const timer = window.setTimeout(() => setStatus(null), 3500)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!resumeSave) return
    setName(suggestName(location.pathname, snapshot()))
    setFormError(null)
    setSaveOpen(true)
    onResumeConsumed?.()
  }, [resumeSave, onResumeConsumed, location.pathname, snapshot])

  useEffect(() => {
    if (!resumeList) return
    setListOpen(true)
    onResumeConsumed?.()
  }, [resumeList, onResumeConsumed])

  useEffect(() => {
    if (!saveOpen) return undefined
    const timer = window.setTimeout(() => nameRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [saveOpen])

  useEffect(() => {
    if (!saveOpen && !listOpen && !renameTarget && !deleteTarget) return undefined
    function onKey(event) {
      if (event.key !== 'Escape' || busy) return
      if (deleteTarget) {
        setDeleteTarget(null)
        return
      }
      if (renameTarget) {
        setRenameTarget(null)
        return
      }
      if (saveOpen) {
        setSaveOpen(false)
        return
      }
      setListOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveOpen, listOpen, renameTarget, deleteTarget, busy])

  function openSave() {
    if (!user) {
      onNeedAuth('save')
      return
    }
    setName(suggestName(location.pathname, snapshot()))
    setFormError(null)
    setSaveOpen(true)
  }

  function openList() {
    if (!user) {
      onNeedAuth('list')
      return
    }
    setListOpen(true)
    loadList()
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (busy) return
    const current = snapshot()
    setBusy(true)
    setFormError(null)
    const result = await createSavedView({
      name,
      route: location.pathname,
      region: current.region,
      segment: current.segment,
    })
    setBusy(false)
    if (!result.ok) {
        if (result.needsAuth) {
          setSaveOpen(false)
          onNeedAuth('save')
          return
        }
      setFormError(result.error)
      return
    }
    setSaveOpen(false)
    await loadList()
    setStatus('Вид сохранён.')
  }

  function applyView(view) {
    setRegion(view.region)
    setCoalType(view.segment)
    if (location.pathname !== view.route) {
      navigate(view.route)
    }
    setListOpen(false)
    const unused = filtersUnusedNotice(view.route, { region: view.region, segment: view.segment })
    setStatus(unused || `Открыт вид «${view.name}».`)
  }

  async function handleRename(event) {
    event.preventDefault()
    if (busy || !renameTarget) return
    setBusy(true)
    setFormError(null)
    const result = await renameSavedView(renameTarget.id, renameValue)
    setBusy(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setRenameTarget(null)
    await loadList()
    setStatus('Название обновлено.')
  }

  async function handleDelete() {
    if (busy || !deleteTarget) return
    setBusy(true)
    const result = await deleteSavedView(deleteTarget.id)
    setBusy(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setDeleteTarget(null)
    await loadList()
    setStatus('Вид удалён.')
  }

  return (
    <>
      <div className="saved-views-actions">
        <button type="button" className="ghost-btn" onClick={openSave}>
          Сохранить вид
        </button>
        <button type="button" className="ghost-btn" onClick={openList}>
          Сохранённые виды
        </button>
      </div>

      {status ? (
        <p className="saved-views-status" role="status">
          {status}
        </p>
      ) : null}

      {saveOpen ? (
        <ModalShell title="Сохранить вид" onClose={() => !busy && setSaveOpen(false)} busy={busy} labelledBy={saveTitleId}>
          <p className="saved-views-lead">
            Сохраняется только срез интерфейса: раздел, регион и сегмент. Показатели заново читаются из данных.
          </p>
          <form className="saved-views-form" onSubmit={handleCreate}>
            <label htmlFor="saved-view-name">
              Название
              <input
                id="saved-view-name"
                ref={nameRef}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
                required
              />
            </label>
            <p className="saved-views-meta">
              {routeLabel(location.pathname)} · {regionLabel(snapshot().region)}
              {snapshot().segment !== 'all' ? ` · ${segmentLabel(location.pathname, snapshot().segment)}` : ''}
            </p>
            {formError ? (
              <p className="auth-error" role="alert">
                {formError}
              </p>
            ) : null}
            <button type="submit" className="ghost-btn auth-submit" disabled={busy}>
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </ModalShell>
      ) : null}

      {listOpen ? (
        <ModalShell
          title="Сохранённые виды"
          onClose={() => !busy && setListOpen(false)}
          busy={busy}
          labelledBy={listTitleId}
        >
          {listLoading ? (
            <div className="saved-views-skel" aria-busy="true" aria-label="Загрузка сохранённых видов">
              <Bone className="sk-line sk-line-copy" />
              <Bone className="sk-line sk-line-copy-short" />
              <Bone className="sk-line sk-line-copy" />
            </div>
          ) : null}
          {listError ? (
            <p className="auth-error" role="alert">
              {listError}
            </p>
          ) : null}
          {!listLoading && !listError && rows.length === 0 ? (
            <p className="saved-views-lead">Сохранённых видов пока нет</p>
          ) : null}
          <ul className="saved-views-list">
            {rows.map((view) => (
              <li key={view.id}>
                <div className="saved-views-item-copy">
                  <strong>{view.name}</strong>
                  <span>
                    {routeLabel(view.route)}
                    {' · '}
                    {regionLabel(view.region)}
                    {view.segment !== 'all' ? ` · ${segmentLabel(view.route, view.segment)}` : ''}
                  </span>
                </div>
                <div className="saved-views-item-actions">
                  <button type="button" className="ghost-btn" onClick={() => applyView(view)}>
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setFormError(null)
                      setRenameValue(view.name)
                      setRenameTarget(view)
                    }}
                  >
                    Переименовать
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setFormError(null)
                      setDeleteTarget(view)
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </ModalShell>
      ) : null}

      {renameTarget ? (
        <ModalShell
          title="Переименовать вид"
          onClose={() => !busy && setRenameTarget(null)}
          busy={busy}
          labelledBy={renameTitleId}
        >
          <form className="saved-views-form" onSubmit={handleRename}>
            <label htmlFor="saved-view-rename">
              Название
              <input
                id="saved-view-rename"
                value={renameValue}
                maxLength={80}
                onChange={(event) => setRenameValue(event.target.value)}
                disabled={busy}
                required
              />
            </label>
            {formError ? (
              <p className="auth-error" role="alert">
                {formError}
              </p>
            ) : null}
            <button type="submit" className="ghost-btn auth-submit" disabled={busy}>
              {busy ? 'Сохранение…' : 'Сохранить название'}
            </button>
          </form>
        </ModalShell>
      ) : null}

      {deleteTarget ? (
        <ModalShell
          title="Удалить вид"
          onClose={() => !busy && setDeleteTarget(null)}
          busy={busy}
          labelledBy={deleteTitleId}
        >
          <p className="saved-views-lead">Удалить сохранённый вид «{deleteTarget.name}»?</p>
          {formError ? (
            <p className="auth-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="saved-views-item-actions">
            <button type="button" className="ghost-btn" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Отмена
            </button>
            <button type="button" className="ghost-btn auth-submit" onClick={handleDelete} disabled={busy}>
              {busy ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  )
}
