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
