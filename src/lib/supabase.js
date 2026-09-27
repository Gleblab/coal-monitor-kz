import { createClient } from '@supabase/supabase-js'

function readPublicEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  return {
    url: typeof url === 'string' ? url.trim() : '',
    key: typeof key === 'string' ? key.trim() : '',
  }
}

export function getSupabaseConfigStatus() {
  const { url, key } = readPublicEnv()
  return {
    configured: Boolean(url && key),
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
  }
}

let client = null

export function getSupabaseClient() {
  const status = getSupabaseConfigStatus()
  if (!status.configured) {
    const missing = [
      !status.hasUrl ? 'VITE_SUPABASE_URL' : null,
      !status.hasKey ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : null,
    ].filter(Boolean)
    throw new Error(
      `Подключение к Supabase не настроено. Отсутствуют переменные: ${missing.join(', ')}.`,
    )
  }
  if (!client) {
    const { url, key } = readPublicEnv()
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
