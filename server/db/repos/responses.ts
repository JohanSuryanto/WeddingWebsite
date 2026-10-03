// Guest RSVPs and wishes (data-model.md § rsvps, wishes).
import { randomUUID } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Attendance } from '../../../src/content/types'
import type { Page, RsvpRecord, RsvpTotals, WishRecord } from '../../../src/data/types'
import { hasErrors, validateRsvp, validateWish } from '../../../src/lib/validation'
import type { RsvpInput, WishInput } from '../../../src/services/types'
import { invalidBody, notFound, type FieldErrors } from '../../http/errors'
import type { Db } from '../client'
import { rsvps, wishes, type RsvpRow, type WishRow } from '../schema'

export const WISHES_PAGE = 20

/** A wish on the wire: like the frontend `Wish`, with an ISO date. */
export type WireWish = Omit<WishRecord, 'createdAt' | 'hidden'> & { createdAt: string; hidden?: boolean }

function onlyErrors(e: Record<string, string | undefined>): FieldErrors {
  return Object.fromEntries(Object.entries(e).filter((x): x is [string, string] => !!x[1]))
}

export function toRsvpRecord(r: RsvpRow): RsvpRecord {
  return {
    id: r.id,
    name: r.name,
    attendance: r.attendance,
    guestCount: r.guestCount,
    submittedAt: r.submittedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

/** Guests see no `hidden`; the admin does. */
export function toWireWish(w: WishRow, withHidden = false): WireWish {
  return {
    id: w.id,
    name: w.name,
    message: w.message,
    ...(w.attendance ? { attendance: w.attendance } : {}),
    createdAt: w.createdAt.toISOString(),
    ...(withHidden ? { hidden: w.hidden } : {}),
  }
}

export async function upsertRsvp(
  db: Db,
  coupleId: string,
  visitorHash: string,
  input: RsvpInput,
): Promise<{ rsvp: RsvpRecord; replaced: boolean }> {
  const errors = validateRsvp(input)
  if (hasErrors(errors)) throw invalidBody(onlyErrors(errors))
  const attendance = input.attendance as Attendance
  const now = new Date()
  const [row] = await db
    .insert(rsvps)
    .values({
      id: randomUUID(),
      coupleId,
      visitorHash,
      name: input.name.trim(),
      attendance,
      guestCount: attendance === 'hadir' ? input.guestCount : 0,
      submittedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [rsvps.coupleId, rsvps.visitorHash],
      set: {
        name: input.name.trim(),
        attendance,
        guestCount: attendance === 'hadir' ? input.guestCount : 0,
        updatedAt: now,
      },
    })
    .returning()
  return { rsvp: toRsvpRecord(row), replaced: row.submittedAt.getTime() !== now.getTime() }
}

export async function myRsvp(db: Db, coupleId: string, visitorHash: string): Promise<RsvpRecord | null> {
  const [row] = await db
    .select()
    .from(rsvps)
    .where(and(eq(rsvps.coupleId, coupleId), eq(rsvps.visitorHash, visitorHash)))
  return row ? toRsvpRecord(row) : null
}

export async function addWish(db: Db, coupleId: string, visitorHash: string, input: WishInput): Promise<WishRow> {
  const errors = validateWish(input)
  if (hasErrors(errors)) throw invalidBody(onlyErrors(errors))
  const [row] = await db
    .insert(wishes)
    .values({
      id: randomUUID(),
      coupleId,
      visitorHash,
      name: input.name.trim(),
      message: input.message.trim(),
      attendance: input.attendance ?? null,
    })
    .returning()
  return row
}

const encodeCursor = (w: WishRow) => Buffer.from(`${w.createdAt.toISOString()}|${w.id}`).toString('base64url')

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|')
  const createdAt = new Date(iso)
  return id && !Number.isNaN(createdAt.getTime()) && /^[0-9a-f-]{36}$/i.test(id) ? { createdAt, id } : null
}

/** Newest first, 20 per page (FR-018). */
export async function listWishes(
  db: Db,
  coupleId: string,
  opts: { includeHidden?: boolean; cursor?: string | null } = {},
): Promise<Page<WireWish>> {
  const after = opts.cursor ? decodeCursor(opts.cursor) : null
  const rows = await db
    .select()
    .from(wishes)
    .where(
      and(
        eq(wishes.coupleId, coupleId),
        opts.includeHidden ? undefined : eq(wishes.hidden, false),
        after ? sql`(${wishes.createdAt}, ${wishes.id}) < (${after.createdAt}, ${after.id}::uuid)` : undefined,
      ),
    )
    .orderBy(desc(wishes.createdAt), desc(wishes.id))
    .limit(WISHES_PAGE + 1)
  const page = rows.slice(0, WISHES_PAGE)
  return {
    items: page.map((w) => toWireWish(w, opts.includeHidden)),
    nextCursor: rows.length > WISHES_PAGE ? encodeCursor(page[page.length - 1]) : null,
  }
}

export async function listRsvps(db: Db, coupleId: string): Promise<RsvpRow[]> {
  return db.select().from(rsvps).where(eq(rsvps.coupleId, coupleId)).orderBy(desc(rsvps.updatedAt))
}

export function totalsOf(rows: RsvpRow[]): RsvpTotals {
  return {
    attending: rows.filter((r) => r.attendance === 'hadir').length,
    notAttending: rows.filter((r) => r.attendance === 'tidak_hadir').length,
    people: rows.reduce((n, r) => n + (r.attendance === 'hadir' ? r.guestCount : 0), 0),
  }
}

export async function responsesFor(db: Db, coupleId: string, opts: { includeHidden: boolean; wishesCursor?: string | null }) {
  const rows = await listRsvps(db, coupleId)
  return {
    totals: totalsOf(rows),
    rsvps: rows.map(toRsvpRecord),
    wishes: await listWishes(db, coupleId, { includeHidden: opts.includeHidden, cursor: opts.wishesCursor }),
  }
}

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id)

export async function setWishHidden(db: Db, id: string, hidden: boolean): Promise<WishRow> {
  if (!isUuid(id)) throw notFound('Ucapan tidak ditemukan')
  const [row] = await db.update(wishes).set({ hidden }).where(eq(wishes.id, id)).returning()
  if (!row) throw notFound('Ucapan tidak ditemukan')
  return row
}

export async function deleteWish(db: Db, id: string): Promise<void> {
  if (!isUuid(id)) throw notFound('Ucapan tidak ditemukan')
  const deleted = await db.delete(wishes).where(eq(wishes.id, id)).returning({ id: wishes.id })
  if (!deleted.length) throw notFound('Ucapan tidak ditemukan')
}

export async function deleteRsvp(db: Db, id: string): Promise<void> {
  if (!isUuid(id)) throw notFound('Respons tidak ditemukan')
  const deleted = await db.delete(rsvps).where(eq(rsvps.id, id)).returning({ id: rsvps.id })
  if (!deleted.length) throw notFound('Respons tidak ditemukan')
}
