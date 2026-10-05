// The couple's guest list on the send-invitation page: names in their order, and
// whether a link or message was already sent to each guest.
import { randomUUID } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { notFound } from '../../http/errors'
import type { Db } from '../client'
import { guests, type GuestRow } from '../schema'

export const GUESTS_MAX = 1000
export const GUEST_LIST_NAME_MAX = 200

export interface WireGuest {
  id: string
  name: string
  sentAt: string | null
}

export const toWireGuest = (g: GuestRow): WireGuest => ({
  id: g.id,
  name: g.name,
  sentAt: g.sentAt?.toISOString() ?? null,
})

export async function listGuests(db: Db, coupleId: string): Promise<GuestRow[]> {
  return db.select().from(guests).where(eq(guests.coupleId, coupleId)).orderBy(asc(guests.position))
}

/**
 * Replaces the list with `names`. A name that stays keeps its id and sent mark;
 * repeated names are matched in order.
 */
export async function saveGuests(db: Db, coupleId: string, names: string[]): Promise<GuestRow[]> {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db
    const pool = new Map<string, GuestRow[]>()
    for (const g of await listGuests(t, coupleId)) pool.set(g.name, [...(pool.get(g.name) ?? []), g])
    const next: GuestRow[] = names.map((name, position) => {
      const kept = pool.get(name)?.shift()
      return { id: kept?.id ?? randomUUID(), coupleId, name, position, sentAt: kept?.sentAt ?? null }
    })
    // ponytail: delete + insert of the whole list; fine at GUESTS_MAX, diff it if lists grow a lot.
    await t.delete(guests).where(eq(guests.coupleId, coupleId))
    if (next.length) await t.insert(guests).values(next)
    return next
  })
}

export async function setGuestSent(db: Db, coupleId: string, id: string, sent: boolean): Promise<GuestRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Tamu tidak ditemukan')
  const [row] = await db
    .update(guests)
    .set({ sentAt: sent ? new Date() : null })
    .where(and(eq(guests.id, id), eq(guests.coupleId, coupleId)))
    .returning()
  if (!row) throw notFound('Tamu tidak ditemukan')
  return row
}
