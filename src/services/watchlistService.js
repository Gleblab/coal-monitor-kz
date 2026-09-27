import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase'
import { sanitizePublicError } from './coalDataService'

const FIELDS = 'id, metric_key, created_at'

function unavailable() {
  return {
    ok: false,
    rows: [],
    error: 'Подключение к данным временно недоступно.',
  }
}

export function normalizeMetricKey(value) {
  const key = String(value ?? '').trim()
  if (!key || key.length > 120) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) return null
  return key
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
        error: sanitizePublicError(error),
      }
    }
    return { ok: true, client, user: data?.user ?? null, rows: [], error: null }
  } catch (error) {
    return { ...unavailable(), client: null, user: null, error: sanitizePublicError(error) }
  }
}

export async function getWatchlist() {
  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, rows: [], error: auth.error }
  if (!auth.user) return { ok: true, rows: [], error: null }

  try {
    const { data, error } = await auth.client
      .from('metric_watchlist')
      .select(FIELDS)
      .order('created_at', { ascending: false })

    if (error) return { ok: false, rows: [], error: sanitizePublicError(error) }
    return { ok: true, rows: Array.isArray(data) ? data : [], error: null }
  } catch (error) {
    return { ok: false, rows: [], error: sanitizePublicError(error) }
  }
}

export async function addToWatchlist(metricKey) {
  const key = normalizeMetricKey(metricKey)
  if (!key) return { ok: false, error: 'Некорректный показатель.' }

  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, error: auth.error }
  if (!auth.user?.id) return { ok: false, error: 'Нужна авторизация.', needsAuth: true }

  try {
    const { error } = await auth.client.from('metric_watchlist').insert({
      user_id: auth.user.id,
      metric_key: key,
    })
    if (error) {
      if (error.code === '23505') return { ok: true, error: null }
      console.error(error)
      return { ok: false, error: sanitizePublicError(error) }
    }
    return { ok: true, error: null }
  } catch (error) {
    console.error(error)
    return { ok: false, error: sanitizePublicError(error) }
  }
}

export async function removeFromWatchlist(metricKey) {
  const key = normalizeMetricKey(metricKey)
  if (!key) return { ok: false, error: 'Некорректный показатель.' }

  const auth = await getClientAndUser()
  if (!auth.ok) return { ok: false, error: auth.error }
  if (!auth.user?.id) return { ok: false, error: 'Нужна авторизация.', needsAuth: true }

  try {
    const { error } = await auth.client.from('metric_watchlist').delete().eq('metric_key', key)
    if (error) {
      console.error(error)
      return { ok: false, error: sanitizePublicError(error) }
    }
    return { ok: true, error: null }
  } catch (error) {
    console.error(error)
    return { ok: false, error: sanitizePublicError(error) }
  }
}
