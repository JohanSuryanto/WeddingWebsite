import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import { adminClient, Client, makeTestApp, PUBLIC_ORIGIN } from './harness'

const t = await makeTestApp()
const admin = await adminClient(t)

let n = 0
async function couple(passcode = '4821') {
  const res = await admin.post('/api/admin/couples', {
    slug: `daftar-${++n}`,
    defaultTheme: 'romantic-floral',
    content: anisaRaka,
    passcode,
  })
  return res.json.couple as { id: string; slug: string }
}

async function unlocked(slug: string, passcode = '4821') {
  const c = new Client(t.app, PUBLIC_ORIGIN)
  expect((await c.post(`/api/public/couples/${slug}/unlock`, { passcode })).status).toBe(204)
  return c
}

type Guest = { id: string; name: string; sentAt: string | null }
const names = (list: Guest[]) => list.map((g) => g.name)

describe('guest list (send-invitation page)', () => {
  it('the couple saves names; the admin sees and edits the same list', async () => {
    const { id, slug } = await couple()
    const c = await unlocked(slug)
    const saved = await c.req('PUT', `/api/couple/${slug}/guests`, {
      body: { names: ['  Budi   Santoso ', '', 'Keluarga Bapak Andi'] },
    })
    expect(saved.status).toBe(200)
    expect(names(saved.json.guests)).toEqual(['Budi Santoso', 'Keluarga Bapak Andi'])

    const seen = await admin.get(`/api/admin/couples/${id}/guests`)
    expect(names(seen.json.guests)).toEqual(['Budi Santoso', 'Keluarga Bapak Andi'])

    await admin.req('PUT', `/api/admin/couples/${id}/guests`, { body: { names: ['Budi Santoso', 'Bu Rina'] } })
    expect(names((await c.get(`/api/couple/${slug}/guests`)).json.guests)).toEqual(['Budi Santoso', 'Bu Rina'])
  })

  it('a sent mark stays when the list is edited, and can be undone', async () => {
    const { slug } = await couple()
    const c = await unlocked(slug)
    const list: Guest[] = (await c.req('PUT', `/api/couple/${slug}/guests`, { body: { names: ['A1', 'B2', 'A1'] } }))
      .json.guests
    const marked = await c.req('PATCH', `/api/couple/${slug}/guests/${list[2].id}`, { body: { sent: true } })
    expect(marked.json.guest.sentAt).toEqual(expect.any(String))

    // Reorder and add: the second "A1" keeps its id and mark (repeats match in order).
    const after: Guest[] = (
      await c.req('PUT', `/api/couple/${slug}/guests`, { body: { names: ['C3', 'A1', 'B2', 'A1'] } })
    ).json.guests
    expect(after.map((g) => g.sentAt !== null)).toEqual([false, false, false, true])
    expect(after[3].id).toBe(list[2].id)

    const undone = await c.req('PATCH', `/api/couple/${slug}/guests/${list[2].id}`, { body: { sent: false } })
    expect(undone.json.guest.sentAt).toBeNull()
  })

  it('is closed without the passcode, and one couple cannot touch another\'s guests', async () => {
    const one = await couple('1111')
    const two = await couple('2222')
    expect((await new Client(t.app, PUBLIC_ORIGIN).get(`/api/couple/${one.slug}/guests`)).status).toBe(401)

    const theirs: Guest[] = (
      await admin.req('PUT', `/api/admin/couples/${two.id}/guests`, { body: { names: ['Tamu Dua'] } })
    ).json.guests
    const c = await unlocked(one.slug, '1111')
    const res = await c.req('PATCH', `/api/couple/${one.slug}/guests/${theirs[0].id}`, { body: { sent: true } })
    expect(res.status).toBe(404)
  })

  it('limits the list size and name length', async () => {
    const { id } = await couple()
    const tooMany = await admin.req('PUT', `/api/admin/couples/${id}/guests`, {
      body: { names: Array.from({ length: 1001 }, (_, i) => `Tamu ${i}`) },
    })
    expect(tooMany.status).toBe(400)
    const tooLong = await admin.req('PUT', `/api/admin/couples/${id}/guests`, { body: { names: ['x'.repeat(201)] } })
    expect(tooLong.status).toBe(400)
  })

  it('goes away with the couple', async () => {
    const { id } = await couple()
    await admin.req('PUT', `/api/admin/couples/${id}/guests`, { body: { names: ['Budi'] } })
    await admin.req('DELETE', `/api/admin/couples/${id}`)
    expect((await admin.get(`/api/admin/couples/${id}/guests`)).status).toBe(404)
  })
})

