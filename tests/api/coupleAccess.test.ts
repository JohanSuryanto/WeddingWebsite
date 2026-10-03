import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import { emptyContent } from '../../src/data/emptyContent'
import { securityEvents, throttles } from '../../server/db/schema'
import { adminClient, Client, makeTestApp, PUBLIC_ORIGIN } from './harness'

const t = await makeTestApp()
const admin = await adminClient(t)

let n = 0
async function newCouple(content = anisaRaka, passcode = '4821') {
  const res = await admin.post('/api/admin/couples', {
    slug: `pasangan-${++n}`,
    defaultTheme: 'romantic-floral',
    content,
    passcode,
  })
  return res.json.couple as { id: string; slug: string; version: number; passcode: string }
}

const guest = () => new Client(t.app, PUBLIC_ORIGIN)
const unlock = (c: Client, slug: string, passcode: string) => c.post(`/api/public/couples/${slug}/unlock`, { passcode })

describe('send-invitation passcode (US4)', () => {
  it('the gate shows only names and status, also for drafts', async () => {
    const couple = await newCouple(emptyContent('Sari', 'Budi'))
    const res = await guest().get(`/api/public/couples/${couple.slug}/gate`)
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ names: 'Sari & Budi', status: 'draft', unlocked: false, retryAt: null })
    expect((await guest().get('/api/public/couples/tidak-ada/gate')).status).toBe(404)
  })

  it('unlocks with the right code for 30 days; the page then works, drafts too', async () => {
    const couple = await newCouple(emptyContent('Sari', 'Budi'))
    const c = guest()
    expect((await c.get(`/api/couple/${couple.slug}/send-invitation`)).status).toBe(401)

    const wrong = await unlock(c, couple.slug, '1111')
    expect(wrong.status).toBe(401)
    expect(wrong.json.error.message).toBe('Kode akses salah')

    const ok = await unlock(c, couple.slug, '4821')
    expect(ok.status).toBe(204)
    const cookie = ok.headers.getSetCookie().find((l) => l.startsWith(`wc_${couple.id}=`))!
    expect(cookie).toMatch(/Max-Age=2592000/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Path=\/api/)

    expect((await c.get(`/api/public/couples/${couple.slug}/gate`)).json.unlocked).toBe(true)
    const page = await c.get(`/api/couple/${couple.slug}/send-invitation`)
    expect(page.status).toBe(200)
    expect(page.json.status).toBe('draft')
    expect(page.json.couple.slug).toBe(couple.slug)
    expect(page.text).not.toContain('4821')
  })

  it("one couple's cookie doesn't open another couple's page", async () => {
    const a = await newCouple(anisaRaka, '1234')
    const b = await newCouple(anisaRaka, '1234')
    const c = guest()
    await unlock(c, a.slug, '1234')
    expect((await c.get(`/api/couple/${b.slug}/send-invitation`)).status).toBe(401)
    // Copying A's cookie value under B's name doesn't help either.
    c.cookies.set(`wc_${b.id}`, c.cookies.get(`wc_${a.id}`)!)
    expect((await c.get(`/api/couple/${b.slug}/send-invitation`)).status).toBe(401)
  })

  it('changing the passcode ends every unlock (FR-010c)', async () => {
    const couple = await newCouple()
    const c = guest()
    await unlock(c, couple.slug, '4821')
    expect((await c.get(`/api/couple/${couple.slug}/send-invitation`)).status).toBe(200)
    await admin.patch(`/api/admin/couples/${couple.id}`, { expectedVersion: couple.version, patch: { passcode: '5555' } })
    expect((await c.get(`/api/couple/${couple.slug}/send-invitation`)).status).toBe(401)
    expect((await c.get(`/api/public/couples/${couple.slug}/gate`)).json.unlocked).toBe(false)
  })

  it('tampered or expired cookies are refused; lock clears the cookie', async () => {
    const couple = await newCouple()
    const c = guest()
    await unlock(c, couple.slug, '4821')
    const name = `wc_${couple.id}`
    const good = c.cookies.get(name)!
    c.cookies.set(name, good.slice(0, -3) + 'abc')
    expect((await c.get(`/api/couple/${couple.slug}/send-invitation`)).status).toBe(401)
    c.cookies.set(name, good)
    expect((await c.post(`/api/couple/${couple.slug}/lock`)).status).toBe(204)
    expect(c.cookies.has(name)).toBe(false)
  })

  it('5 wrong codes pause entry for 15 minutes, for everyone, and are logged (FR-010d)', async () => {
    const couple = await newCouple()
    const c = guest()
    for (let i = 0; i < 4; i++) expect((await unlock(c, couple.slug, '0000')).status).toBe(401)
    const fifth = await unlock(c, couple.slug, '0000')
    expect(fifth.status).toBe(423)
    expect(fifth.json.error.message).toMatch(/^Terlalu banyak percobaan\. Coba lagi dalam \d+ menit\.$/)
    const wait = Date.parse(fifth.json.error.retryAt) - Date.now()
    expect(wait).toBeGreaterThan(14 * 60_000)
    expect(wait).toBeLessThanOrEqual(15 * 60_000)

    // Even the right code, from another browser, waits.
    const other = guest()
    expect((await unlock(other, couple.slug, '4821')).status).toBe(423)
    expect((await other.get(`/api/public/couples/${couple.slug}/gate`)).json.retryAt).toBe(fifth.json.error.retryAt)

    const events = await t.db.select().from(securityEvents).where(eq(securityEvents.coupleId, couple.id))
    expect(events).toHaveLength(1)
  })

  it('the admin list warns after 3 lockouts in a day', async () => {
    const couple = await newCouple()
    const c = guest()
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 5; i++) await unlock(c, couple.slug, '0000')
      await t.db.update(throttles).set({ lockedUntil: null }).where(eq(throttles.key, `passcode:${couple.id}`))
    }
    const list = await admin.get('/api/admin/couples')
    const summary = list.json.couples.find((x: { id: string }) => x.id === couple.id)
    expect(summary.accessWarning).toBe(true)
  })

  it('the admin sees the passcode; guests never do', async () => {
    const couple = await newCouple(anisaRaka, '7392')
    await admin.post(`/api/admin/couples/${couple.id}/status`, { status: 'active' })
    expect((await admin.get(`/api/admin/couples/${couple.id}`)).json.couple.passcode).toBe('7392')
    for (const path of [`/api/public/couples/${couple.slug}`, `/api/public/couples/${couple.slug}/gate`]) {
      expect((await guest().get(path)).text).not.toContain('7392')
    }
  })
})
