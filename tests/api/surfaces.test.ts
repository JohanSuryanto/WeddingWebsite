import { describe, expect, it } from 'vitest'
import { ADMIN_ORIGIN, adminClient, Client, makeTestApp, PUBLIC_ORIGIN } from './harness'
import { loadEnv } from '../../server/env'

const t = await makeTestApp()

describe('API surfaces (research R4)', () => {
  it('public deployment has no admin or cron routes', async () => {
    const c = new Client(t.withSurface('public'), PUBLIC_ORIGIN)
    for (const [method, path] of [
      ['POST', '/api/admin/login'],
      ['GET', '/api/admin/session'],
      ['GET', '/api/admin/couples'],
      ['GET', '/api/cron/cleanup'],
    ]) {
      const res = await c.req(method, path, { body: method === 'POST' ? {} : undefined })
      expect(res.status, `${method} ${path}`).toBe(404)
    }
    const pub = await c.get('/api/public/couples/tidak-ada')
    expect(pub.status).toBe(404)
    expect(pub.json.error.code).toBe('not_found')
  })

  it('admin deployment has no couple (passcode) routes', async () => {
    const c = new Client(t.withSurface('admin'), ADMIN_ORIGIN)
    expect((await c.get('/api/couple/x/send-invitation')).status).toBe(404)
    expect((await c.get('/api/public/couples/tidak-ada')).json.error.code).toBe('not_found')
  })

  it('refuses state-changing requests from other origins', async () => {
    const c = new Client(t.app)
    for (const origin of [null, 'https://evil.example', 'http://localhost.evil.example']) {
      const res = await c.post('/api/admin/login', { email: 'x', password: 'y' }, { origin })
      expect(res.status, String(origin)).toBe(403)
      expect(res.json.error.code).toBe('bad_origin')
    }
  })

  it('refuses bodies over 256 KB', async () => {
    const c = await adminClient(t)
    const res = await c.post('/api/admin/couples', { pad: 'x'.repeat(300 * 1024) })
    expect(res.status).toBe(413)
    expect(res.json.error.code).toBe('too_large')
  })
})

describe('loadEnv', () => {
  const base = { DATABASE_URL: 'pglite:memory', SESSION_SECRET: 'x'.repeat(32), PUBLIC_ORIGIN, ADMIN_ORIGIN, API_SURFACE: 'public' }
  it('refuses local media on Vercel', () => {
    expect(() => loadEnv({ ...base, VERCEL: '1' })).toThrow(/MEDIA_DRIVER/)
    expect(loadEnv(base).MEDIA_DRIVER).toBe('local')
  })
})
