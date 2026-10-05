import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { InvalidPasscodeError, LockedOutError } from '../data/types'
import { DEFAULT_THEME, ThemeProvider, themes } from '../themes'

const LENGTH = 4

/**
 * "Masukkan kode akses": the only thing shown on a couple's send-invitation page
 * until the right 4-digit code is entered (US4, FR-010b).
 */
export function PasscodeScreen({
  names,
  initialRetryAt,
  onSubmit,
}: {
  names: string
  initialRetryAt: Date | null
  /** Rejects with InvalidPasscodeError or LockedOutError. */
  onSubmit: (passcode: string) => Promise<void>
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [retryAt, setRetryAt] = useState<Date | null>(initialRetryAt)
  const [now, setNow] = useState(() => Date.now())
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const { CoverBackdrop } = themes[DEFAULT_THEME].ornaments

  const lockedFor = retryAt ? Math.max(0, retryAt.getTime() - now) : 0
  const locked = lockedFor > 0

  useEffect(() => {
    document.title = `Kode akses · ${names}`
  }, [names])

  useEffect(() => {
    if (!retryAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [retryAt])

  // Focus the first box when the screen opens or the pause ends, unless typing has
  // already started: a late effect stealing focus back would drop the next digits.
  useEffect(() => {
    if (!locked && !inputs.current.includes(document.activeElement as HTMLInputElement)) {
      inputs.current[0]?.focus()
    }
  }, [locked])

  async function submit(code: string) {
    setBusy(true)
    setError(null)
    try {
      await onSubmit(code)
    } catch (err) {
      setDigits(Array(LENGTH).fill(''))
      if (err instanceof LockedOutError) {
        // The 1-second tick below keeps the countdown current.
        setRetryAt(err.retryAt)
      } else {
        setError(err instanceof InvalidPasscodeError ? 'Kode akses salah' : 'Gagal memeriksa kode. Coba lagi.')
        window.setTimeout(() => inputs.current[0]?.focus(), 0)
      }
    } finally {
      setBusy(false)
    }
  }

  function update(next: string[]) {
    setDigits(next)
    if (next.every((d) => d !== '')) void submit(next.join(''))
  }

  function onChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    if (digit && i < LENGTH - 1) inputs.current[i + 1]?.focus()
    update(next)
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      const next = [...digits]
      next[i - 1] = ''
      setDigits(next)
      inputs.current[i - 1]?.focus()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? '')
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
    update(next)
  }

  const minutes = Math.max(1, Math.ceil(lockedFor / 60_000))

  return (
    <ThemeProvider themeId={DEFAULT_THEME}>
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-16 text-center">
        <CoverBackdrop />
        <div className="card relative z-[1] w-full max-w-sm px-6 py-10">
          <p className="font-script text-4xl text-text">{names}</p>
          <h1 className="mt-3 text-2xl text-text">Masukkan kode akses</h1>
          <p className="mt-2 text-sm text-muted">Kode 4 angka dari admin untuk membuka halaman kirim undangan.</p>
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (digits.every((d) => d)) void submit(digits.join(''))
            }}
          >
            <fieldset disabled={busy || locked} className="flex justify-center gap-3">
              <legend className="sr-only">Kode akses</legend>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  className="field h-14 w-12 text-center font-mono text-2xl"
                  value={d}
                  inputMode="numeric"
                  pattern="\d"
                  maxLength={1}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Digit ${i + 1}`}
                  aria-invalid={!!error}
                  aria-describedby={error || locked ? 'passcode-error' : undefined}
                  onChange={(e) => onChange(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onPaste={onPaste}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </fieldset>
          </form>
          <p id="passcode-error" className="field-error mt-4 min-h-6" role="alert" aria-live="polite">
            {locked ? `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.` : (error ?? '')}
          </p>
          {busy && (
            <p className="text-sm text-muted" role="status">
              Memeriksa…
            </p>
          )}
        </div>
      </main>
    </ThemeProvider>
  )
}
