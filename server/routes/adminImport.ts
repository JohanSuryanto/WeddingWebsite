// Backup export and browser-driven restore (contracts/backup-format.md, research R12).
// No request ever carries file bytes: the browser uploads media through the normal
// ticket flow, using the media ids from the backup.
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { PASSCODE_PATTERN, randomPasscode } from '../../src/data/passcode'
import { firstContentProblem, storedContentSchema, themeIdSchema } from '../../src/data/schema'
import { validateSlug } from '../../src/data/slug'
import { coupleNotFound, deleteCouple, findRowBySlug, getCoupleRow, toCouple } from '../db/repos/couples'
import { assertReferencesReady, deleteMediaRows, toInfo } from '../db/repos/media'
import { couples, guests, media, rsvps, wishes } from '../db/schema'
import type { Db } from '../db/client'
import { slugTaken, validation } from '../http/errors'
import { fieldErrors, readJson } from '../http/validate'
import { keyFor } from '../media/provider'
import type { AppEnv } from '../types'

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i, 'id tidak valid')
const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'tanggal tidak valid')
const attendance = z.enum(['hadir', 'tidak_hadir'])

const preflightBody = z.object({ couples: z.array(z.object({ id: z.string(), slug: z.string() })).max(500) })

const mediaMeta = z.object({
  id: uuid,
  kind: z.enum(['image', 'audio']),
  mime: z.string().max(100),
  size: z.number().int().min(0),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

const importBody = z.object({
  couple: z.object({
    slug: z.string(),
    status: z.enum(['draft', 'active']),
    defaultTheme: themeIdSchema,
    content: z.unknown(),
    passcode: z.string().regex(PASSCODE_PATTERN).optional(),
    createdAt: iso.optional(),
  }),
  media: z.array(mediaMeta).max(200),
  mode: z.enum(['create', 'replace']),
})

const responsesBody = z.object({
  rsvps: z
    .array(
      z.object({
        id: uuid,
        name: z.string().min(1).max(60),
        attendance,
        guestCount: z.number().int().min(0).max(5),
        guestId: uuid.nullable().optional(),
        submittedAt: iso,
        updatedAt: iso,
      }),
    )
    .max(5000),
  wishes: z
    .array(
      z.object({
        id: uuid,
        name: z.string().min(1).max(60),
        message: z.string().min(1).max(500),
        attendance: attendance.nullable().optional(),
        hidden: z.boolean().optional(),
        guestId: uuid.nullable().optional(),
        createdAt: iso,
      }),
    )
    .max(5000),
  /** Added after v2 shipped; older files have none. */
  guests: z
    .array(
      z.object({
        id: uuid,
        name: z.string().min(1).max(200),
        position: z.number().int().min(0),
        sentAt: iso.nullable(),
      }),
    )
    .max(1000)
    .optional(),
})

const finishBody = z.object({ status: z.enum(['draft', 'active']) })

/** Everything except media bytes; the browser adds those from the media URLs. */
async function exportDocument(db: Db) {
  const coupleRows = await db.select().from(couples).orderBy(couples.createdAt)
  const mediaRows = await db.select().from(media).where(eq(media.status, 'ready'))
  const rsvpRows = await db.select().from(rsvps)
  const wishRows = await db.select().from(wishes)
  const guestRows = await db.select().from(guests).orderBy(guests.coupleId, guests.position)
  return {
    format: 'wedding-admin-backup' as const,
    formatVersion: 2 as const,
    createdAt: new Date().toISOString(),
    app: { build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
    couples: coupleRows.map(toCouple),
    media: mediaRows.map((m) => ({ ...toInfo(m), coupleId: m.coupleId })),
    rsvps: rsvpRows.map((r) => ({
      id: r.id,
      coupleId: r.coupleId,
      name: r.name,
      attendance: r.attendance,
      guestCount: r.guestCount,
      guestId: r.guestId,
      submittedAt: r.submittedAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    wishes: wishRows.map((w) => ({
      id: w.id,
      coupleId: w.coupleId,
      name: w.name,
      message: w.message,
      attendance: w.attendance,
      hidden: w.hidden,
      guestId: w.guestId,
      createdAt: w.createdAt.toISOString(),
    })),
    guests: guestRows.map((g) => ({
      id: g.id,
      coupleId: g.coupleId,
      name: g.name,
      position: g.position,
      sentAt: g.sentAt?.toISOString() ?? null,
    })),
  }
}

export function adminImportRoutes() {
  return (
    new Hono<AppEnv>()
      .get('/export', async (c) => c.json(await exportDocument(c.var.db)))

      .post('/import/preflight', async (c) => {
        const { couples: list } = await readJson(c, preflightBody)
        const ids = list.map((x) => x.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id))
        const slugs = list.map((x) => x.slug)
        const byId = ids.length
          ? await c.var.db
              .select({ id: couples.id, restorePending: couples.restorePending })
              .from(couples)
              .where(inArray(couples.id, ids))
          : []
        const bySlug = slugs.length
          ? await c.var.db.select({ slug: couples.slug }).from(couples).where(inArray(couples.slug, slugs))
          : []
        return c.json({
          existingIds: byId.map((r) => r.id),
          existingSlugs: bySlug.map((r) => r.slug),
          // Half-finished restores from an earlier run: continued by default.
          pendingIds: byId.filter((r) => r.restorePending).map((r) => r.id),
        })
      })

      .put('/import/couples/:id', async (c) => {
        const id = c.req.param('id')
        if (!/^[0-9a-f-]{36}$/i.test(id)) throw validation('id tidak valid')
        const { couple, media: metas, mode } = await readJson(c, importBody)
        const { db, env } = c.var
        const slugProblem = validateSlug(couple.slug)
        if (slugProblem) throw validation(slugProblem, { fields: { slug: slugProblem } })
        const content = storedContentSchema.safeParse(couple.content)
        if (!content.success) {
          throw validation('Struktur data undangan tidak valid', { fields: fieldErrors(content.error) })
        }

        // Another couple using this address: "Ganti" removes it; otherwise refuse.
        const holder = await findRowBySlug(db, couple.slug)
        if (holder && holder.id !== id) {
          if (mode !== 'replace') throw slugTaken()
          await deleteCouple(db, c.var.media, env.MEDIA_ROOT, holder.id)
        }

        const existingMedia = metas.length
          ? await db.select().from(media).where(inArray(media.id, metas.map((m) => m.id)))
          : []
        const clash = existingMedia.find((m) => m.coupleId !== id)
        if (clash) throw validation('Media di file cadangan sudah dipakai pasangan lain')

        await db.transaction(async (tx) => {
          const t = tx as unknown as Db
          const values = {
            slug: couple.slug,
            // Hidden while restoring; /finish sets the backed-up status (FR-021).
            status: 'draft' as const,
            defaultTheme: couple.defaultTheme,
            content: couple.content as typeof couples.$inferInsert.content,
            version: 1,
            restorePending: true,
            updatedAt: new Date(),
          }
          await t
            .insert(couples)
            .values({
              id,
              ...values,
              passcode: couple.passcode ?? randomPasscode(),
              createdAt: couple.createdAt ? new Date(couple.createdAt) : new Date(),
            })
            .onConflictDoUpdate({
              target: couples.id,
              set: {
                ...values,
                ...(couple.passcode
                  ? { passcode: couple.passcode, passcodeVersion: sql`${couples.passcodeVersion} + 1` }
                  : {}),
              },
            })
          const known = new Set(existingMedia.map((m) => m.id))
          const fresh = metas.filter((m) => !known.has(m.id))
          if (fresh.length) {
            await t.insert(media).values(
              fresh.map((m) => ({
                ...m,
                coupleId: id,
                providerKey: keyFor(env.MEDIA_ROOT, id, m.id),
                status: 'pending' as const,
              })),
            )
          }
        })

        // Replacing: files of this couple that the backup doesn't have go away.
        const keep = metas.map((m) => m.id)
        const stale = await db
          .select()
          .from(media)
          .where(and(eq(media.coupleId, id), keep.length ? notInArray(media.id, keep) : undefined))
        await deleteMediaRows(db, c.var.media, stale)

        const pending = await db
          .select({ id: media.id })
          .from(media)
          .where(and(eq(media.coupleId, id), eq(media.status, 'pending')))
        return c.json({ couple: toCouple(await getCoupleRow(db, id)), pendingMediaIds: pending.map((m) => m.id) })
      })

      .post('/import/couples/:id/responses', async (c) => {
        const couple = await getCoupleRow(c.var.db, c.req.param('id'))
        const body = await readJson(c, responsesBody)
        let inserted = 0
        // Guests first: restored RSVPs and wishes may point at them.
        const guestList = body.guests ?? []
        if (guestList.length) {
          const rows = await c.var.db
            .insert(guests)
            .values(
              guestList.map((g) => ({
                ...g,
                coupleId: couple.id,
                sentAt: g.sentAt ? new Date(g.sentAt) : null,
              })),
            )
            .onConflictDoNothing()
            .returning({ id: guests.id })
          inserted += rows.length
        }
        // A link to a guest this couple doesn't have is dropped, not an error.
        const known = new Set(
          (await c.var.db.select({ id: guests.id }).from(guests).where(eq(guests.coupleId, couple.id))).map((g) => g.id),
        )
        const guestId = (id: string | null | undefined) => (id && known.has(id) ? id : null)
        if (body.rsvps.length) {
          const rows = await c.var.db
            .insert(rsvps)
            .values(
              body.rsvps.map((r) => ({
                ...r,
                coupleId: couple.id,
                guestId: guestId(r.guestId),
                // Visitor hashes aren't in backups; restored answers can't be replaced by "same browser".
                visitorHash: `restored:${r.id}`,
                submittedAt: new Date(r.submittedAt),
                updatedAt: new Date(r.updatedAt),
              })),
            )
            .onConflictDoNothing()
            .returning({ id: rsvps.id })
          inserted += rows.length
        }
        if (body.wishes.length) {
          const rows = await c.var.db
            .insert(wishes)
            .values(
              body.wishes.map((w) => ({
                ...w,
                coupleId: couple.id,
                guestId: guestId(w.guestId),
                attendance: w.attendance ?? null,
                hidden: w.hidden ?? false,
                createdAt: new Date(w.createdAt),
              })),
            )
            .onConflictDoNothing()
            .returning({ id: wishes.id })
          inserted += rows.length
        }
        const total = body.rsvps.length + body.wishes.length + guestList.length
        return c.json({ inserted, skipped: total - inserted })
      })

      .post('/import/couples/:id/finish', async (c) => {
        const { status } = await readJson(c, finishBody)
        const { db } = c.var
        const couple = await getCoupleRow(db, c.req.param('id'))
        await assertReferencesReady(db, couple.id, couple.content)
        // An unfinished draft can't go live, whatever the backup said.
        const next = status === 'active' && !firstContentProblem(couple.content) ? 'active' : 'draft'
        const [row] = await db
          .update(couples)
          .set({ restorePending: false, status: next, updatedAt: new Date() })
          .where(eq(couples.id, couple.id))
          .returning()
        if (!row) throw coupleNotFound()
        return c.json({ couple: toCouple(row) })
      })
  )
}

