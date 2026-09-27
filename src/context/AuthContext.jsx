import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase'
import { sanitizePublicError } from '../services/coalDataService'

const AuthContext = createContext(null)

function unavailableResult() {
  return {
    ok: false,
    error: 'Подключение к данным временно недоступно.',
    needsConfirmation: false,
  }
}

function getClientSafe() {
  if (!getSupabaseConfigStatus().configured) return { client: null, error: unavailableResult().error }
  try {
    return { client: getSupabaseClient(), error: null }
  } catch (error) {
    return { client: null, error: sanitizePublicError(error) }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { client } = getClientSafe()
    if (!client) {
      setSession(null)
      setUser(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false

    client.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const next = data?.session ?? null
      setSession(next)
      setUser(next?.user ?? null)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setSession(null)
      setUser(null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { client, error } = getClientSafe()
    if (!client) return { ok: false, error, needsConfirmation: false }

    const { data, error: authError } = await client.auth.signUp({ email, password })
    if (authError) {
      return {
        ok: false,
        error: sanitizePublicError(authError),
        needsConfirmation: false,
      }
    }
    if (data.session) {
      return { ok: true, error: null, needsConfirmation: false }
    }
    return { ok: true, error: null, needsConfirmation: true }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { client, error } = getClientSafe()
    if (!client) return { ok: false, error }

    const { error: authError } = await client.auth.signInWithPassword({ email, password })
    if (authError) {
      return { ok: false, error: sanitizePublicError(authError) }
    }
    return { ok: true, error: null }
  }, [])

  const signOut = useCallback(async () => {
    const { client, error } = getClientSafe()
    if (!client) return { ok: false, error }

    const { error: authError } = await client.auth.signOut()
    if (authError) {
      return { ok: false, error: sanitizePublicError(authError) }
    }
    return { ok: true, error: null }
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [user, session, loading, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider')
  }
  return context
}
