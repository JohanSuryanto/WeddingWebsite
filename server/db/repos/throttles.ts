// Lockouts after repeated failures, stored in Postgres so refreshing or switching
// browsers can't get around them (FR-009, FR-010d).
import { and, eq, gte, sql } from 'drizzle-orm'
import type { Db } from '../client'
import { securityEvents, throttles } from '../schema'

export type ThrottleRule = { max: number; lockMs: number }

export const LOGIN_RULE: ThrottleRule = { max: 5, lockMs: 60_000 }
export const PASSCODE_RULE: ThrottleRule = { max: 5, lockMs: 15 * 60_000 }

/** The lock end when `key` is currently locked, else null. */
export async function lockedUntil(db: Db, key: string, now = new Date()): Promise<Date | null> {
  const [row] = await db.select().from(throttles).where(eq(throttles.key, key))
  return row?.lockedUntil && row.lockedUntil > now ? row.lockedUntil : null
}

/**
 * Records one failure. On reaching `rule.max`, locks the key for `rule.lockMs`
 * and resets the counter.
 */
export async function fail(
  db: Db,
  key: string,
  rule: ThrottleRule,
  now = new Date(),
): Promise<{ locked: boolean; retryAt: Date | null }> {
  const [row] = await db
    .insert(throttles)
    .values({ key, failures: 1 })
    .onConflictDoUpdate({ target: throttles.key, set: { failures: sql`${throttles.failures} + 1` } })
    .returning()
  if (row.failures < rule.max) return { locked: false, retryAt: null }
  const retryAt = new Date(now.getTime() + rule.lockMs)
  await db.update(throttles).set({ failures: 0, lockedUntil: retryAt }).where(eq(throttles.key, key))
  return { locked: true, retryAt }
}

export async function succeed(db: Db, key: string): Promise<void> {
  await db.delete(throttles).where(eq(throttles.key, key))
}

export async function recordEvent(
  db: Db,
  kind: 'passcode_lockout' | 'login_lockout',
  coupleId: string | null,
): Promise<void> {
  await db.insert(securityEvents).values({ kind, coupleId })
}

/** Passcode lockouts for one couple in the last `sinceHours` hours. */
export async function lockoutCount(db: Db, coupleId: string, sinceHours = 24, now = new Date()) {
  const since = new Date(now.getTime() - sinceHours * 3_600_000)
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.coupleId, coupleId),
        eq(securityEvents.kind, 'passcode_lockout'),
        gte(securityEvents.createdAt, since),
      ),
    )
  return Number(row?.n ?? 0)
}

export const secondsUntil = (d: Date, now = new Date()) => Math.max(1, Math.ceil((d.getTime() - now.getTime()) / 1000))
export const minutesUntil = (d: Date, now = new Date()) =>
  Math.max(1, Math.ceil((d.getTime() - now.getTime()) / 60_000))
