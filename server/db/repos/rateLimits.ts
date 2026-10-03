// Fixed-window counters for guest submissions (FR-020, research R8).
import { sql } from 'drizzle-orm'
import { rateLimited } from '../../http/errors'
import type { Db } from '../client'
import { rateLimits } from '../schema'

export const RESPONSE_WINDOW_MS = 10 * 60_000
export const PER_BROWSER = 5
export const PER_IP = 30

/** Counts one hit; throws 429 once `limit` is passed within the window. */
export async function hit(db: Db, bucket: string, limit: number, windowMs = RESPONSE_WINDOW_MS, now = new Date()) {
  const cutoff = new Date(now.getTime() - windowMs)
  const [row] = await db
    .insert(rateLimits)
    .values({ bucket, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.bucket,
      set: {
        count: sql`case when ${rateLimits.windowStart} < ${cutoff} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < ${cutoff} then ${now} else ${rateLimits.windowStart} end`,
      },
    })
    .returning()
  if (row.count > limit) throw rateLimited(new Date(row.windowStart.getTime() + windowMs))
}
