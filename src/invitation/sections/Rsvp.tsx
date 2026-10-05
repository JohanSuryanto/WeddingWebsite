import { useEffect, useState, type FormEvent } from 'react'
import { FormField } from '../../components/FormField'
import { SectionShell } from '../../components/SectionShell'
import type { Attendance } from '../../content/types'
import { useGuestName } from '../../hooks/useGuestName'
import { tryFormatDateId } from '../../lib/dateFormat'
import { rsvpClosed } from '../../lib/rsvpDeadline'
import { GUESTS_MAX, GUESTS_MIN, NAME_MAX } from '../../lib/validation'
import { useServices, ValidationError, type FieldErrors, type RsvpResponse } from '../../services'
import { useWedding } from '../WeddingProvider'

type Status = 'idle' | 'submitting' | 'success'

export function Rsvp() {
  const { rsvpService } = useServices()
  const { rsvpDeadline } = useWedding()
  const closed = rsvpClosed(rsvpDeadline)
  const guest = useGuestName()
  const [name, setName] = useState(guest ?? '')
  const [attendance, setAttendance] = useState<Attendance | ''>('')
  const [guestCount, setGuestCount] = useState(1)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<RsvpResponse | null>(null)
  /** True when the shown response is this browser's earlier one (US5-1). */
  const [earlier, setEarlier] = useState(false)

  useEffect(() => {
    let active = true
    rsvpService.mine().then(
      (mine) => {
        if (!active || !mine) return
        setResult(mine)
        setName(mine.name)
        setAttendance(mine.attendance)
        if (mine.attendance === 'hadir') setGuestCount(mine.guestCount)
        setEarlier(true)
        setStatus('success')
      },
      () => {},
    )
    return () => {
      active = false
    }
  }, [rsvpService])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await rsvpService.submit({ name, attendance, guestCount })
      setErrors({})
      setResult(res)
      setEarlier(false)
      setStatus('success')
    } catch (err) {
      setErrors(
        err instanceof ValidationError
          ? err.fieldErrors
          : { form: 'Terjadi kesalahan, coba lagi.' },
      )
      setStatus('idle')
    }
  }

  return (
    <SectionShell
      id="rsvp"
      title="Konfirmasi Kehadiran"
      variant="alt"
      subtitle={
        rsvpDeadline && !closed
          ? `Mohon konfirmasi kehadiran Anda sebelum ${tryFormatDateId(`${rsvpDeadline}T12:00:00+07:00`)}.`
          : 'Mohon konfirmasi kehadiran Anda untuk membantu kami mempersiapkan acara.'
      }
    >
      <div className="card mx-auto max-w-lg px-5 py-8 sm:px-8">
        {status === 'success' && result ? (
          <div className="text-center" role="status">
            <p className="font-script text-4xl text-text">Terima kasih!</p>
            <p className="mt-3 text-text">
              Terima kasih atas konfirmasinya,{' '}
              <strong className="break-words">{result.name}</strong>!
            </p>
            <p className="mt-1 text-muted">
              {result.attendance === 'hadir'
                ? `Kami menantikan kehadiran Anda (${result.guestCount} orang).`
                : 'Doa restu Anda sangat berarti bagi kami.'}
            </p>
            {earlier && (
              <p className="mt-3 text-sm text-muted">
                Respons Anda sudah kami terima. Kirim lagi untuk mengubahnya.
              </p>
            )}
            {!closed && (
              <button type="button" className="btn-outline mt-6" onClick={() => setStatus('idle')}>
                Ubah jawaban
              </button>
            )}
          </div>
        ) : closed ? (
          <p className="text-center text-text" role="status">
            Konfirmasi kehadiran sudah ditutup. Terima kasih.
          </p>
        ) : (
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            <FormField id="rsvp-name" label="Nama" error={errors.name}>
              <input
                id="rsvp-name"
                className="field"
                value={name}
                maxLength={NAME_MAX}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'rsvp-name-error' : undefined}
              />
            </FormField>

            <fieldset aria-describedby={errors.attendance ? 'rsvp-attendance-error' : undefined}>
              <legend className="mb-1 font-bold text-text">Konfirmasi Kehadiran</legend>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['hadir', 'Hadir'],
                    ['tidak_hadir', 'Tidak Hadir'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                      attendance === value
                        ? 'border-primary bg-highlight font-bold text-highlight-text'
                        : 'border-primary/50 bg-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="attendance"
                      value={value}
                      checked={attendance === value}
                      onChange={() => setAttendance(value)}
                      className="accent-[var(--theme-primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors.attendance && (
                <p id="rsvp-attendance-error" className="field-error">
                  {errors.attendance}
                </p>
              )}
            </fieldset>

            {attendance === 'hadir' && (
              <FormField id="rsvp-count" label="Jumlah Tamu" error={errors.guestCount}>
                <select
                  id="rsvp-count"
                  className="field"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  aria-invalid={!!errors.guestCount}
                  aria-describedby={errors.guestCount ? 'rsvp-count-error' : undefined}
                >
                  {Array.from(
                    { length: GUESTS_MAX - GUESTS_MIN + 1 },
                    (_, i) => i + GUESTS_MIN,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n} orang
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {errors.form && <p className="field-error">{errors.form}</p>}

            <button type="submit" className="btn-primary w-full" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Mengirim…' : 'Kirim Konfirmasi'}
            </button>
          </form>
        )}
      </div>
    </SectionShell>
  )
}
