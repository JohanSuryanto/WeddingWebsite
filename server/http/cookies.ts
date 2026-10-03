import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Context } from 'hono'
import { deleteCookie, getCookie as honoGetCookie, setCookie as honoSetCookie } from 'hono/cookie'

/** Secure only over https, so local http dev and tests still get the cookie. */
function isHttps(c: Context) {
  return new URL(c.req.url).protocol === 'https:'
}

/** HttpOnly; SameSite=Lax; Path=/api (contracts/api.md § Cookies). */
export function setCookie(c: Context, name: string, value: string, maxAgeSec: number) {
  honoSetCookie(c, name, value, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/api',
    secure: isHttps(c),
    maxAge: maxAgeSec,
  })
}

export function clearCookie(c: Context, name: string) {
  deleteCookie(c, name, { path: '/api', secure: isHttps(c) })
}

export function getCookie(c: Context, name: string): string | undefined {
  return honoGetCookie(c, name)
}

export function hmac(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

/** Constant-time string comparison (false for different lengths). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
