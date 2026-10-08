// The couple's guest list on the send-invitation page: names in their order,
// whether a link was already sent, and the RSVP or wish that came back through
// the guest's own link (`?g=<code>`).
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { Attendance } from '../../../src/content/types'
import { notFound } from '../../http/errors'
import type { Db } from '../client'
import { guests, rsvps, wishes, type GuestRow } from '../schema'

export const GUESTS_MAX = 1000
export const GUEST_LIST_NAME_MAX = 200

export interface WireGuest {
  id: string
  name: string
  sentAt: string | null
  /** The guest's RSVP, if they answered through their link. */
  reply: { attendance: Attendance; guestCount: number } | null
  /** They sent a wish through their link (hidden wishes don't count). */
  wished: boolean
}

export async function listGuests(db: Db, coupleId: string): Promise<GuestRow[]> {
  return db.select().from(guests).where(eq(guests.coupleId, coupleId)).orderBy(asc(guests.position))
}

/** `rows` with their replies, for the API. */
export async function withReplies(db: Db, coupleId: string, rows: GuestRow[]): Promise<WireGuest[]> {
  const answers = await db
    .select({ guestId: rsvps.guestId, attendance: rsvps.attendance, guestCount: rsvps.guestCount })
    .from(rsvps)
    .where(and(eq(rsvps.coupleId, coupleId), isNotNull(rsvps.guestId)))
    .orderBy(desc(rsvps.updatedAt))
  const reply = new Map<string, WireGuest['reply']>()
  // Newest first: a guest who answered from two devices shows their latest answer.
  for (const { guestId, attendance, guestCount } of answers) {
    if (!reply.has(guestId!)) reply.set(guestId!, { attendance, guestCount })
  }
  const wishers = await db
    .selectDistinct({ guestId: wishes.guestId })
    .from(wishes)
    .where(and(eq(wishes.coupleId, coupleId), isNotNull(wishes.guestId), eq(wishes.hidden, false)))
  const wished = new Set(wishers.map((w) => w.guestId!))
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    sentAt: g.sentAt?.toISOString() ?? null,
    reply: reply.get(g.id) ?? null,
    wished: wished.has(g.id),
  }))
}

/**
 * Replaces the list with `names`. A name that stays keeps its id, sent mark and
 * replies; repeated names are matched in order. Removed guests are deleted, which
 * unlinks their replies (the replies themselves stay).
 */
export async function saveGuests(db: Db, coupleId: string, names: string[]): Promise<GuestRow[]> {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db
    const current = await listGuests(t, coupleId)
    const pool = new Map<string, GuestRow[]>()
    for (const g of current) pool.set(g.name, [...(pool.get(g.name) ?? []), g])
    const next: GuestRow[] = names.map((name, position) => {
      const kept = pool.get(name)?.shift()
      return { id: kept?.id ?? randomUUID(), coupleId, name, position, sentAt: kept?.sentAt ?? null }
    })
    const keep = new Set(next.map((g) => g.id))
    const removed = current.filter((g) => !keep.has(g.id)).map((g) => g.id)
    if (removed.length) await t.delete(guests).where(inArray(guests.id, removed))
    if (next.length) {
      await t
        .insert(guests)
        .values(next)
        .onConflictDoUpdate({ target: guests.id, set: { position: sql`excluded.position` } })
    }
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

/** The guest a link code (`?g=`, first 8 characters of the id) belongs to, if any. */
export async function guestIdForCode(db: Db, coupleId: string, code: string | undefined): Promise<string | null> {
  if (!code || !/^[0-9a-f]{8}$/i.test(code)) return null
  const [row] = await db
    .select({ id: guests.id })
    .from(guests)
    .where(and(eq(guests.coupleId, coupleId), sql`${guests.id}::text like ${`${code.toLowerCase()}%`}`))
    .limit(1)
  return row?.id ?? null
}
