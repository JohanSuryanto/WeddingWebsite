import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import { rateLimits, rsvps, wishes } from '../../server/db/schema'
import { adminClient, Client, makeTestApp, PUBLIC_ORIGIN } from './harness'

const t = await makeTestApp()
const admin = await adminClient(t)

let n = 0
async function liveCouple(passcode = '4821') {
  const res = await admin.post('/api/admin/couples', {
    slug: `tamu-${++n}`,
    defaultTheme: 'romantic-floral',
    content: anisaRaka,
    passcode,
  })
  const couple = res.json.couple as { id: string; slug: string }
  await admin.post(`/api/admin/couples/${couple.id}/status`, { status: 'active' })
  return couple
}

const guest = (headers: Record<string, string> = {}) => {
  const c = new Client(t.app, PUBLIC_ORIGIN)
  const req = c.req.bind(c)
  c.req = (method, path, opts = {}) => req(method, path, { ...opts, headers: { ...headers, ...opts.headers } })
  return c
}
const rsvp = (c: Client, slug: string, body: object) => c.post(`/api/public/couples/${slug}/rsvp`, body)
const wish = (c: Client, slug: string, body: object) => c.post(`/api/public/couples/${slug}/wishes`, body)

describe('RSVPs (FR-016, FR-017)', () => {
  it('validates with the same messages as the form', async () => {
    const couple = await liveCouple()
    const res = await rsvp(guest(), couple.slug, { name: 'A', attendance: '', guestCount: 9 })
    expect(res.status).toBe(400)
    expect(res.json.error.fields).toMatchObject({ name: expect.any(String), attendance: expect.any(String) })
  })

  it('sets a 1-year visitor cookie and replaces a repeat from the same browser', async () => {
    const couple = await liveCouple()
    const a = guest()
    const first = await rsvp(a, couple.slug, { name: 'Pak Andi', attendance: 'hadir', guestCount: 2 })
    expect(first.status).toBe(200)
    expect(first.json.replaced).toBe(false)
    expect(first.headers.getSetCookie().find((l) => l.startsWith('wv='))).toMatch(/Max-Age=31536000/)

    const again = await rsvp(a, couple.slug, { name: 'Pak Andi', attendance: 'tidak_hadir', guestCount: 3 })
    expect(again.json.replaced).toBe(true)
    expect(again.json.rsvp).toMatchObject({ attendance: 'tidak_hadir', guestCount: 0 })

    await rsvp(guest(), couple.slug, { name: 'Bu Rina', attendance: 'hadir', guestCount: 1 })
    const rows = await t.db.select().from(rsvps).where(eq(rsvps.coupleId, couple.id))
    expect(rows).toHaveLength(2)

    const mine = await a.get(`/api/public/couples/${couple.slug}/rsvp/mine`)
    expect(mine.json.rsvp).toMatchObject({ name: 'Pak Andi', attendance: 'tidak_hadir' })
    expect((await guest().get(`/api/public/couples/${couple.slug}/rsvp/mine`)).json.rsvp).toBeNull()
  })

  it('only for published couples', async () => {
    const res = await admin.post('/api/admin/couples', { slug: `draf-${++n}`, defaultTheme: 'romantic-floral', content: anisaRaka })
    const draft = res.json.couple
    expect((await rsvp(guest(), draft.slug, { name: 'Pak Andi', attendance: 'hadir', guestCount: 1 })).status).toBe(403)
    expect((await wish(guest(), draft.slug, { name: 'Pak Andi', message: 'Selamat ya!' })).status).toBe(403)
    expect((await guest().get(`/api/public/couples/${draft.slug}/wishes`)).status).toBe(403)
  })
})

describe('wishes (FR-018, FR-020)', () => {
  it('validates name 2–60 and message 3–500, stores plain text', async () => {
    const couple = await liveCouple()
    const bad = await wish(guest(), couple.slug, { name: 'A', message: 'hi' })
    expect(bad.status).toBe(400)
    expect(Object.keys(bad.json.error.fields).sort()).toEqual(['message', 'name'])
    const long = await wish(guest(), couple.slug, { name: 'Pak Andi', message: 'x'.repeat(501) })
    expect(long.status).toBe(400)
    const ok = await wish(guest(), couple.slug, { name: 'Pak Andi', message: '<b>Selamat</b> ya!' })
    expect(ok.status).toBe(201)
    expect(ok.json.wish.message).toBe('<b>Selamat</b> ya!')
  })

  it('lists newest first, 20 per page, with a cursor; hidden ones excluded', async () => {
    const couple = await liveCouple()
    const base = Date.now()
    await t.db.insert(wishes).values(
      Array.from({ length: 25 }, (_, i) => ({
        id: crypto.randomUUID(),
        coupleId: couple.id,
        name: `Tamu ${i + 1}`,
        message: `Ucapan ${i + 1}`,
        createdAt: new Date(base - (25 - i) * 60_000),
        hidden: i === 24,
      })),
    )
    const page1 = await guest().get(`/api/public/couples/${couple.slug}/wishes`)
    expect(page1.json.items).toHaveLength(20)
    expect(page1.json.items[0].name).toBe('Tamu 24')
    expect(page1.json.nextCursor).toBeTruthy()
    const page2 = await guest().get(`/api/public/couples/${couple.slug}/wishes?cursor=${page1.json.nextCursor}`)
    expect(page2.json.items.map((w: { name: string }) => w.name)).toEqual(['Tamu 4', 'Tamu 3', 'Tamu 2', 'Tamu 1'])
    expect(page2.json.nextCursor).toBeNull()
    expect(JSON.stringify([page1.json, page2.json])).not.toContain('Tamu 25')
  })

  it('limits 5 per browser per 10 minutes, and 30 per IP', async () => {
    const couple = await liveCouple()
    const a = guest({ 'x-forwarded-for': '203.0.113.1' })
    for (let i = 0; i < 5; i++) {
      expect((await wish(a, couple.slug, { name: 'Pak Andi', message: `Ucapan ${i}` })).status).toBe(201)
    }
    const sixth = await wish(a, couple.slug, { name: 'Pak Andi', message: 'Ucapan 6' })
    expect(sixth.status).toBe(429)
    expect(sixth.json.error.message).toBe('Terlalu banyak pesan, coba lagi nanti')
    expect(Date.parse(sixth.json.error.retryAt)).toBeGreaterThan(Date.now())

    // Clearing cookies doesn't escape the per-IP limit.
    await t.db.delete(rateLimits)
    let last = 0
    for (let i = 0; i < 31; i++) {
      last = (await wish(guest({ 'x-forwarded-for': '203.0.113.2' }), couple.slug, { name: 'Bot Bot', message: `spam ${i}` })).status
    }
    expect(last).toBe(429)
  })
})

