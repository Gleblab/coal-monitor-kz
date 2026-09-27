import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email, password) {
  if (!email.trim()) return 'Укажите адрес электронной почты.'
  if (!EMAIL_RE.test(email.trim())) return 'Укажите корректный адрес электронной почты.'
  if (!password) return 'Укажите пароль.'
  if (password.length < 6) return 'Пароль должен содержать не менее 6 символов.'
  return null
}

export function AuthDialog({ open, onClose, onSignedIn }) {
  const { signIn, signUp } = useAuth()
  const titleId = useId()
  const emailRef = useRef(null)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    setMode('login')
    setEmail('')
    setPassword('')
    setBusy(false)
    setError(null)
    setInfo(null)
    const timer = window.setTimeout(() => emailRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const isRegister = mode === 'register'

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const invalid = validate(email, password)
    if (invalid) {
      setError(invalid)
      setInfo(null)
      return
    }

    setBusy(true)
    setError(null)
    setInfo(null)

    const trimmed = email.trim()
    if (isRegister) {
      const result = await signUp(trimmed, password)
      setBusy(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.needsConfirmation) {
        setPassword('')
        setInfo('Проверьте почту для подтверждения регистрации.')
        return
      }
      onSignedIn?.()
      onClose()
      return
    }

    const result = await signIn(trimmed, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSignedIn?.()
    onClose()
  }

  function switchMode(next) {
    if (busy) return
    setMode(next)
    setError(null)
    setInfo(null)
  }

  return (
    <div
      className="modal-back auth-modal-back"
      onClick={() => {
        if (!busy) onClose()
      }}
      role="presentation"
    >
      <div
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{isRegister ? 'Регистрация' : 'Вход'}</h2>
          <button
            type="button"
            className="ghost-btn"
            onClick={onClose}
            disabled={busy}
            aria-label="Закрыть"
          >
            Закрыть
          </button>
        </div>
        <p className="auth-lead">
          Аналитика открыта без регистрации. Аккаунт нужен только для персональных функций.
        </p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="auth-email">
            Электронная почта
            <input
              id="auth-email"
              ref={emailRef}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label htmlFor="auth-password">
            Пароль
            <input
              id="auth-password"
              type="password"
              name="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              required
              minLength={6}
            />
          </label>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="auth-info" role="status">
              {info}
            </p>
          ) : null}
          <button type="submit" className="ghost-btn auth-submit" disabled={busy}>
            {busy ? 'Подождите…' : isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? (
            <>
              Уже есть аккаунт?{' '}
              <button type="button" onClick={() => switchMode('login')} disabled={busy}>
                Войти
              </button>
            </>
          ) : (
            <>
              Нет аккаунта?{' '}
              <button type="button" onClick={() => switchMode('register')} disabled={busy}>
                Регистрация
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
