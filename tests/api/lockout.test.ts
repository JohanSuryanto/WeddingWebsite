import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import * as password from '../../server/auth/password'
import { securityEvents, throttles } from '../../server/db/schema'
import { ADMIN_EMAIL, ADMIN_PASSWORD, Client, makeTestApp } from './harness'

const t = await makeTestApp()
const login = (c: Client, pw: string) => c.post('/api/admin/login', { email: ADMIN_EMAIL, password: pw })

describe('admin login lockout (FR-009)', () => {
  it('locks after 5 failures for 60 s, server-side, then recovers', async () => {
    const a = new Client(t.app)
    for (let i = 0; i < 4; i++) expect((await login(a, `salah-${i}`)).status).toBe(401)
    const fifth = await login(a, 'salah-4')
    expect(fifth.status).toBe(423)
    expect(fifth.json.error.code).toBe('locked')
    expect(fifth.json.error.message).toMatch(/^Terlalu banyak percobaan\. Coba lagi dalam \d+ detik\.$/)
    const retryIn = Date.parse(fifth.json.error.retryAt) - Date.now()
    expect(retryIn).toBeGreaterThan(55_000)
    expect(retryIn).toBeLessThanOrEqual(60_000)

    // Another browser with the right password is still locked out, and the
    // password isn't even checked while locked.
    const spy = vi.spyOn(password, 'verifyPassword')
    const b = new Client(t.app)
    const locked = await login(b, ADMIN_PASSWORD)
    expect(locked.status).toBe(423)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()

    const events = await t.db.select().from(securityEvents).where(eq(securityEvents.kind, 'login_lockout'))
    expect(events).toHaveLength(1)

    // Time passes (the lock ends) → the right password works and clears the counter.
    await t.db.update(throttles).set({ lockedUntil: new Date(Date.now() - 1000) })
    expect((await login(b, ADMIN_PASSWORD)).status).toBe(200)
    expect(await t.db.select().from(throttles)).toHaveLength(0)
  })

  it('a success resets the failure count', async () => {
    const c = new Client(t.app)
    for (let i = 0; i < 4; i++) await login(c, 'salah')
    expect((await login(c, ADMIN_PASSWORD)).status).toBe(200)
    for (let i = 0; i < 4; i++) expect((await login(c, 'salah')).status).toBe(401)
  })
})