describe('reading responses', () => {
  it('admin sees totals, hidden wishes, can hide/delete; CSV downloads', async () => {
    const couple = await liveCouple()
    await rsvp(guest(), couple.slug, { name: 'Pak Andi', attendance: 'hadir', guestCount: 2 })
    await rsvp(guest(), couple.slug, { name: 'Bu Rina', attendance: 'hadir', guestCount: 3 })
    await rsvp(guest(), couple.slug, { name: '=SUM(1)', attendance: 'tidak_hadir', guestCount: 0 })
    const w = (await wish(guest(), couple.slug, { name: 'Pak Andi', message: 'Selamat ya!' })).json.wish

    const res = await admin.get(`/api/admin/couples/${couple.id}/responses`)
    expect(res.json.totals).toEqual({ attending: 2, notAttending: 1, people: 5 })
    expect(res.json.rsvps).toHaveLength(3)

    const hidden = await admin.patch(`/api/admin/wishes/${w.id}`, { hidden: true })
    expect(hidden.json.wish.hidden).toBe(true)
    const after = await admin.get(`/api/admin/couples/${couple.id}/responses`)
    expect(after.json.wishes.items.find((x: { id: string }) => x.id === w.id).hidden).toBe(true)
    const publicList = await guest().get(`/api/public/couples/${couple.slug}/wishes`)
    expect(publicList.json.items.find((x: { id: string }) => x.id === w.id)).toBeUndefined()

    const csv = await admin.get(`/api/admin/couples/${couple.id}/rsvps.csv`)
    expect(csv.headers.get('content-type')).toMatch(/text\/csv/)
    expect(csv.headers.get('content-disposition')).toMatch(new RegExp(`attachment; filename="rsvp-${couple.slug}-\\d{8}\\.csv"`))
    expect(csv.text).toContain('Nama,Kehadiran,Jumlah Tamu,Waktu (WIB)')
    expect(csv.text).toContain(`'=SUM(1)`)

    const rsvpId = res.json.rsvps[0].id
    expect((await admin.del(`/api/admin/rsvps/${rsvpId}`)).status).toBe(204)
    expect((await admin.del(`/api/admin/wishes/${w.id}`)).status).toBe(204)
    const final = await admin.get(`/api/admin/couples/${couple.id}/responses`)
    expect(final.json.rsvps).toHaveLength(2)
  })

  it('the couple reads their own responses with the passcode, hidden wishes excluded', async () => {
    const couple = await liveCouple('7777')
    await rsvp(guest(), couple.slug, { name: 'Pak Andi', attendance: 'hadir', guestCount: 2 })
    const w = (await wish(guest(), couple.slug, { name: 'Bu Rina', message: 'Bahagia selalu' })).json.wish
    await wish(guest(), couple.slug, { name: 'Pak Budi', message: 'Selamat menempuh hidup baru' })
    await admin.patch(`/api/admin/wishes/${w.id}`, { hidden: true })

    const c = guest()
    expect((await c.get(`/api/couple/${couple.slug}/responses`)).status).toBe(401)
    await c.post(`/api/public/couples/${couple.slug}/unlock`, { passcode: '7777' })
    const res = await c.get(`/api/couple/${couple.slug}/responses`)
    expect(res.status).toBe(200)
    expect(res.json.totals).toEqual({ attending: 1, notAttending: 0, people: 2 })
    expect(res.json.wishes.items.map((x: { name: string }) => x.name)).toEqual(['Pak Budi'])
    const csv = await c.get(`/api/couple/${couple.slug}/rsvps.csv`)
    expect(csv.status).toBe(200)
    expect(csv.text).toContain('Pak Andi,Hadir,2,')
  })
})