describe('who replied (RSVPs and wishes through a guest link)', () => {
  async function liveWithGuests(names: string[]) {
    const c = await couple()
    await admin.post(`/api/admin/couples/${c.id}/status`, { status: 'active' })
    const list: Guest[] = (await admin.req('PUT', `/api/admin/couples/${c.id}/guests`, { body: { names } })).json.guests
    return { ...c, list }
  }
  const code = (g: Guest) => g.id.slice(0, 8)
  const replies = async (id: string) =>
    (await admin.get(`/api/admin/couples/${id}/guests`)).json.guests as (Guest & {
      reply: { attendance: string; guestCount: number } | null
      wished: boolean
    })[]

  it('matches an RSVP and a wish to the guest whose link was used', async () => {
    const { id, slug, list } = await liveWithGuests(['Budi Santoso', 'Bu Rina'])
    const budi = new Client(t.app, PUBLIC_ORIGIN)
    await budi.post(`/api/public/couples/${slug}/rsvp`, {
      name: 'Budi',
      attendance: 'hadir',
      guestCount: 2,
      guestCode: code(list[0]),
    })
    await budi.post(`/api/public/couples/${slug}/wishes`, { name: 'Budi', message: 'Selamat!', guestCode: code(list[0]) })

    const [b, r] = await replies(id)
    expect(b.reply).toEqual({ attendance: 'hadir', guestCount: 2 })
    expect(b.wished).toBe(true)
    expect(r.reply).toBeNull()
    expect(r.wished).toBe(false)

    // Changing the answer from the same browser updates it, even from a plain link.
    await budi.post(`/api/public/couples/${slug}/rsvp`, { name: 'Budi', attendance: 'tidak_hadir', guestCount: 0 })
    expect((await replies(id))[0].reply).toEqual({ attendance: 'tidak_hadir', guestCount: 0 })
  })

  it('ignores unknown, malformed and other couples\' codes', async () => {
    const one = await liveWithGuests(['Tamu Satu'])
    const two = await liveWithGuests(['Tamu Dua'])
    for (const guestCode of ['00000000', 'bukan-kode', code(two.list[0])]) {
      const res = await new Client(t.app, PUBLIC_ORIGIN).post(`/api/public/couples/${one.slug}/rsvp`, {
        name: 'Seseorang',
        attendance: 'hadir',
        guestCount: 1,
        guestCode,
      })
      expect(res.status).toBe(200)
    }
    expect((await replies(one.id))[0].reply).toBeNull()
    expect((await replies(two.id))[0].reply).toBeNull()
  })

  it('editing the list keeps replies linked; removing a guest only unlinks them', async () => {
    const { id, slug, list } = await liveWithGuests(['A1', 'B2'])
    await new Client(t.app, PUBLIC_ORIGIN).post(`/api/public/couples/${slug}/rsvp`, {
      name: 'Tamu B',
      attendance: 'hadir',
      guestCount: 3,
      guestCode: code(list[1]),
    })
    await admin.req('PUT', `/api/admin/couples/${id}/guests`, { body: { names: ['C3', 'B2', 'A1'] } })
    expect((await replies(id)).find((g) => g.name === 'B2')!.reply).toEqual({ attendance: 'hadir', guestCount: 3 })

    await admin.req('PUT', `/api/admin/couples/${id}/guests`, { body: { names: ['C3', 'A1'] } })
    const responses = (await admin.get(`/api/admin/couples/${id}/responses`)).json
    expect(responses.rsvps).toHaveLength(1) // the RSVP itself stays
  })
})
