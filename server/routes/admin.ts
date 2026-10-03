// /api/admin/* (contracts/api.md § Admin). Everything except the session routes
// is behind requireAdmin.
import { Hono } from 'hono'
import { z } from 'zod'
import { currentSession, login, logout, requireAdmin } from '../auth/admin'
import { readJson } from '../http/validate'
import type { AppEnv } from '../types'

const loginBody = z.object({ email: z.string().max(200), password: z.string().max(500) })

/** login, logout, session: reachable without a session. */
function sessionRoutes() {
  return new Hono<AppEnv>()
    .post('/login', async (c) => {
      const { email, password } = await readJson(c, loginBody)
      const session = await login(c, c.var.db, c.var.env, email, password)
      return c.json({ session })
    })
    .post('/logout', async (c) => {
      await logout(c, c.var.db)
      return c.body(null, 204)
    })
    .get('/session', async (c) => c.json({ session: await currentSession(c, c.var.db, c.var.env) }))
}

/**
 * Admin API. `protectedRoutes` are mounted behind requireAdmin; every route
 * added there is covered by tests/api/admin-protection.test.ts.
 */
export function adminRoutes(protectedRoutes: Hono<AppEnv>[]) {
  const guarded = new Hono<AppEnv>().use('*', requireAdmin)
  for (const r of protectedRoutes) guarded.route('/', r)
  return new Hono<AppEnv>().route('/', sessionRoutes()).route('/', guarded)
}
