// RSVP spreadsheet (research R16): UTF-8 with BOM so Excel shows Indonesian text,
// RFC 4180 quoting, and formula injection neutralised.
import type { Attendance } from '../../src/content/types'

export interface CsvRsvp {
  name: string
  attendance: Attendance
  guestCount: number
  submittedAt: Date
}

const wib = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Byte-order mark: Excel then reads the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff)

function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function formatWib(d: Date): string {
  const parts = Object.fromEntries(wib.formatToParts(d).map((p) => [p.type, p.value]))
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

export function rsvpCsv(rows: CsvRsvp[]): string {
  const lines = [
    'Nama,Kehadiran,Jumlah Tamu,Waktu (WIB)',
    ...rows.map((r) =>
      [cell(r.name), r.attendance === 'hadir' ? 'Hadir' : 'Tidak hadir', String(r.guestCount), formatWib(r.submittedAt)].join(','),
    ),
  ]
  return BOM + lines.join('\r\n') + '\r\n'
}

/** rsvp-<slug>-YYYYMMDD.csv (date in WIB). */
export function csvFileName(slug: string, now = new Date()): string {
  const d = formatWib(now).slice(0, 10).split('/')
  return `rsvp-${slug}-${d[2]}${d[1]}${d[0]}.csv`
}
