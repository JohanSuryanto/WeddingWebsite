import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import type { WeddingContent } from '../../src/content/types'
import { mediaRef } from '../../src/data/resolveMedia'
import { media, mediaDeletions } from '../../server/db/schema'
import { adminClient, Client, makeTestApp, uploadMedia } from './harness'

const t = await makeTestApp()
const admin = await adminClient(t)

let n = 0
async function newCouple() {
  const res = await admin.post('/api/admin/couples', {
    slug: `media-${++n}`,
    defaultTheme: 'romantic-floral',
    content: anisaRaka,
  })
  return res.json.couple as { id: string; slug: string; version: number }
}

const fileOf = (key: string) => join(t.media.root, ...key.split('/'))
const rowOf = async (id: string) => (await t.db.select().from(media).where(eq(media.id, id)))[0]

function withGallery(content: WeddingContent, ids: string[]): WeddingContent {
  return {
    ...content,
    gallery: ids.map((id, i) => ({ src: { src: mediaRef(id), width: 10, height: 10 }, alt: `Foto ${i + 1}` })),
  }
}

describe('upload limits (FR-012)', () => {
  it('refuses oversized and unsupported files up front', async () => {
    const c = await newCouple()
    const big = await admin.post(`/api/admin/couples/${c.id}/media`, {
      kind: 'image',
      mime: 'image/webp',
      size: 10 * 1024 * 1024 + 1,
    })
    expect(big.status).toBe(422)
    expect(big.json.error).toMatchObject({ code: 'limit_exceeded', message: 'Ukuran maksimal 10 MB' })
    const gif = await admin.post(`/api/admin/couples/${c.id}/media`, { kind: 'image', mime: 'image/gif', size: 10 })
    expect(gif.json.error).toMatchObject({ code: 'limit_exceeded', message: 'Jenis file tidak didukung' })
    const song = await admin.post(`/api/admin/couples/${c.id}/media`, { kind: 'audio', mime: 'audio/x-m4a', size: 10 })
    expect(song.status).toBe(201)
  })

  it('rejects a tampered upload result', async () => {
    const c = await newCouple()
    const ticket = await admin.post(`/api/admin/couples/${c.id}/media`, { kind: 'image', mime: 'image/webp', size: 5 })
    const forged = await admin.post(`/api/admin/media/${ticket.json.media.id}/complete`, {
      key: ticket.json.media.id,
      bytes: 5,
      signature: 'palsu',
    })
    expect(forged.status).toBe(422)
    expect(forged.json.error.code).toBe('validation')
  })

  it('refuses more than 30 gallery photos', async () => {
    const c = await newCouple()
    const ids = []
    for (let i = 0; i < 31; i++) ids.push(await uploadMedia(admin, c.id))
    const res = await admin.patch(`/api/admin/couples/${c.id}`, {
      expectedVersion: c.version,
      patch: { content: withGallery(anisaRaka, ids) },
    })
    expect(res.status).toBe(422)
  })
})

