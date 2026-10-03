// Admin sessions (research R6, contracts/auth.md).
import { createHash, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import type { Db } from '../db/client'
import { fail, LOGIN_RULE, lockedUntil, recordEvent, secondsUntil, succeed } from '../db/repos/throttles'
import { adminSessions } from '../db/schema'
import type { Env } from '../env'
import { clearCookie, getCookie, setCookie } from '../http/cookies'
import { locked, unauthenticated } from '../http/errors'
import type { AppEnv } from '../types'
import { dummyHash, verifyPassword } from './password'

export const ADMIN_COOKIE = 'ws_admin'
export const SESSION_TTL_SEC = 7 * 24 * 3600
const THROTTLE_KEY = 'login:admin'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export interface AdminSession {
  email: string
  expiresAt: string
}

const lockMessage = (until: Date) => `Terlalu banyak percobaan. Coba lagi dalam ${secondsUntil(until)} detik.`

/** Checks credentials (with lockout) and starts a session; sets the cookie. */
export async function login(c: Context, db: Db, env: Env, email: string, password: string): Promise<AdminSession> {
  const until = await lockedUntil(db, THROTTLE_KEY)
  if (until) throw locked(lockMessage(until), until)

  const emailOk = email.trim().toLowerCase() === (env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  // Always run scrypt, so a wrong email takes as long as a wrong password.
  const passwordOk = await verifyPassword(password, emailOk ? env.ADMIN_PASSWORD_HASH! : await dummyHash())
  if (!emailOk || !passwordOk) {
    const result = await fail(db, THROTTLE_KEY, LOGIN_RULE)
    if (result.locked && result.retryAt) {
      await recordEvent(db, 'login_lockout', null)
      throw locked(lockMessage(result.retryAt), result.retryAt)
    }
    throw unauthenticated('Email atau kata sandi salah')
  }
  await succeed(db, THROTTLE_KEY)

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000)
  await db.insert(adminSessions).values({
    tokenHash: sha256(token),
    expiresAt,
    userAgent: c.req.header('user-agent')?.slice(0, 300) ?? null,
  })
  setCookie(c, ADMIN_COOKIE, token, SESSION_TTL_SEC)
  return { email: env.ADMIN_EMAIL!, expiresAt: expiresAt.toISOString() }
}

/** The current session, or null when the cookie is missing, unknown or expired. */
export async function currentSession(c: Context, db: Db, env: Env): Promise<AdminSession | null> {
  const token = getCookie(c, ADMIN_COOKIE)
  if (!token) return null
  const [row] = await db.select().from(adminSessions).where(eq(adminSessions.tokenHash, sha256(token)))
  if (!row || row.expiresAt <= new Date()) return null
  return { email: env.ADMIN_EMAIL!, expiresAt: row.expiresAt.toISOString() }
}

export async function logout(c: Context, db: Db): Promise<void> {
  const token = getCookie(c, ADMIN_COOKIE)
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha256(token)))
  clearCookie(c, ADMIN_COOKIE)
}

/** 401 unless a valid admin session cookie is present (FR-006). */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await currentSession(c, c.var.db, c.var.env)
  if (!session) throw unauthenticated('Sesi berakhir, silakan masuk lagi')
  c.set('adminEmail', session.email)
  await next()
}
