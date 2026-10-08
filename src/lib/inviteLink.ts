import { GUEST_CODE_PARAM, GUEST_NAME_MAX, GUEST_NAME_PARAM } from './guestName'

/** Builds a personal invitation link: `<base>?inv=<name>&t=<theme>[&g=<guest code>]`. */
export function buildInviteUrl(base: string, guestName: string, themeCode: string, guestCode?: string): string {
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  const params = new URLSearchParams()
  const name = guestName.trim()
  if (name) params.set(GUEST_NAME_PARAM, name)
  params.set('t', themeCode)
  if (guestCode) params.set(GUEST_CODE_PARAM, guestCode)
  url.search = params.toString()
  return url.toString()
}

/** One guest per line; blank lines ignored, whitespace collapsed. */
export function parseGuestList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function isTooLong(name: string): boolean {
  return Array.from(name).length > GUEST_NAME_MAX
}

export interface MessageValues {
  nama: string
  link: string
  mempelai: string
  tanggal: string
  /** RSVP deadline, formatted; '' when there is none. */
  batas: string
}

/** Fills `{nama}`, `{link}`, `{mempelai}`, `{tanggal}` and `{batas}` in a message template. */
export function fillMessage(template: string, values: MessageValues): string {
  return template.replace(
    /\{(nama|link|mempelai|tanggal|batas)\}/g,
    (_, key: keyof MessageValues) => values[key],
  )
}

/** Opens WhatsApp with the message pre-filled; the sender picks the contact. */
export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
