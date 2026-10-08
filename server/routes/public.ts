// /api/public/* — no login (contracts/api.md § Public).
import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { PASSCODE_PATTERN } from '../../src/data/passcode'
import { rsvpClosed } from '../../src/lib/rsvpDeadline'
import { hasCoupleAccess, passcodePausedUntil, unlockCouple } from '../auth/coupleAccess'
import { existingVisitorHash, ipHash, visitorHash } from '../auth/visitor'
import { activeCoupleBySlug, coupleBySlug, coupleNames } from '../db/repos/couples'
import { guestIdForCode } from '../db/repos/guests'
import { readyUrls } from '../db/repos/media'
import { PER_BROWSER, PER_IP, hit } from '../db/repos/rateLimits'
import { addWish, listWishes, myRsvp, toWireWish, upsertRsvp } from '../db/repos/responses'
import { couples } from '../db/schema'
import { unauthenticated, validation } from '../http/errors'
import { readJson } from '../http/validate'
import { toPublicCouple } from '../lib/publicContent'
import type { AppEnv } from '../types'

const unlockBody = z.object({ passcode: z.string().max(10) })
const attendance = z.enum(['hadir', 'tidak_hadir'])
const rsvpBody = z.object({
  name: z.string().max(200),
  attendance: z.union([attendance, z.literal('')]),
  guestCount: z.number(),
  /** `?g=` from a personal link; unknown or malformed codes are ignored. */
  guestCode: z.string().max(20).optional(),
})
const wishBody = z.object({
  name: z.string().max(200),
  message: z.string().max(2000),
  attendance: attendance.optional(),
  guestCode: z.string().max(20).optional(),
})

export function publicRoutes() {
  return (
    new Hono<AppEnv>()
      .get('/couples/:slug', async (c) => {
        const row = await activeCoupleBySlug(c.var.db, c.req.param('slug'))
        return c.json({ couple: toPublicCouple(row, await readyUrls(c.var.db, row.id)) })
      })

      // Sent by the invitation page itself, not by previews (they load it in a frame).
      // ponytail: once per browser tab, not unique guests; per-visitor dedupe if it matters.
      .post('/couples/:slug/view', async (c) => {
        const row = await activeCoupleBySlug(c.var.db, c.req.param('slug'))
        await c.var.db.update(couples).set({ views: sql`${couples.views} + 1` }).where(eq(couples.id, row.id))
        return c.body(null, 204)
      })

      // Send-invitation passcode screen (US4): names only, drafts included.
      .get('/couples/:slug/gate', async (c) => {
        const row = await coupleBySlug(c.var.db, c.req.param('slug'))
        const paused = await passcodePausedUntil(c.var.db, row.id)
        return c.json({
          names: coupleNames(row.content),
          status: row.status,
          unlocked: hasCoupleAccess(c, row),
          retryAt: paused?.toISOString() ?? null,
        })
      })

      // Guest responses (US5): published couples only, rate-limited (FR-016, FR-020).
      .get('/couples/:slug/wishes', async (c) => {
        const row = await activeCoupleBySlug(c.var.db, c.req.param('slug'))
        return c.json(await listWishes(c.var.db, row.id, { cursor: c.req.query('cursor') }))
      })

      .post('/couples/:slug/wishes', async (c) => {
        const body = await readJson(c, wishBody)
        const row = await activeCoupleBySlug(c.var.db, c.req.param('slug'))
        const visitor = visitorHash(c)
        await hit(c.var.db, `wish:${row.id}:${visitor}`, PER_BROWSER)
        await hit(c.var.db, `ip:${row.id}:${ipHash(c)}`, PER_IP)
        const guestId = await guestIdForCode(c.var.db, row.id, body.guestCode)
        const wish = await addWish(c.var.db, row.id, visitor, body, guestId)
        return c.json({ wish: toWireWish(wish) }, 201)
      })

      .post('/couples/:slug/rsvp', async (c) => {
        const body = await readJson(c, rsvpBody)
        const row = await activeCoupleBySlug(c.var.db, c.req.param('slug'))
        if (rsvpClosed(row.content.rsvpDeadline)) {
          const message = 'Konfirmasi kehadiran sudah ditutup'
          throw validation(message, { fields: { form: message } })
        }
        const visitor = visitorHash(c)
        await hit(c.var.db, `rsvp:${row.id}:${visitor}`, PER_BROWSER)
        await hit(c.var.db, `ip:${row.id}:${ipHash(c)}`, PER_IP)
        const guestId = await guestIdForCode(c.var.db, row.id, body.guestCode)
        const { rsvp, replaced } = await upsertRsvp(c.var.db, row.id, visitor, body, guestId)
        return c.json({ rsvp, replaced })
      })

      .get('/couples/:slug/rsvp/mine', async (c) => {
        const row = await activeCoupleBySlug(c.var.db, c.req.param('slug'))
        const visitor = existingVisitorHash(c)
        return c.json({ rsvp: visitor ? await myRsvp(c.var.db, row.id, visitor) : null })
      })

      .post('/couples/:slug/unlock', async (c) => {
        const { passcode } = await readJson(c, unlockBody)
        const row = await coupleBySlug(c.var.db, c.req.param('slug'))
        if (!PASSCODE_PATTERN.test(passcode)) throw unauthenticated('Kode akses salah')
        await unlockCouple(c, row, passcode)
        return c.body(null, 204)
      })
  )
}
