import { useEffect, useState, type FormEvent } from 'react'
import { FormField } from '../../components/FormField'
import { SectionShell } from '../../components/SectionShell'
import { useToast } from '../../components/Toast'
import type { Attendance, Wish } from '../../content/types'
import { useGuestName } from '../../hooks/useGuestName'
import { formatRelativeId } from '../../lib/dateFormat'
import { MESSAGE_MAX, NAME_MAX } from '../../lib/validation'
import { useServices, ValidationError, type FieldErrors } from '../../services'

export function Wishes() {
  const { wishService } = useServices()
  const guest = useGuestName()
  const toast = useToast()
  const [wishes, setWishes] = useState<Wish[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [name, setName] = useState(guest ?? '')
  const [message, setMessage] = useState('')
  const [attendance, setAttendance] = useState<Attendance | ''>('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    wishService.list().then(
      (page) => {
        if (!active) return
        setWishes(page.items)
        setNextCursor(page.nextCursor)
      },
      () => {},
    )
    return () => {
      active = false
    }
  }, [wishService])

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const page = await wishService.list(nextCursor)
      // Skip any that were already shown (new wishes shift the pages).
      setWishes((prev) => [...prev, ...page.items.filter((w) => !prev.some((p) => p.id === w.id))])
      setNextCursor(page.nextCursor)
    } catch {
      toast('Gagal memuat ucapan, coba lagi.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const wish = await wishService.submit({
        name,
        message,
        attendance: attendance || undefined,
      })
      setWishes((prev) => [wish, ...prev])
      setMessage('')
      setErrors({})
      toast('Terima kasih atas ucapannya!')
    } catch (err) {
      setErrors(
        err instanceof ValidationError
          ? err.fieldErrors
          : { form: 'Terjadi kesalahan, coba lagi.' },
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionShell
      id="ucapan"
      title="Ucapan & Doa"
      subtitle="Kirimkan ucapan dan doa terbaik Anda untuk kedua mempelai."
    >
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <form noValidate onSubmit={onSubmit} className="card space-y-5 px-5 py-8 sm:px-8">
          <FormField id="wish-name" label="Nama" error={errors.name}>
            <input
              id="wish-name"
              className="field"
              value={name}
              maxLength={NAME_MAX}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'wish-name-error' : undefined}
            />
          </FormField>
          <FormField
            id="wish-message"
            label="Ucapan & Doa"
            error={errors.message}
            hint={
              <span className="text-xs text-muted" aria-live="polite">
                {message.length}/{MESSAGE_MAX}
              </span>
            }
          >
            <textarea
              id="wish-message"
              className="field min-h-32 resize-y"
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'wish-message-error' : undefined}
            />
          </FormField>
          <FormField id="wish-attendance" label="Kehadiran (opsional)">
            <select
              id="wish-attendance"
              className="field"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value as Attendance | '')}
            >
              <option value="">— Pilih —</option>
              <option value="hadir">Hadir</option>
              <option value="tidak_hadir">Tidak Hadir</option>
            </select>
          </FormField>
          {errors.form && <p className="field-error">{errors.form}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Mengirim…' : 'Kirim Ucapan'}
          </button>
        </form>

        <div className="card flex flex-col px-2 py-4 sm:px-4">
          <p className="px-3 pb-2 text-sm font-bold text-muted">
            {wishes.length}
            {nextCursor ? '+' : ''} ucapan
          </p>
          <ul
            aria-label="Daftar ucapan"
            data-testid="wish-list"
            className="max-h-[28rem] flex-1 space-y-3 overflow-y-auto px-2"
          >
            {wishes.map((w) => (
              <li key={w.id} className="rounded-xl bg-surface-alt/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold break-words text-text">{w.name}</p>
                  {w.attendance && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        w.attendance === 'hadir'
                          ? 'bg-highlight text-highlight-text'
                          : 'bg-surface text-muted'
                      }`}
                    >
                      {w.attendance === 'hadir' ? 'Hadir' : 'Tidak Hadir'}
                    </span>
                  )}
                </div>
                <p className="mt-1 break-words whitespace-pre-line text-text">{w.message}</p>
                <p className="mt-1 text-xs text-muted">{formatRelativeId(w.createdAt)}</p>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button
              type="button"
              className="btn-outline mx-2 mt-3 text-sm"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
            </button>
          )}
        </div>
      </div>
    </SectionShell>
  )
}
