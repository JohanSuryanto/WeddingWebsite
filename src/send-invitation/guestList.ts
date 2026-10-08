// The saved guest list behind the send-invitation page. The couple's page and the
// admin's page reach the same list through different API paths.
import type { Attendance } from '../content/types'
import { apiFetch } from '../data/http/client'

export interface Guest {
  id: string
  name: string
  /** When a link or message was copied or sent; null = not yet. */
  sentAt: string | null
  /** Their RSVP, if they answered through their own link. */
  reply: { attendance: Attendance; guestCount: number } | null
  /** They sent a wish through their own link. */
  wished: boolean
}

export interface GuestListApi {
  load(): Promise<Guest[]>
  /** Replaces the list; names that stay keep their sent mark. */
  save(names: string[]): Promise<Guest[]>
  setSent(id: string, sent: boolean): Promise<Guest>
}

const enc = encodeURIComponent

function api(base: string): GuestListApi {
  return {
    load: async () => (await apiFetch<{ guests: Guest[] }>(base)).guests,
    save: async (names) => (await apiFetch<{ guests: Guest[] }>(base, { method: 'PUT', body: { names } })).guests,
    setSent: async (id, sent) =>
      (await apiFetch<{ guest: Guest }>(`${base}/${enc(id)}`, { method: 'PATCH', body: { sent } })).guest,
  }
}

/** The couple's own page (behind their passcode). */
export const coupleGuestList = (slug: string) => api(`/couple/${enc(slug)}/guests`)
/** The admin's send-invitation page for one couple. */
export const adminGuestList = (coupleId: string) => api(`/admin/couples/${enc(coupleId)}/guests`)

/**
 * The saved guest for each row of `names`: the k-th "Budi" row gets the k-th saved
 * "Budi", so the right mark shows even while newer edits are still being saved.
 */
export function matchGuests(names: string[], guests: Guest[]): (Guest | undefined)[] {
  const pool = new Map<string, Guest[]>()
  for (const g of guests) pool.set(g.name, [...(pool.get(g.name) ?? []), g])
  return names.map((n) => pool.get(n)?.shift())
}