describe('deleting files (FR-013, SC-008)', () => {
  it('saving content deletes files it no longer uses; prune does the same', async () => {
    const c = await newCouple()
    const [a, b, d] = [await uploadMedia(admin, c.id), await uploadMedia(admin, c.id), await uploadMedia(admin, c.id)]
    const keyB = (await rowOf(b)).providerKey
    const saved = await admin.patch(`/api/admin/couples/${c.id}`, {
      expectedVersion: c.version,
      patch: { content: withGallery(anisaRaka, [a, d]) },
    })
    expect(saved.status, saved.text).toBe(200)
    expect(await rowOf(b)).toBeUndefined()
    expect(existsSync(fileOf(keyB))).toBe(false)

    const keyD = (await rowOf(d)).providerKey
    const pruned = await admin.post(`/api/admin/couples/${c.id}/media/prune`, { referenced: [a] })
    expect(pruned.json.removed).toBe(1)
    expect(existsSync(fileOf(keyD))).toBe(false)
    expect(await rowOf(a)).toBeDefined()
  })

  it('DELETE /media/:id removes the row and the file', async () => {
    const c = await newCouple()
    const id = await uploadMedia(admin, c.id)
    const key = (await rowOf(id)).providerKey
    expect((await admin.del(`/api/admin/media/${id}`)).status).toBe(204)
    expect(existsSync(fileOf(key))).toBe(false)
    expect(await t.db.select().from(mediaDeletions)).toHaveLength(0)
  })

  it('deleting a couple removes its whole folder', async () => {
    const c = await newCouple()
    const id = await uploadMedia(admin, c.id)
    const folder = fileOf((await rowOf(id)).providerKey).replace(/[\\/][^\\/]+$/, '')
    expect(existsSync(folder)).toBe(true)
    expect((await admin.del(`/api/admin/couples/${c.id}`)).status).toBe(204)
    expect(existsSync(folder)).toBe(false)
    expect(await rowOf(id)).toBeUndefined()
  })

  it('duplicating copies files to new ids under the new couple', async () => {
    const c = await newCouple()
    const id = await uploadMedia(admin, c.id)
    const content = { ...anisaRaka, cover: { ...anisaRaka.cover, background: { src: mediaRef(id), width: 10, height: 10 } } }
    await admin.patch(`/api/admin/couples/${c.id}`, { expectedVersion: c.version, patch: { content } })
    const dup = await admin.post(`/api/admin/couples/${c.id}/duplicate`)
    const copyId = dup.json.couple.id
    const copyRef = dup.json.couple.content.cover.background.src as string
    expect(copyRef).not.toBe(mediaRef(id))
    const copyRow = await rowOf(copyRef.slice('media:'.length))
    expect(copyRow).toMatchObject({ coupleId: copyId, status: 'ready' })
    expect(existsSync(fileOf(copyRow.providerKey))).toBe(true)
    // Deleting the original keeps the copy's files.
    await admin.del(`/api/admin/couples/${c.id}`)
    expect(existsSync(fileOf(copyRow.providerKey))).toBe(true)
  })
})

describe('usage and cleanup', () => {
  it('reports usage with warnings (FR-014)', async () => {
    const res = await admin.get('/api/admin/usage')
    expect(res.status).toBe(200)
    expect(res.json.media).toMatchObject({ unit: 'bytes', warn: false })
    expect(res.json.media.limit).toBe(1024 ** 3)
    expect(res.json.database).toHaveProperty('usedBytes')
  })

  it('cron needs its bearer token', async () => {
    const anon = new Client(t.app)
    expect((await anon.get('/api/cron/cleanup')).status).toBe(401)
    expect((await anon.get('/api/cron/cleanup', { headers: { authorization: 'Bearer salah' } })).status).toBe(401)
  })

  it('cron removes stale pending uploads and retries queued deletions', async () => {
    const c = await newCouple()
    const ticket = await admin.post(`/api/admin/couples/${c.id}/media`, { kind: 'image', mime: 'image/webp', size: 5 })
    const pendingId = ticket.json.media.id
    await t.db.update(media).set({ createdAt: new Date(Date.now() - 25 * 3_600_000) }).where(eq(media.id, pendingId))
    await t.db.insert(mediaDeletions).values({ providerKey: 'wedding/test/gone/file', resourceType: 'image' })

    const res = await new Client(t.app).get('/api/cron/cleanup', { headers: { authorization: 'Bearer cron-test' } })
    expect(res.status).toBe(200)
    expect(res.json.deleted.pendingMedia).toBe(1)
    expect(res.json.deleted.mediaRetried).toBeGreaterThanOrEqual(1)
    expect(await rowOf(pendingId)).toBeUndefined()
    expect(await t.db.select().from(mediaDeletions)).toHaveLength(0)
  })
})
