export const GUEST_NAME_MAX = 60
export const GUEST_NAME_PARAM = 'inv'

/** A query segment that starts a real parameter, e.g. `t=2` or `fbclid=...`. */
const PARAM_START = /^[A-Za-z][\w.-]*=/

function decodePart(part: string): string {
  const plus = part.replace(/\+/g, ' ')
  try {
    return decodeURIComponent(plus)
  } catch {
    return plus
  }
}

/**
 * Reads the raw guest name from `?inv=` (contracts/url-parameters.md).
 *
 * An unencoded `&` inside the name is kept, so `?inv=Johan & Partner&t=2`
 * gives "Johan & Partner": segments after `inv=` are joined back with `&`
 * until a segment that looks like another parameter (`key=value`).
 */
function readInvParam(search: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  const parts = query.split('&')
  const start = parts.findIndex((p) => p.startsWith(`${GUEST_NAME_PARAM}=`))
  if (start === -1) return null
  const pieces = [parts[start].slice(GUEST_NAME_PARAM.length + 1)]
  for (const part of parts.slice(start + 1)) {
    if (PARAM_START.test(part)) break
    pieces.push(part)
  }
  return pieces.map(decodePart).join('&')
}

/**
 * Returns the guest name for the cover and forms, or null when absent/empty.
 * The result is always rendered as plain text.
 */
export function parseGuestName(search: string): string | null {
  const raw = readInvParam(search)
  if (raw == null) return null
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Tolerate the placeholder braces from "?inv={Nama Tamu}".
    .replace(/^\{\s*(.*?)\s*\}$/, '$1')
  if (!cleaned) return null
  return Array.from(cleaned).slice(0, GUEST_NAME_MAX).join('').trim()
}

/** `?g=`: which saved guest a personal link is for, so their reply can be matched. */
export const GUEST_CODE_PARAM = 'g'

/** A guest's link code: the first 8 characters of their id. */
export const guestCodeOf = (guestId: string) => guestId.slice(0, 8).toLowerCase()

/** The guest code from `?g=`, or null when absent or malformed. */
export function parseGuestCode(search: string): string | null {
  const code = new URLSearchParams(search).get(GUEST_CODE_PARAM)?.toLowerCase()
  return code && /^[0-9a-f]{8}$/.test(code) ? code : null
}
