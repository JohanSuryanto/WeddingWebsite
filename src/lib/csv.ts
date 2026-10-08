// Spreadsheets (research R16): UTF-8 with BOM so Excel shows Indonesian text,
// RFC 4180 quoting, and formula injection neutralised. Shared by the server (RSVP
// export) and the browser (guest list export).
import type { Attendance } from '../content/types'

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

export function formatWib(d: Date): string {
  const parts = Object.fromEntries(wib.formatToParts(d).map((p) => [p.type, p.value]))
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

/** A whole CSV file: header row, then one row per entry; every cell quoted as needed. */
export function toCsv(header: string[], rows: string[][]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}

export function rsvpCsv(rows: CsvRsvp[]): string {
  return toCsv(
    ['Nama', 'Kehadiran', 'Jumlah Tamu', 'Waktu (WIB)'],
    rows.map((r) => [
      r.name,
      r.attendance === 'hadir' ? 'Hadir' : 'Tidak hadir',
      String(r.guestCount),
      formatWib(r.submittedAt),
    ]),
  )
}

/** <prefix>-<slug>-YYYYMMDD.csv (date in WIB), e.g. rsvp-anisa-raka-20261008.csv. */
export function csvFileName(slug: string, now = new Date(), prefix = 'rsvp'): string {
  const d = formatWib(now).slice(0, 10).split('/')
  return `${prefix}-${slug}-${d[2]}${d[1]}${d[0]}.csv`
}
