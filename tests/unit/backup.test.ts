// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import {
  BackupError,
  backupFileName,
  bundleFor,
  parseBackup,
  planKeepBoth,
  restoredSlug,
} from '../../src/data/backup'
import { collectMediaRefs, mediaRef } from '../../src/data/resolveMedia'

const bytes = new Uint8Array([1, 2, 3, 4, 5, 6])
const b64 = Buffer.from(bytes).toString('base64')

function v1File(overrides: Record<string, unknown> = {}) {
  const content = structuredClone(anisaRaka)
  content.cover.background = { src: mediaRef('m1'), width: 3, height: 2 }
  return {
    format: 'wedding-admin-backup',
    formatVersion: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    couples: [
      {
        id: 'c1',
        slug: 'satu',
        status: 'active',
        defaultTheme: 'rustic-garden',
        content,
        version: 3,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    media: [
      {
        id: 'm1',
        coupleId: 'c1',
        kind: 'image',
        mime: 'image/webp',
        size: bytes.length,
        width: 3,
        height: 2,
        createdAt: '2026-10-01T00:00:00.000Z',
        data: b64,
      },
    ],
    ...overrides,
  }
}

const asBlob = (doc: unknown) => new Blob([JSON.stringify(doc)], { type: 'application/json' })

describe('backup parsing', () => {
  it('reads 002 (v1) files: no passcodes, no responses', async () => {
    const parsed = await parseBackup(asBlob(v1File()))
    expect(parsed.formatVersion).toBe(1)
    expect(parsed.couples[0].passcode).toBeUndefined()
    expect(parsed.rsvps).toEqual([])
    expect(parsed.wishes).toEqual([])
    expect(parsed.totalBytes).toBe(bytes.length)
    expect(new Uint8Array(await parsed.media[0].blob.arrayBuffer())).toEqual(bytes)
  })

  it('reads v2 files with passcodes, RSVPs and wishes', async () => {
    const doc = v1File({
      formatVersion: 2,
      rsvps: [
        {
          id: 'r1',
          coupleId: 'c1',
          name: 'Pak Andi',
          attendance: 'hadir',
          guestCount: 2,
          submittedAt: '2026-10-02T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
      wishes: [
        {
          id: 'w1',
          coupleId: 'c1',
          name: 'Bu Rina',
          message: 'Selamat ya',
          attendance: null,
          hidden: true,
          createdAt: '2026-10-02T00:00:00.000Z',
        },
      ],
    })
    doc.couples[0] = { ...(doc.couples[0] as object), passcode: '0482' } as never
    const parsed = await parseBackup(asBlob(doc))
    expect(parsed.couples[0].passcode).toBe('0482')
    expect(parsed.rsvps[0].name).toBe('Pak Andi')
    expect(parsed.wishes[0].hidden).toBe(true)
  })

  it('rejects invalid files, naming the first problem', async () => {
    await expect(parseBackup(new Blob(['nope']))).rejects.toThrow('File cadangan tidak valid: bukan file JSON')
    await expect(parseBackup(asBlob({ ...v1File(), formatVersion: 3 }))).rejects.toThrow(
      'Versi file cadangan lebih baru',
    )
    const badSize = v1File()
    ;(badSize.media[0] as { size: number }).size = 99
    await expect(parseBackup(asBlob(badSize))).rejects.toThrow('ukuran tidak cocok')
    const badSlug = v1File()
    ;(badSlug.couples[0] as { slug: string }).slug = 'Bukan Slug'
    await expect(parseBackup(asBlob(badSlug))).rejects.toBeInstanceOf(BackupError)
  })

  it('accepts unfinished drafts (full content rules apply only when saving)', async () => {
    const doc = v1File()
    const c = doc.couples[0] as { status: string; content: { couple: { bride: { fullName: string } } } }
    c.status = 'draft'
    c.content.couple.bride.fullName = ''
    await expect(parseBackup(asBlob(doc))).resolves.toBeTruthy()
  })
})

describe('keep both', () => {
  it('gives the copy new ids, a free -pulihan address and rewritten refs', async () => {
    const parsed = await parseBackup(asBlob(v1File()))
    const original = bundleFor(parsed, 'c1')
    const copy = planKeepBoth(original, new Set(['satu', 'satu-pulihan']))
    expect(copy.couple.id).not.toBe('c1')
    expect(copy.couple.slug).toBe('satu-pulihan-2')
    expect(copy.media[0].id).not.toBe('m1')
    expect(copy.media[0].coupleId).toBe(copy.couple.id)
    expect([...collectMediaRefs(copy.couple.content)]).toEqual([copy.media[0].id])
    // The original is untouched.
    expect([...collectMediaRefs(original.couple.content)]).toEqual(['m1'])
  })

  it('keeps long addresses within 40 characters', () => {
    const slug = restoredSlug('a'.repeat(40), new Set())
    expect(slug.length).toBeLessThanOrEqual(40)
    expect(slug.endsWith('-pulihan')).toBe(true)
  })
})

describe('file names', () => {
  it('names files by date and time', () => {
    expect(backupFileName(new Date(2026, 9, 2, 8, 5))).toBe('undangan-backup-20261002-0805.json')
  })
})
