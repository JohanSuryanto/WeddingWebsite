export const TIMEZONES = [
  { label: 'WIB', offset: '+07:00' },
  { label: 'WITA', offset: '+08:00' },
  { label: 'WIT', offset: '+09:00' },
] as const

export type TzOffset = (typeof TIMEZONES)[number]['offset']

const LOCAL = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/
const ISO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?([+-]\d{2}:\d{2})$/

/** "2027-02-14T08:00" + "+07:00" → "2027-02-14T08:00:00+07:00" ('' for empty input). */
export function toIsoWithOffset(local: string, offset: string): string {
  if (!local) return ''
  if (!LOCAL.test(local)) throw new Error(`Invalid local date-time: ${local}`)
  return `${local}:00${offset}`
}

/** "2027-02-14T08:00:00+07:00" → { local: "2027-02-14T08:00", offset: "+07:00" } */
export function fromIsoWithOffset(iso: string | null | undefined): {
  local: string
  offset: string
} {
  const m = iso ? ISO.exec(iso) : null
  return m ? { local: m[1], offset: m[2] } : { local: '', offset: '+07:00' }
}
