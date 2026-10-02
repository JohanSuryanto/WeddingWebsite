// @vitest-environment node
import 'fake-indexeddb/auto'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import {
  BackupError,
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
} from '../../src/data/backup'
import { openAdminDb } from '../../src/data/indexeddb/db'
import { IndexedDbCoupleRepository } from '../../src/data/indexeddb/IndexedDbCoupleRepository'
import { IndexedDbMediaStore } from '../../src/data/indexeddb/IndexedDbMediaStore'
import { mediaRef } from '../../src/data/resolveMedia'

let n = 0
function setup() {
  const db = openAdminDb(`backup-test-${++n}`)
  const media = new IndexedDbMediaStore(db)
  return { repo: new IndexedDbCoupleRepository(db, media), media }
}

async function seedTwo() {
  const { repo, media } = setup()
  const a = await repo.create({
    slug: 'satu',
    defaultTheme: 'rustic-garden',
    content: structuredClone(anisaRaka),
  })
  const bytes = new Uint8Array(70_000).map((_, i) => (i * 31) % 256)
  const m = await media.put(a.id, new Blob([bytes], { type: 'image/webp' }), {
    kind: 'image',
    width: 3,
    height: 2,
  })
  const content = structuredClone(anisaRaka)
  content.cover.background = { src: mediaRef(m.id), width: 3, height: 2 }
  await repo.update(a.id, { content }, 1)
  await repo.create({
    slug: 'dua',
    defaultTheme: 'elegant-classic',
    content: structuredClone(anisaRaka),
  })
  return { repo, media, mediaId: m.id, bytes }
}

describe('backup', () => {
  it('round-trips couples and media exactly (SC-008)', async () => {
    const src = await seedTwo()
    const file = await createBackup(src.repo, src.media)
    const parsed = await parseBackup(file)
    expect(parsed.couples).toHaveLength(2)

    const dst = setup()
    const result = await restoreBackup(parsed, 'replace', dst.repo)
    expect(result).toEqual({ restored: 2, skipped: [] })

    for (const s of await src.repo.list()) {
      const original = await src.repo.get(s.id)
      const copy = await dst.repo.get(s.id)
      expect(JSON.parse(JSON.stringify(copy))).toEqual(JSON.parse(JSON.stringify(original)))
      expect(copy.version).toBe(original.version)
    }
    const restored = await dst.media.getBlob(src.mediaId)
    expect(new Uint8Array(await restored!.arrayBuffer())).toEqual(src.bytes)
  })

  it('"add" skips couples whose slug already exists', async () => {
    const src = await seedTwo()
    const parsed = await parseBackup(await createBackup(src.repo, src.media))
    const dst = setup()
    await dst.repo.create({
      slug: 'satu',
      defaultTheme: 'rustic-garden',
      content: structuredClone(anisaRaka),
    })
    const result = await restoreBackup(parsed, 'add', dst.repo)
    expect(result).toEqual({ restored: 1, skipped: ['satu'] })
    expect((await dst.repo.list()).map((c) => c.slug).sort()).toEqual(['dua', 'satu'])
  })

  it('"replace" removes couples not in the file', async () => {
    const src = await seedTwo()
    const parsed = await parseBackup(await createBackup(src.repo, src.media))
    const dst = setup()
    await dst.repo.create({
      slug: 'lama',
      defaultTheme: 'rustic-garden',
      content: structuredClone(anisaRaka),
    })
    await restoreBackup(parsed, 'replace', dst.repo)
    expect((await dst.repo.list()).map((c) => c.slug).sort()).toEqual(['dua', 'satu'])
  })

  it('rejects invalid files without writing anything', async () => {
    const bad = async (data: unknown) =>
      parseBackup(new Blob([typeof data === 'string' ? data : JSON.stringify(data)]))
    await expect(bad('not json')).rejects.toBeInstanceOf(BackupError)
    await expect(bad({ format: 'other' })).rejects.toThrow('File cadangan tidak valid')

    const src = await seedTwo()
    const valid = JSON.parse(await (await createBackup(src.repo, src.media)).text())
    await expect(bad({ ...valid, formatVersion: 2 })).rejects.toThrow('lebih baru')
    const sizeMismatch = {
      ...valid,
      media: valid.media.map((m: { size: number }) => ({ ...m, size: m.size + 1 })),
    }
    await expect(bad(sizeMismatch)).rejects.toThrow('ukuran tidak cocok')
    const badCouple = { ...valid, couples: [{ ...valid.couples[0], slug: 'login' }] }
    await expect(bad(badCouple)).rejects.toBeInstanceOf(BackupError)
  })

  it('restores unfinished drafts (content rules apply only when saving)', async () => {
    const { emptyContent } = await import('../../src/data/emptyContent')
    const src = setup()
    await src.repo.create({
      slug: 'draf-baru',
      defaultTheme: 'rustic-garden',
      content: emptyContent('A', 'B'),
    })
    const parsed = await parseBackup(await createBackup(src.repo, src.media))
    const dst = setup()
    expect((await restoreBackup(parsed, 'replace', dst.repo)).restored).toBe(1)
    expect((await dst.repo.list())[0].slug).toBe('draf-baru')
  })

  it('names files by date and time', () => {
    expect(backupFileName(new Date(2026, 9, 2, 9, 5))).toBe('undangan-backup-20261002-0905.json')
  })
})
