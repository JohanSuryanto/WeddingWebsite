// @vitest-environment node
import 'fake-indexeddb/auto'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import type { WeddingContent } from '../../src/content/types'
import { openAdminDb } from '../../src/data/indexeddb/db'
import { IndexedDbCoupleRepository } from '../../src/data/indexeddb/IndexedDbCoupleRepository'
import { IndexedDbMediaStore } from '../../src/data/indexeddb/IndexedDbMediaStore'
import { seedIfEmpty } from '../../src/data/indexeddb/seed'
import { collectMediaRefs, isMediaRef, mediaId, mediaRef } from '../../src/data/resolveMedia'
import { ConflictError, NotFoundError, SlugTakenError } from '../../src/data/types'

let dbCounter = 0
function setup() {
  const db = openAdminDb(`test-${++dbCounter}`)
  const media = new IndexedDbMediaStore(db)
  const repo = new IndexedDbCoupleRepository(db, media)
  return { repo, media }
}

const content = (): WeddingContent => structuredClone(anisaRaka)
const blob = (text: string) => new Blob([text], { type: 'image/webp' })

describe('IndexedDbCoupleRepository', () => {
  it('creates drafts with version 1 and timestamps', async () => {
    const { repo } = setup()
    const c = await repo.create({
      slug: 'budi-sari',
      defaultTheme: 'rustic-garden',
      content: content(),
    })
    expect(c).toMatchObject({ slug: 'budi-sari', status: 'draft', version: 1 })
    expect(c.createdAt).toBe(c.updatedAt)
    expect(await repo.get(c.id)).toEqual(c)
    expect((await repo.list()).map((s) => s.slug)).toEqual(['budi-sari'])
  })

  it('rejects duplicate and reserved slugs', async () => {
    const { repo } = setup()
    await repo.create({ slug: 'budi-sari', defaultTheme: 'rustic-garden', content: content() })
    await expect(
      repo.create({ slug: 'budi-sari', defaultTheme: 'rustic-garden', content: content() }),
    ).rejects.toBeInstanceOf(SlugTakenError)
    await expect(
      repo.create({ slug: 'login', defaultTheme: 'rustic-garden', content: content() }),
    ).rejects.toBeInstanceOf(SlugTakenError)
  })

  it('updates with the expected version and rejects stale versions without changes', async () => {
    const { repo } = setup()
    const c = await repo.create({ slug: 'abc', defaultTheme: 'rustic-garden', content: content() })
    const updated = await repo.update(c.id, { defaultTheme: 'elegant-classic' }, 1)
    expect(updated.version).toBe(2)
    await expect(repo.update(c.id, { defaultTheme: 'romantic-floral' }, 1)).rejects.toBeInstanceOf(
      ConflictError,
    )
    expect((await repo.get(c.id)).defaultTheme).toBe('elegant-classic')
  })

  it('rejects renaming to a slug another couple uses', async () => {
    const { repo } = setup()
    await repo.create({ slug: 'satu', defaultTheme: 'rustic-garden', content: content() })
    const b = await repo.create({ slug: 'dua', defaultTheme: 'rustic-garden', content: content() })
    await expect(repo.update(b.id, { slug: 'satu' }, 1)).rejects.toBeInstanceOf(SlugTakenError)
  })

  it('finds by slug, hiding drafts unless asked', async () => {
    const { repo } = setup()
    const c = await repo.create({ slug: 'abc', defaultTheme: 'rustic-garden', content: content() })
    expect(await repo.findBySlug('abc')).toBeNull()
    expect((await repo.findBySlug('abc', { includeDrafts: true }))?.id).toBe(c.id)
    await repo.setStatus(c.id, 'active')
    expect((await repo.findBySlug('abc'))?.status).toBe('active')
  })

  it('removes the couple and all of its media', async () => {
    const { repo, media } = setup()
    const c = await repo.create({ slug: 'abc', defaultTheme: 'rustic-garden', content: content() })
    const m = await media.put(c.id, blob('x'), { kind: 'image', width: 1, height: 1 })
    await repo.remove(c.id)
    await expect(repo.get(c.id)).rejects.toBeInstanceOf(NotFoundError)
    expect(await media.getBlob(m.id)).toBeNull()
  })

  it('deletes media no longer referenced after a save', async () => {
    const { repo, media } = setup()
    const c = await repo.create({ slug: 'abc', defaultTheme: 'rustic-garden', content: content() })
    const keep = await media.put(c.id, blob('keep'), { kind: 'image', width: 1, height: 1 })
    const drop = await media.put(c.id, blob('drop'), { kind: 'image', width: 1, height: 1 })
    const next = content()
    next.cover.background = { src: mediaRef(keep.id), width: 1, height: 1 }
    await repo.update(c.id, { content: next }, 1)
    expect(await media.getBlob(keep.id)).not.toBeNull()
    expect(await media.getBlob(drop.id)).toBeNull()
  })

  it('duplicates as a draft with copied media and a unique slug', async () => {
    const { repo, media } = setup()
    const c = await repo.create({
      slug: 'budi-sari',
      defaultTheme: 'rustic-garden',
      content: content(),
    })
    const m = await media.put(c.id, blob('cover'), { kind: 'image', width: 1, height: 1 })
    const withMedia = content()
    withMedia.cover.background = { src: mediaRef(m.id), width: 1, height: 1 }
    await repo.update(c.id, { content: withMedia }, 1)
    await repo.setStatus(c.id, 'active')

    const copy = await repo.duplicate(c.id)
    expect(copy).toMatchObject({ slug: 'budi-sari-salinan', status: 'draft', version: 1 })
    const ref = copy.content.cover.background.src
    expect(isMediaRef(ref) && mediaId(ref)).not.toBe(m.id)
    expect(await (await media.getBlob(mediaId(ref)))!.text()).toBe('cover')
    expect((await repo.duplicate(c.id)).slug).toBe('budi-sari-salinan-2')

    // Deleting the copy keeps the original's media.
    await repo.remove(copy.id)
    expect(await media.getBlob(m.id)).not.toBeNull()
  })
})

describe('seedIfEmpty', () => {
  it('copies the sample couple once, with its media stored', async () => {
    const { repo, media } = setup()
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: string) =>
      new Response(new Blob([String(url)], { type: 'image/webp' }))) as typeof fetch
    try {
      await seedIfEmpty(repo, media)
      await seedIfEmpty(repo, media)
    } finally {
      globalThis.fetch = realFetch
    }
    const list = await repo.list()
    expect(list).toHaveLength(1)
    const sample = await repo.get(list[0].id)
    expect(sample).toMatchObject({ slug: 'anisa-raka', status: 'active' })
    const refs = collectMediaRefs(sample.content)
    expect(refs.size).toBeGreaterThan(10)
    for (const id of refs) expect(await media.getBlob(id)).not.toBeNull()
  })
})
