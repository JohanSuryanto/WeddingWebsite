import { createHash, randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import { mediaRef } from '../../src/data/resolveMedia'
import { adminClient, Client, makeTestApp, PUBLIC_ORIGIN, type TestApp } from './harness'

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

/** Uploads bytes for a pending media id through the normal ticket flow (what restore.ts does). */
async function uploadWithId(c: Client, coupleId: string, meta: { id: string; kind: 'image' | 'audio'; mime: string }, bytes: Uint8Array<ArrayBuffer>) {
  const ticket = await c.post(`/api/admin/couples/${coupleId}/media`, { ...meta, size: bytes.length })
  expect(ticket.status, ticket.text).toBe(201)
  const form = new FormData()
  for (const [k, v] of Object.entries(ticket.json.upload.fields as Record<string, string>)) form.set(k, v)
  form.set('file', new Blob([bytes], { type: meta.mime }), 'f')
  const up = await c.req('POST', ticket.json.upload.url, { body: form })
  const done = await c.post(`/api/admin/media/${meta.id}/complete`, up.json)
  expect(done.status, done.text).toBe(200)
}

function backupCouple(slug: string, mediaId: string) {
  const content = structuredClone(anisaRaka)
  content.cover.background = { src: mediaRef(mediaId), width: 3, height: 2 }
  return { slug, status: 'active' as const, defaultTheme: 'rustic-garden' as const, content, passcode: '2468' }
}

describe('restore (US6, FR-021)', () => {
  it('preflight reports existing ids and slugs', async () => {
    const t = await makeTestApp()
    const admin = await adminClient(t)
    const made = await admin.post('/api/admin/couples', { slug: 'sudah-ada', defaultTheme: 'romantic-floral', content: anisaRaka })
    const res = await admin.post('/api/admin/import/preflight', {
      couples: [
        { id: made.json.couple.id, slug: 'lain' },
        { id: randomUUID(), slug: 'sudah-ada' },
        { id: randomUUID(), slug: 'baru' },
      ],
    })
    expect(res.json).toEqual({ existingIds: [made.json.couple.id], existingSlugs: ['sudah-ada'], pendingIds: [] })
  })

  it('keeps ids, stays hidden until finished, uploads media, and is safe to re-run', async () => {
    const t = await makeTestApp()
    const admin = await adminClient(t)
    const id = randomUUID()
    const mediaId = randomUUID()
    const body = {
      couple: backupCouple('dipulihkan', mediaId),
      media: [{ id: mediaId, kind: 'image', mime: 'image/webp', size: 5, width: 3, height: 2 }],
      mode: 'create',
    }

    const first = await admin.put(`/api/admin/import/couples/${id}`, body)
    expect(first.status, first.text).toBe(200)
    expect(first.json.couple).toMatchObject({ id, slug: 'dipulihkan', status: 'draft', passcode: '2468' })
    expect(first.json.pendingMediaIds).toEqual([mediaId])
    const list = (await admin.get('/api/admin/couples')).json.couples
    expect(list.find((x: { id: string }) => x.id === id).restorePending).toBe(true)
    // Not publishable and not public while restoring.
    expect((await admin.post(`/api/admin/couples/${id}/status`, { status: 'active' })).json.error.code).toBe('not_publishable')
    expect((await new Client(t.app, PUBLIC_ORIGIN).get('/api/public/couples/dipulihkan')).status).toBe(403)

    const unfinished = await admin.post(`/api/admin/import/couples/${id}/finish`, { status: 'active' })
    expect(unfinished.status).toBe(422)
    expect(unfinished.json.error.code).toBe('media_not_ready')
    expect(unfinished.json.error.media).toEqual([mediaId])

    await uploadWithId(admin, id, { id: mediaId, kind: 'image', mime: 'image/webp' }, new Uint8Array([1, 2, 3, 4, 5]))
    const done = await admin.post(`/api/admin/import/couples/${id}/finish`, { status: 'active' })
    expect(done.json.couple.status).toBe('active')
    expect((await new Client(t.app, PUBLIC_ORIGIN).get('/api/public/couples/dipulihkan')).status).toBe(200)

    // Running the same restore again creates nothing new.
    const again = await admin.put(`/api/admin/import/couples/${id}`, body)
    expect(again.json.pendingMediaIds).toEqual([])
    await admin.post(`/api/admin/import/couples/${id}/finish`, { status: 'active' })
    const after = (await admin.get('/api/admin/couples')).json.couples.filter((x: { slug: string }) => x.slug.startsWith('dipulihkan'))
    expect(after).toHaveLength(1)
    expect((await admin.get(`/api/admin/couples/${id}`)).json.media[mediaId].status).toBe('ready')
  })

  it('"create" refuses a taken address; "replace" takes it over', async () => {
    const t = await makeTestApp()
    const admin = await adminClient(t)
    const old = (await admin.post('/api/admin/couples', { slug: 'rebutan', defaultTheme: 'romantic-floral', content: anisaRaka })).json.couple
    const id = randomUUID()
    const body = (mode: string) => ({ couple: backupCouple('rebutan', randomUUID()), media: [], mode })
    const refused = await admin.put(`/api/admin/import/couples/${id}`, body('create'))
    expect(refused.json.error.code).toBe('slug_taken')
    const replaced = await admin.put(`/api/admin/import/couples/${id}`, body('replace'))
    expect(replaced.status, replaced.text).toBe(200)
    expect((await admin.get(`/api/admin/couples/${old.id}`)).status).toBe(404)
  })

  it('imports responses once, skipping ids it already has', async () => {
    const t = await makeTestApp()
    const admin = await adminClient(t)
    const id = randomUUID()
    await admin.put(`/api/admin/import/couples/${id}`, { couple: backupCouple('respons-lama', randomUUID()), media: [], mode: 'create' })
    const body = {
      rsvps: [{ id: randomUUID(), name: 'Pak Andi', attendance: 'hadir', guestCount: 2, submittedAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' }],
      wishes: [{ id: randomUUID(), name: 'Bu Rina', message: 'Selamat ya', attendance: null, hidden: true, createdAt: '2026-10-01T00:00:00Z' }],
    }
    expect((await admin.post(`/api/admin/import/couples/${id}/responses`, body)).json).toEqual({ inserted: 2, skipped: 0 })
    expect((await admin.post(`/api/admin/import/couples/${id}/responses`, body)).json).toEqual({ inserted: 0, skipped: 2 })
  })
})

describe('export (US7, SC-005)', () => {
  async function seeded(t: TestApp) {
    const admin = await adminClient(t)
    const id = randomUUID()
    const mediaId = randomUUID()
    await admin.put(`/api/admin/import/couples/${id}`, {
      couple: backupCouple('ekspor', mediaId),
      media: [{ id: mediaId, kind: 'image', mime: 'image/webp', size: 6 }],
      mode: 'create',
    })
    await uploadWithId(admin, id, { id: mediaId, kind: 'image', mime: 'image/webp' }, new Uint8Array([9, 8, 7, 6, 5, 4]))
    await admin.post(`/api/admin/import/couples/${id}/finish`, { status: 'active' })
    const list = await admin.put(`/api/admin/couples/${id}/guests`, { names: ['Pak Andi', 'Bu Rina'] })
    await admin.patch(`/api/admin/couples/${id}/guests/${list.json.guests[0].id}`, { sent: true })
    // Pak Andi answers through his own link, so the backup carries the link to his guest.
    const guestCode = list.json.guests[0].id.slice(0, 8)
    const guest = new Client(t.app, PUBLIC_ORIGIN)
    await guest.post('/api/public/couples/ekspor/rsvp', { name: 'Pak Andi', attendance: 'hadir', guestCount: 2, guestCode })
    await guest.post('/api/public/couples/ekspor/wishes', { name: 'Bu Rina', message: 'Bahagia selalu' })
    return admin
  }

  it('exports v2 with passcodes, media URLs, RSVPs, wishes and guests, and restores into an empty database unchanged', async () => {
    const source = await makeTestApp()
    const admin = await seeded(source)
    const doc = (await admin.get('/api/admin/export')).json
    expect(doc).toMatchObject({ format: 'wedding-admin-backup', formatVersion: 2 })
    expect(doc.couples[0].passcode).toBe('2468')
    expect(doc.media[0]).toHaveProperty('url')
    expect(doc.media[0]).not.toHaveProperty('data')
    expect(doc.rsvps).toHaveLength(1)
    expect(doc.guests).toHaveLength(2)
    expect(doc.rsvps[0].guestId).toBe(doc.guests.find((g: { name: string }) => g.name === 'Pak Andi').id)
    expect(JSON.stringify(doc)).not.toContain('visitor')

    // The browser part: fetch each file's bytes from its URL.
    const bytes = new Map<string, Uint8Array<ArrayBuffer>>()
    for (const m of doc.media) {
      const res = await source.app.request(`http://admin.localhost:4817${m.url}`)
      bytes.set(m.id, new Uint8Array(await res.arrayBuffer()))
    }

    // Restore into a brand-new, empty system.
    const target = await makeTestApp()
    const fresh = await adminClient(target)
    for (const couple of doc.couples) {
      const media = doc.media.filter((m: { coupleId: string }) => m.coupleId === couple.id)
      const put = await fresh.put(`/api/admin/import/couples/${couple.id}`, { couple, media, mode: 'create' })
      for (const id of put.json.pendingMediaIds) {
        const m = media.find((x: { id: string }) => x.id === id)
        await uploadWithId(fresh, couple.id, m, bytes.get(id)!)
      }
      await fresh.post(`/api/admin/import/couples/${couple.id}/responses`, {
        rsvps: doc.rsvps.filter((r: { coupleId: string }) => r.coupleId === couple.id),
        wishes: doc.wishes.filter((w: { coupleId: string }) => w.coupleId === couple.id),
        guests: doc.guests.filter((g: { coupleId: string }) => g.coupleId === couple.id),
      })
      await fresh.post(`/api/admin/import/couples/${couple.id}/finish`, { status: couple.status })
    }

    const back = (await fresh.get('/api/admin/export')).json
    const strip = (c: Record<string, unknown>) => ({ ...c, version: 0, updatedAt: '' })
    expect(back.couples.map(strip)).toEqual(doc.couples.map(strip))
    expect(back.rsvps).toEqual(doc.rsvps)
    expect(back.wishes).toEqual(doc.wishes)
    expect(back.guests).toEqual(doc.guests) // names, order and sent marks
    for (const m of back.media) {
      const res = await target.app.request(`http://admin.localhost:4817${m.url}`)
      expect(sha(new Uint8Array(await res.arrayBuffer()))).toBe(sha(bytes.get(m.id)!))
    }
  })
})
