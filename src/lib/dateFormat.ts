const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

interface LocalParts {
  year: number
  month: number
  day: number
  weekday: number
  hour: number
  minute: number
  offset: string
}

/**
 * Reads the wall-clock parts of an ISO string in its *own* offset, so an event
 * in Jakarta shows "08.00 WIB" no matter where the guest opens the invitation.
 */
function localParts(iso: string): LocalParts {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(iso)
  if (!m) throw new Error(`Invalid ISO date with offset: ${iso}`)
  const [, y, mo, d, h, mi, off] = m
  const weekday = new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()
  return {
    year: +y,
    month: +mo,
    day: +d,
    weekday,
    hour: +h,
    minute: +mi,
    offset: off === 'Z' ? '+00:00' : off,
  }
}

export function tzLabel(offset: string): string {
  switch (offset) {
    case '+07:00':
      return 'WIB'
    case '+08:00':
      return 'WITA'
    case '+09:00':
      return 'WIT'
    default:
      return `UTC${offset}`
  }
}

/** "Minggu, 14 Februari 2027" */
export function formatDateId(iso: string): string {
  const p = localParts(iso)
  return `${DAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}`
}

/** Like formatDateId, but returns '' for a missing or invalid date (unfinished drafts). */
export function tryFormatDateId(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return formatDateId(iso)
  } catch {
    return ''
  }
}

/** "14 . 02 . 2027" */
export function formatDateShort(iso: string): string {
  const p = localParts(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(p.day)} . ${pad(p.month)} . ${p.year}`
}

function time(p: LocalParts): string {
  return `${String(p.hour).padStart(2, '0')}.${String(p.minute).padStart(2, '0')}`
}

/** "08.00 – 10.00 WIB" or "08.00 WIB – Selesai" */
export function formatTimeRangeId(start: string, end: string | null): string {
  const s = localParts(start)
  const tz = tzLabel(s.offset)
  if (!end) return `${time(s)} ${tz} – Selesai`
  return `${time(s)} – ${time(localParts(end))} ${tz}`
}

/** "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu", or a date. */
export function formatRelativeId(date: Date, now: Date = new Date()): string {
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 0) return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} hari lalu`
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
