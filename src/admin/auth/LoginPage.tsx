import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { FormField } from '../../components/FormField'
import { safeNext, useAuth } from './AuthProvider'
import { InvalidCredentialsError, LockedOutError } from './types'

export function LoginPage() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next')) ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Masuk · Admin Undangan'
  }, [])

  useEffect(() => {
    if (!lockedUntil) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [lockedUntil])

  if (session) return <Navigate to={next} replace />

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0
  const locked = secondsLeft > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      navigate(next, { replace: true })
    } catch (err) {
      setPassword('')
      if (err instanceof LockedOutError) {
        setLockedUntil(err.retryAt.getTime())
        setNow(Date.now())
      } else {
        setError(err instanceof InvalidCredentialsError ? err.message : (err as Error).message)
      }
      passwordRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="card w-full max-w-sm px-6 py-8">
        <p className="text-center font-script text-4xl text-text">Undangan</p>
        <h1 className="mt-1 text-center text-2xl text-text">Masuk Admin</h1>
        <p className="mt-1 text-center text-sm text-muted">Halaman ini hanya untuk admin.</p>

        <form noValidate onSubmit={onSubmit} className="mt-6 space-y-4">
          <FormField id="login-email" label="Email">
            <input
              id="login-email"
              type="email"
              className="field"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField id="login-password" label="Kata sandi">
            <input
              id="login-password"
              ref={passwordRef}
              type="password"
              className="field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={!!error}
              aria-describedby={error || locked ? 'login-error' : undefined}
            />
          </FormField>
          {(error || locked) && (
            <p id="login-error" role="alert" className="field-error">
              {locked ? `Terlalu banyak percobaan. Coba lagi dalam ${secondsLeft} detik.` : error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy || locked}>
            {busy ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  )
}
