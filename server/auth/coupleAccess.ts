// The couple's send-invitation passcode (research R7, contracts/auth.md § Couple access).
// A correct passcode sets a signed per-couple cookie; changing the passcode bumps
// passcode_version, which invalidates every cookie signed with the old one.
import type { Context, MiddlewareHandler } from 'hono'
import type { Db } from '../db/client'
import { coupleBySlug } from '../db/repos/couples'
import { fail, lockedUntil, minutesUntil, PASSCODE_RULE, recordEvent, succeed } from '../db/repos/throttles'
import type { CoupleRow } from '../db/schema'
import { clearCookie, getCookie, hmac, safeEqual, setCookie } from '../http/cookies'
import { locked, unauthenticated } from '../http/errors'
import type { AppEnv } from '../types'

export const COUPLE_ACCESS_TTL_SEC = 30 * 24 * 3600

export const coupleCookieName = (coupleId: string) => `wc_${coupleId}`
const throttleKey = (coupleId: string) => `passcode:${coupleId}`
const b64 = (s: string) => Buffer.from(s).toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString()

export function signCoupleToken(secret: string, coupleId: string, passcodeVersion: number, exp: number): string {
  const payload = `${b64(coupleId)}.${b64(String(passcodeVersion))}.${b64(String(exp))}`
  return `${payload}.${hmac(secret, `couple|${payload}`)}`
}

export function verifyCoupleToken(
  secret: string,
  token: string,
  coupleId: string,
  currentVersion: number,
  now = Date.now(),
): boolean {
  const parts = token.split('.')
  if (parts.length !== 4) return false
  const [id, version, exp, sig] = parts
  if (!safeEqual(sig, hmac(secret, `couple|${id}.${version}.${exp}`))) return false
  return unb64(id) === coupleId && Number(unb64(version)) === currentVersion && Number(unb64(exp)) > now
}

/** True when this browser has unlocked this couple's page. */
export function hasCoupleAccess(c: Context<AppEnv>, couple: CoupleRow): boolean {
  const token = getCookie(c, coupleCookieName(couple.id))
  return !!token && verifyCoupleToken(c.var.env.SESSION_SECRET, token, couple.id, couple.passcodeVersion)
}

export async function passcodePausedUntil(db: Db, coupleId: string): Promise<Date | null> {
  return lockedUntil(db, throttleKey(coupleId))
}

const lockMessage = (until: Date) => `Terlalu banyak percobaan. Coba lagi dalam ${minutesUntil(until)} menit.`

/** Checks the passcode (with the per-couple pause) and sets the access cookie. */
export async function unlockCouple(c: Context<AppEnv>, couple: CoupleRow, passcode: string): Promise<void> {
  const { db, env } = c.var
  const key = throttleKey(couple.id)
  const until = await lockedUntil(db, key)
  if (until) throw locked(lockMessage(until), until)
  if (!safeEqual(passcode, couple.passcode)) {
    const result = await fail(db, key, PASSCODE_RULE)
    if (result.locked && result.retryAt) {
      await recordEvent(db, 'passcode_lockout', couple.id)
      throw locked(lockMessage(result.retryAt), result.retryAt)
    }
    throw unauthenticated('Kode akses salah')
  }
  await succeed(db, key)
  const exp = Date.now() + COUPLE_ACCESS_TTL_SEC * 1000
  setCookie(
    c,
    coupleCookieName(couple.id),
    signCoupleToken(env.SESSION_SECRET, couple.id, couple.passcodeVersion, exp),
    COUPLE_ACCESS_TTL_SEC,
  )
}

export function lockCouple(c: Context<AppEnv>, couple: CoupleRow) {
  clearCookie(c, coupleCookieName(couple.id))
}

/** For /api/couple/:slug/*: the couple (any status), only with a valid access cookie. */
export const requireCouple: MiddlewareHandler<AppEnv> = async (c, next) => {
  const couple = await coupleBySlug(c.var.db, c.req.param('slug') ?? '')
  if (!hasCoupleAccess(c, couple)) throw unauthenticated('Masukkan kode akses')
  c.set('couple', couple)
  await next()
}
