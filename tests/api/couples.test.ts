import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import type { WeddingContent } from '../../src/content/types'
import { emptyContent } from '../../src/data/emptyContent'
import { adminClient, Client, makeTestApp, PUBLIC_ORIGIN, uploadMedia } from './harness'

const t = await makeTestApp()
const admin = await adminClient(t)
const guest = new Client(t.app, PUBLIC_ORIGIN)

let n = 0
const uniqueSlug = (base = 'budi-sari') => `${base}-${++n}`

async function createCouple(content: WeddingContent = emptyContent('Sari', 'Budi'), slug = uniqueSlug()) {
  const res = await admin.post('/api/admin/couples', { slug, defaultTheme: 'romantic-floral', content })
  expect(res.status, res.text).toBe(201)
  return res.json.couple
}

describe('couples (admin)', () => {
  it('creates a draft from nicknames only, with a random passcode', async () => {
    const couple = await createCouple()
    expect(couple).toMatchObject({ status: 'draft', version: 1, defaultTheme: 'romantic-floral' })
    expect(couple.passcode).toMatch(/^\d{4}$/)
    expect(couple.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('keeps a given passcode and rejects a malformed one', async () => {
    const ok = await admin.post('/api/admin/couples', {
      slug: uniqueSlug(),
      defaultTheme: 'rustic-garden',
      content: emptyContent('A', 'B'),
      passcode: '0042',
    })
    expect(ok.json.couple.passcode).toBe('0042')
    const bad = await admin.post('/api/admin/couples', {
      slug: uniqueSlug(),
      defaultTheme: 'rustic-garden',
      content: emptyContent('A', 'B'),
      passcode: '42',
    })
    expect(bad.status).toBe(400)
  })

  it('rejects content without the basic structure', async () => {
    const res = await admin.post('/api/admin/couples', {
      slug: uniqueSlug(),
      defaultTheme: 'romantic-floral',
      content: { cover: {} },
    })
    expect(res.status).toBe(422)
    expect(res.json.error.code).toBe('validation')
  })

  it('enforces unique and non-reserved address names', async () => {
    const slug = uniqueSlug()
    await createCouple(undefined, slug)
    const dup = await admin.post('/api/admin/couples', { slug, defaultTheme: 'romantic-floral', content: emptyContent('a', 'b') })
    expect(dup.status).toBe(409)
    expect(dup.json.error.code).toBe('slug_taken')
    const reserved = await admin.post('/api/admin/couples', {
      slug: 'login',
      defaultTheme: 'romantic-floral',
      content: emptyContent('a', 'b'),
    })
    expect(reserved.status).toBe(422)
    expect(reserved.json.error.code).toBe('slug_reserved')
  })

  it('refuses stale saves (conflict) and changes nothing', async () => {
    const couple = await createCouple(anisaRaka)
    const first = await admin.patch(`/api/admin/couples/${couple.id}`, {
      expectedVersion: 1,
      patch: { content: { ...anisaRaka, cover: { ...anisaRaka.cover, heading: 'Satu' } } },
    })
    expect(first.status, first.text).toBe(200)
    expect(first.json.couple.version).toBe(2)
    const stale = await admin.patch(`/api/admin/couples/${couple.id}`, {
      expectedVersion: 1,
      patch: { content: { ...anisaRaka, cover: { ...anisaRaka.cover, heading: 'Dua' } } },
    })
    expect(stale.status).toBe(409)
    expect(stale.json.error.code).toBe('conflict')
    const now = await admin.get(`/api/admin/couples/${couple.id}`)
    expect(now.json.couple.content.cover.heading).toBe('Satu')
    expect(now.json.couple.version).toBe(2)
  })

  it('validates saved content with the full rules', async () => {
    const couple = await createCouple()
    const res = await admin.patch(`/api/admin/couples/${couple.id}`, {
      expectedVersion: 1,
      patch: { content: emptyContent('Sari', 'Budi') },
    })
    expect(res.status).toBe(422)
    expect(res.json.error.code).toBe('validation')
    expect(Object.keys(res.json.error.fields ?? {}).length).toBeGreaterThan(0)
  })

  it('bumps passcode_version only when the passcode changes', async () => {
    const couple = await createCouple(anisaRaka)
    const same = await admin.patch(`/api/admin/couples/${couple.id}`, {
      expectedVersion: 1,
      patch: { passcode: couple.passcode },
    })
    expect(same.status).toBe(200)
    const changed = await admin.patch(`/api/admin/couples/${couple.id}`, {
      expectedVersion: 2,
      patch: { passcode: couple.passcode === '1111' ? '2222' : '1111' },
    })
    expect(changed.status).toBe(200)
    const [row] = await t.db.query.couples.findMany({ where: (c, { eq }) => eq(c.id, couple.id) })
    expect(row.passcodeVersion).toBe(2)
  })

  it('publishes only complete content, explaining what is missing', async () => {
    const draft = await createCouple()
    const refused = await admin.post(`/api/admin/couples/${draft.id}/status`, { status: 'active' })
    expect(refused.status).toBe(422)
    expect(refused.json.error.code).toBe('not_publishable')
    expect(refused.json.error.message.length).toBeGreaterThan(3)

    const complete = await createCouple(anisaRaka)
    const ok = await admin.post(`/api/admin/couples/${complete.id}/status`, { status: 'active' })
    expect(ok.status).toBe(200)
    expect(ok.json.couple.status).toBe('active')
  })

  it('lists newest first with summary fields', async () => {
    const older = await createCouple(emptyContent('Older', 'One'))
    const newer = await createCouple(emptyContent('Newer', 'Two'))
    const res = await admin.get('/api/admin/couples')
    const ids = res.json.couples.map((c: { id: string }) => c.id)
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id))
    const summary = res.json.couples.find((c: { id: string }) => c.id === newer.id)
    expect(summary).toMatchObject({
      names: 'Newer & Two',
      status: 'draft',
      accessWarning: false,
      restorePending: false,
    })
    expect(summary).toHaveProperty('mainDate')
    expect(summary).toHaveProperty('coverSrc')
    expect(summary).not.toHaveProperty('passcode')
  })

  it('duplicates as a draft with a -salinan address and a new passcode', async () => {
    const couple = await createCouple(anisaRaka)
    const res = await admin.post(`/api/admin/couples/${couple.id}/duplicate`)
    expect(res.status).toBe(201)
    expect(res.json.couple.slug).toBe(`${couple.slug}-salinan`)
    expect(res.json.couple.status).toBe('draft')
    expect(res.json.couple.id).not.toBe(couple.id)
  })

  it('finds by slug including drafts', async () => {
    const couple = await createCouple()
    const res = await admin.get(`/api/admin/couples/by-slug/${couple.slug}`)
    expect(res.status).toBe(200)
    expect(res.json.couple.id).toBe(couple.id)
    expect(res.json.media).toEqual({})
  })
})

describe('media basics', () => {
  it('uploads, then saves content referencing ready media only', async () => {
    const couple = await createCouple(anisaRaka)
    const id = await uploadMedia(admin, couple.id)
    const content = { ...anisaRaka, cover: { ...anisaRaka.cover, background: { src: `media:${id}`, width: 10, height: 10 } } }
    const saved = await admin.patch(`/api/admin/couples/${couple.id}`, { expectedVersion: 1, patch: { content } })
    expect(saved.status, saved.text).toBe(200)

    const got = await admin.get(`/api/admin/couples/${couple.id}`)
    expect(got.json.media[id]).toMatchObject({ id, kind: 'image', status: 'ready' })
    expect(got.json.media[id].url).toMatch(/^\/api\/dev\/media\//)
    const file = await admin.get(got.json.media[id].url)
    expect(file.status).toBe(200)
  })

  it('refuses refs to pending media or to another couple’s media', async () => {
    const a = await createCouple(anisaRaka)
    const b = await createCouple(anisaRaka)
    const pending = await admin.post(`/api/admin/couples/${a.id}/media`, { kind: 'image', mime: 'image/webp', size: 5 })
    const other = await uploadMedia(admin, b.id)
    for (const ref of [pending.json.media.id, other]) {
      const content = { ...anisaRaka, cover: { ...anisaRaka.cover, background: { src: `media:${ref}`, width: 1, height: 1 } } }
      const res = await admin.patch(`/api/admin/couples/${a.id}`, { expectedVersion: 1, patch: { content } })
      expect(res.status).toBe(422)
      expect(res.json.error.code).toBe('media_not_ready')
    }
  })
})

describe('public read', () => {
  it('serves active couples with resolved media, hides drafts, 404s unknown', async () => {
    const couple = await createCouple(anisaRaka)
    const id = await uploadMedia(admin, couple.id)
    const content = { ...anisaRaka, cover: { ...anisaRaka.cover, background: { src: `media:${id}`, width: 10, height: 10 } } }
    await admin.patch(`/api/admin/couples/${couple.id}`, { expectedVersion: 1, patch: { content } })

    const draft = await guest.get(`/api/public/couples/${couple.slug}`)
    expect(draft.status).toBe(403)
    expect(draft.json.error.code).toBe('unavailable')
    expect(draft.json).not.toHaveProperty('couple')
    expect(draft.text).not.toContain(anisaRaka.couple.bride.fullName)

    await admin.post(`/api/admin/couples/${couple.id}/status`, { status: 'active' })
    const live = await guest.get(`/api/public/couples/${couple.slug}`)
    expect(live.status).toBe(200)
    expect(live.json.couple).toMatchObject({ slug: couple.slug, defaultTheme: 'romantic-floral' })
    expect(live.json.couple.content.cover.background.src).toMatch(/^\/api\/dev\/media\//)
    expect(live.text).not.toContain('media:')
    expect(live.text).not.toContain('passcode')
    expect(live.headers.get('cache-control')).toBe('no-store')

    expect((await guest.get('/api/public/couples/tidak-ada')).status).toBe(404)
  })

  it('deletes a couple', async () => {
    const couple = await createCouple(anisaRaka)
    expect((await admin.del(`/api/admin/couples/${couple.id}`)).status).toBe(204)
    expect((await admin.get(`/api/admin/couples/${couple.id}`)).status).toBe(404)
  })
})
