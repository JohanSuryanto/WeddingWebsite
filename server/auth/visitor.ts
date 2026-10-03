// "Same browser" for guests (research R8): an HttpOnly random cookie, stored only as an HMAC.
import { randomBytes } from 'node:crypto'
import type { Context } from 'hono'
import { getCookie, hmac, setCookie } from '../http/cookies'
import { clientIp } from '../http/middleware'
import type { AppEnv } from '../types'

export const VISITOR_COOKIE = 'wv'
const VISITOR_TTL_SEC = 365 * 24 * 3600
const VALID = /^[A-Za-z0-9_-]{20,64}$/

/** This browser's visitor hash; sets the cookie on first use. */
export function visitorHash(c: Context<AppEnv>): string {
  let id = getCookie(c, VISITOR_COOKIE)
  if (!id || !VALID.test(id)) {
    id = randomBytes(16).toString('base64url')
    setCookie(c, VISITOR_COOKIE, id, VISITOR_TTL_SEC)
  }
  return hmac(c.var.env.SESSION_SECRET, `visitor|${id}`)
}

/** The visitor hash if this browser already has a cookie (read-only requests). */
export function existingVisitorHash(c: Context<AppEnv>): string | null {
  const id = getCookie(c, VISITOR_COOKIE)
  return id && VALID.test(id) ? hmac(c.var.env.SESSION_SECRET, `visitor|${id}`) : null
}

export function ipHash(c: Context<AppEnv>): string {
  return hmac(c.var.env.SESSION_SECRET, `ip|${clientIp(c)}`)
}
