import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { adminSessions } from '../../server/db/schema'
import { adminClient, Client, makeTestApp } from './harness'

const t = await makeTestApp()
const ID = '00000000-0000-4000-8000-000000000000'

/**
 * Every admin route except login/logout/session (SC-002). Each story that adds
 * admin routes adds them here; the last test fails when one is missing.
 */
const PROTECTED: [method: string, path: string][] = [
  ['GET', '/api/admin/couples'],
  ['POST', '/api/admin/couples'],
  ['GET', `/api/admin/couples/by-slug/x`],
  ['GET', `/api/admin/couples/${ID}`],
  ['PATCH', `/api/admin/couples/${ID}`],
  ['POST', `/api/admin/couples/${ID}/status`],
  ['POST', `/api/admin/couples/${ID}/duplicate`],
  ['DELETE', `/api/admin/couples/${ID}`],
  ['POST', `/api/admin/couples/${ID}/media`],
  ['POST', `/api/admin/media/${ID}/complete`],
  ['DELETE', `/api/admin/media/${ID}`],
  ['POST', `/api/admin/couples/${ID}/media/prune`],
  ['GET', '/api/admin/usage'],
  // US5
  ['GET', `/api/admin/couples/${ID}/responses`],
  ['GET', `/api/admin/couples/${ID}/rsvps.csv`],
  ['DELETE', `/api/admin/rsvps/${ID}`],
  ['PATCH', `/api/admin/wishes/${ID}`],
  ['DELETE', `/api/admin/wishes/${ID}`],
  // US6, US7
  ['GET', '/api/admin/export'],
  ['POST', '/api/admin/import/preflight'],
  ['PUT', `/api/admin/import/couples/${ID}`],
  ['POST', `/api/admin/import/couples/${ID}/responses`],
  ['POST', `/api/admin/import/couples/${ID}/finish`],
  // Guest list
  ['GET', `/api/admin/couples/${ID}/guests`],
  ['PUT', `/api/admin/couples/${ID}/guests`],
  ['PATCH', `/api/admin/couples/${ID}/guests/${ID}`],
]

const OPEN = new Set(['POST /api/admin/login', 'POST /api/admin/logout', 'GET /api/admin/session'])

async function expect401(c: Client, label: string) {
  for (const [method, path] of PROTECTED) {
    const res = await c.req(method, path, { body: method === 'GET' || method === 'DELETE' ? undefined : {} })
    expect(res.status, `${label}: ${method} ${path}`).toBe(401)
    expect(res.json.error.code).toBe('unauthenticated')
  }
}

describe('admin routes refuse requests without a valid session (FR-006, SC-002)', () => {
  it('without a cookie', async () => {
    await expect401(new Client(t.app), 'no cookie')
  })

  it('with a made-up cookie', async () => {
    const c = new Client(t.app)
    c.cookies.set('ws_admin', 'bukan-sesi-yang-sah')
    await expect401(c, 'fake cookie')
  })

  it('with an expired session', async () => {
    const c = await adminClient(t)
    await t.db.update(adminSessions).set({ expiresAt: new Date(Date.now() - 1000) })
    await expect401(c, 'expired')
    expect((await c.get('/api/admin/session')).json.session).toBeNull()
  })

  it('after logout, the old cookie is refused', async () => {
    const c = await adminClient(t)
    const cookie = c.cookieHeader
    await c.post('/api/admin/logout')
    const replay = new Client(t.app)
    const res = await replay.get('/api/admin/couples', { headers: { cookie } })
    expect(res.status).toBe(401)
  })

  it('a valid session from a foreign origin is refused (CSRF)', async () => {
    const c = await adminClient(t)
    const res = await c.post('/api/admin/couples', {}, { origin: 'https://evil.example' })
    expect(res.status).toBe(403)
    expect(res.json.error.code).toBe('bad_origin')
    await t.db.delete(adminSessions).where(eq(adminSessions.tokenHash, 'x'))
  })

  it('the table above lists every admin route', () => {
    const listed = new Set(
      PROTECTED.map(
        ([m, p]) =>
          `${m} ${p.replace(ID, ':id').replace(ID, ':guestId').replace('/by-slug/x', '/by-slug/:slug')}`,
      ),
    )
    const missing = t.app.routes
      .filter((r) => r.method !== 'ALL' && r.path.startsWith('/api/admin/'))
      .map((r) => `${r.method} ${r.path}`)
      .filter((key) => !OPEN.has(key) && !listed.has(key))
    expect(missing).toEqual([])
  })
})
