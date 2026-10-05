import type { ReactNode } from 'react'
import type { Attendance } from '../content/types'
import type { RsvpRecord, RsvpTotals } from '../data/types'
import { formatRelativeId } from '../lib/dateFormat'

/** Totals cards: Hadir, Tidak hadir, Total tamu (US5-5). */
export function ResponseTotals({ totals, views }: { totals: RsvpTotals; views?: number }) {
  const cards = [
    ...(views === undefined ? [] : [{ label: 'Dibuka', value: views }]),
    { label: 'Hadir', value: totals.attending },
    { label: 'Tidak hadir', value: totals.notAttending },
    { label: 'Total tamu', value: totals.people },
  ]
  return (
    <dl className={`grid gap-3 ${views === undefined ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`} data-testid="rsvp-totals">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-surface-alt px-3 py-3 text-center">
          <dt className="text-xs font-bold text-muted uppercase">{c.label}</dt>
          <dd className="text-2xl font-bold text-text" data-testid={`total-${c.label}`}>
            {c.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const attendanceLabel = (a: Attendance) => (a === 'hadir' ? 'Hadir' : 'Tidak hadir')

/** RSVPs as stacked cards (readable at 320 px); `action` adds a per-row button. */
export function RsvpList({ rsvps, action }: { rsvps: RsvpRecord[]; action?: (r: RsvpRecord) => ReactNode }) {
  if (!rsvps.length) return <p className="text-sm text-muted">Belum ada konfirmasi kehadiran.</p>
  return (
    <ul className="divide-y divide-accent/20" data-testid="rsvp-list">
      {rsvps.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
          <span className="min-w-0 flex-1 font-bold break-words text-text">{r.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              r.attendance === 'hadir' ? 'bg-highlight text-highlight-text' : 'bg-surface-alt text-muted'
            }`}
          >
            {attendanceLabel(r.attendance)}
          </span>
          <span className="text-sm text-muted">{r.attendance === 'hadir' ? `${r.guestCount} orang` : '—'}</span>
          <span className="text-xs text-muted">{formatRelativeId(new Date(r.updatedAt))}</span>
          {action?.(r)}
        </li>
      ))}
    </ul>
  )
}
