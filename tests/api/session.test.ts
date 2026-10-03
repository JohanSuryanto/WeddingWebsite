import { describe, expect, it } from 'vitest'
import { ADMIN_EMAIL, ADMIN_PASSWORD, adminClient, Client, makeTestApp } from './harness'

const t = await makeTestApp()

describe('admin session', () => {
  it('logs in, reports the session, and logs out', async () => {
    const c = new Client(t.app)
    const login = await c.post('/api/admin/login', { email: ADMIN_EMAIL.toUpperCase(), password: ADMIN_PASSWORD })
    expect(login.status).toBe(200)
    expect(login.json.session.email).toBe(ADMIN_EMAIL)
    const cookie = login.headers.getSetCookie().find((l) => l.startsWith('ws_admin='))!
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\/api/i)
    expect(cookie).toMatch(/Max-Age=604800/i)
    // http in tests, so no Secure flag
    expect(cookie).not.toMatch(/Secure/i)

    const session = await c.get('/api/admin/session')
    expect(session.json.session.email).toBe(ADMIN_EMAIL)
    const expires = Date.parse(session.json.session.expiresAt)
    expect(expires - Date.now()).toBeGreaterThan(6.9 * 24 * 3600_000)

    const stolen = c.cookieHeader
    expect((await c.post('/api/admin/logout')).status).toBe(204)
    expect((await c.get('/api/admin/session')).json.session).toBeNull()
    // The old cookie no longer works anywhere (US2-5).
    const other = new Client(t.app)
    const res = await other.get('/api/admin/session', { headers: { cookie: stolen } })
    expect(res.json.session).toBeNull()
  })

  it('rejects a wrong password with the Indonesian message', async () => {
    const c = new Client(t.app)
    const res = await c.post('/api/admin/login', { email: ADMIN_EMAIL, password: 'salah' })
    expect(res.status).toBe(401)
    expect(res.json.error).toMatchObject({ code: 'unauthenticated', message: 'Email atau kata sandi salah' })
    expect(c.cookies.has('ws_admin')).toBe(false)
  })

  it('sends no-store on API responses', async () => {
    const c = await adminClient(t)
    expect((await c.get('/api/admin/session')).headers.get('cache-control')).toBe('no-store')
  })
})
