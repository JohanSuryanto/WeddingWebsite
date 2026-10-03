// GET /api/cron/cleanup — daily, from Vercel Cron on the admin project (research R9).
import { lt } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteMediaRows, flushDeletions, stalePending } from '../db/repos/media'
import { adminSessions, rateLimits, securityEvents } from '../db/schema'
import { safeEqual } from '../http/cookies'
import { unauthenticated } from '../http/errors'
import type { AppEnv } from '../types'

export function cronRoutes() {
  return new Hono<AppEnv>().get('/cleanup', async (c) => {
    const secret = c.var.env.CRON_SECRET
    const auth = c.req.header('authorization') ?? ''
    if (!secret || !safeEqual(auth, `Bearer ${secret}`)) throw unauthenticated()

    const { db, media } = c.var
    const now = Date.now()
    const retried = await flushDeletions(db, media)
    const pending = await deleteMediaRows(db, media, await stalePending(db, 24))
    const sessions = await db
      .delete(adminSessions)
      .where(lt(adminSessions.expiresAt, new Date(now)))
      .returning({ k: adminSessions.tokenHash })
    const limits = await db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(now - 3_600_000)))
      .returning({ k: rateLimits.bucket })
    const events = await db
      .delete(securityEvents)
      .where(lt(securityEvents.createdAt, new Date(now - 30 * 24 * 3_600_000)))
      .returning({ k: securityEvents.id })

    return c.json({
      deleted: {
        mediaRetried: retried,
        pendingMedia: pending,
        sessions: sessions.length,
        rateLimits: limits.length,
        securityEvents: events.length,
      },
    })
  })
}
