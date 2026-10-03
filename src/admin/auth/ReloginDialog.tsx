import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { FormField } from '../../components/FormField'
import { Dialog } from '../components/Dialog'
import { authService, useAuth } from './AuthProvider'
import { onReloginRequested, reloginCancelled, reloginSucceeded } from './relogin'
import { InvalidCredentialsError, LockedOutError } from './types'

/**
 * Opens over the current page when the session ends mid-work, so unsaved edits
 * survive; a pending save is retried after logging in (US2-4).
 */
export function ReloginDialog() {
  const { session, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const show = () => setOpen(true)
    const offExpired = authService.onExpired(show)
    const offRequested = onReloginRequested(show)
    return () => {
      offExpired()
      offRequested()
    }
  }, [])

  // Stable: Dialog re-focuses its first control whenever onClose changes. Esc does nothing here.
  const ignoreClose = useCallback(() => {}, [])

  if (!open) return null
  const email = session?.email ?? ''

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await authService.login(email, password)
      setOpen(false)
      setPassword('')
      reloginSucceeded()
    } catch (err) {
      setPassword('')
      if (err instanceof LockedOutError || err instanceof InvalidCredentialsError) setError(err.message)
      else setError('Gagal masuk. Periksa koneksi lalu coba lagi.')
      passwordRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  async function onLeave() {
    setOpen(false)
    reloginCancelled()
    // Clearing the session makes the route guard go to /login.
    await logout().catch(() => {})
  }

  return (
    <Dialog
      title="Sesi berakhir, silakan masuk lagi"
      onClose={ignoreClose}
      actions={
        <>
          <button type="button" className="btn-outline" onClick={onLeave}>
            Keluar
          </button>
          <button type="submit" form="relogin-form" className="btn-primary" disabled={busy || !password}>
            Masuk
          </button>
        </>
      }
    >
      <form id="relogin-form" onSubmit={onSubmit} className="mt-2 grid gap-3">
        <p className="text-sm text-muted">Perubahan yang belum disimpan tetap ada dan disimpan setelah Anda masuk.</p>
        <p className="text-sm">
          Masuk sebagai <strong>{email}</strong>
        </p>
        <FormField id="relogin-password" label="Kata sandi" error={error ?? undefined}>
          <input
            id="relogin-password"
            ref={passwordRef}
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'relogin-password-error' : undefined}
          />
        </FormField>
      </form>
    </Dialog>
  )
}
