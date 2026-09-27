import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase'
import { sanitizePublicError } from './coalDataService'

const SAVED_VIEW_FIELDS = 'id, name, route, region, segment, created_at, updated_at'

function unavailable() {
  return {
    ok: false,
    row: null,
    rows: [],
    error: 'Подключение к данным временно недоступно.',
  }
}

function isUniqueNameViolation(error) {
  const code = error?.code
  const message = String(error?.message || '')
  return (
    code === '23505' ||
    /saved_views_user_name_normalized_uidx|saved_views_user_name_uidx|duplicate key/i.test(message)
  )
}

function mapWriteError(error) {
  if (isUniqueNameViolation(error)) {
    return 'Вид с таким названием уже существует.'
  }
  return sanitizePublicError(error)
}

export function normalizeSavedViewName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/gu, ' ')
}

function validateName(name) {
  const normalized = normalizeSavedViewName(name)
  if (!normalized) return { ok: false, error: 'Укажите название.' }
  if (normalized.length > 80) return { ok: false, error: 'Название не длиннее 80 символов.' }
  return { ok: true, name: normalized }
}

async function getClientAndUser() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) return { ...unavailable(), client: null, user: null }
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.auth.getUser()
    if (error) {
      return {
        ok: false,
        client,
        user: null,
        rows: [],
        row: null,
        error: sanitizePublicError(error),
      }
    }
    return { ok: true, client, user: data?.user ?? null, rows: [], row: null, error: null }
  } catch (error) {
    return { ...unavailable(), client: null, user: null, error: sanitizePublicError(error) }
  }
}

export async function listSavedViews() {
  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, rows: [], error: auth.error }
  if (!auth.user) return { ok: true, rows: [], error: null }

  try {
    const { data, error } = await auth.client
      .from('saved_views')
      .select(SAVED_VIEW_FIELDS)
      .order('updated_at', { ascending: false })

    if (error) return { ok: false, rows: [], error: sanitizePublicError(error) }
    return { ok: true, rows: Array.isArray(data) ? data : [], error: null }
  } catch (error) {
    return { ok: false, rows: [], error: sanitizePublicError(error) }
  }
}

export async function createSavedView({ name, route, region, segment }) {
  const checked = validateName(name)
  if (!checked.ok) return { ok: false, row: null, error: checked.error }

  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, row: null, error: auth.error }
  if (!auth.user?.id) {
    return { ok: false, row: null, error: 'Нужна авторизация.', needsAuth: true }
  }
  if (typeof route !== 'string' || !route.startsWith('/') || route.length > 120) {
    return { ok: false, row: null, error: 'Некорректный раздел для сохранения.' }
  }
  if (typeof region !== 'string' || !region.trim() || typeof segment !== 'string' || !segment.trim()) {
    return { ok: false, row: null, error: 'Некорректный срез фильтров.' }
  }

  try {
    const { data, error } = await auth.client
      .from('saved_views')
      .insert({
        user_id: auth.user.id,
        name: checked.name,
        route,
        region,
        segment,
      })
      .select(SAVED_VIEW_FIELDS)
      .single()

    if (error) return { ok: false, row: null, error: mapWriteError(error) }
    return { ok: true, row: data, error: null }
  } catch (error) {
    return { ok: false, row: null, error: mapWriteError(error) }
  }
}

export async function renameSavedView(id, name) {
  if (!id) return { ok: false, row: null, error: 'Не указано представление.' }
  const checked = validateName(name)
  if (!checked.ok) return { ok: false, row: null, error: checked.error }

  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, row: null, error: auth.error }
  if (!auth.user?.id) {
    return { ok: false, row: null, error: 'Нужна авторизация.', needsAuth: true }
  }

  try {
    const { data, error } = await auth.client
      .from('saved_views')
      .update({ name: checked.name })
      .eq('id', id)
      .select(SAVED_VIEW_FIELDS)
      .single()

    if (error) return { ok: false, row: null, error: mapWriteError(error) }
    return { ok: true, row: data, error: null }
  } catch (error) {
    return { ok: false, row: null, error: mapWriteError(error) }
  }
}

export async function deleteSavedView(id) {
  if (!id) return { ok: false, error: 'Не указано представление.' }

  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, error: auth.error }
  if (!auth.user?.id) {
    return { ok: false, error: 'Нужна авторизация.', needsAuth: true }
  }

  try {
    const { error } = await auth.client.from('saved_views').delete().eq('id', id)
    if (error) return { ok: false, error: sanitizePublicError(error) }
    return { ok: true, error: null }
  } catch (error) {
    return { ok: false, error: sanitizePublicError(error) }
  }
}
