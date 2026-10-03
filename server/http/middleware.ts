import type { Context, MiddlewareHandler } from 'hono'
import { bodyLimit as honoBodyLimit } from 'hono/body-limit'
import type { Env } from '../env'
import { badOrigin, tooLarge } from './errors'

export const noStore: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
}

/** JSON bodies only; files never pass through the API (research R9). */
export const bodyLimit = (maxSize = 256 * 1024): MiddlewareHandler =>
  honoBodyLimit({
    maxSize,
    onError: () => {
      throw tooLarge()
    },
  })

const LOCAL_ORIGIN = /^http:\/\/(admin\.)?localhost(:\d+)?$/

/** Origins allowed to send non-GET requests (FR-010). Local origins only when the env itself is http. */
export function isAllowedOrigin(env: Env, origin: string | undefined): boolean {
  if (!origin) return false
  if (origin === env.PUBLIC_ORIGIN || origin === env.ADMIN_ORIGIN) return true
  const local = env.PUBLIC_ORIGIN.startsWith('http://') || env.ADMIN_ORIGIN.startsWith('http://')
  return local && LOCAL_ORIGIN.test(origin)
}

/** CSRF guard: every state-changing request must come from one of our own pages. */
export const originCheck =
  (env: Env): MiddlewareHandler =>
  async (c, next) => {
    const method = c.req.method
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (!isAllowedOrigin(env, c.req.header('origin'))) throw badOrigin()
    }
    await next()
  }

/** First hop of x-forwarded-for (set by Vercel), else x-real-ip. */
export function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return c.req.header('x-real-ip') ?? '0.0.0.0'
}
