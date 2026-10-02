import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import type { WeddingContent } from '../../src/content/types'
import { coupleSchema, firstContentProblem, weddingContentSchema } from '../../src/data/schema'

const base = (): WeddingContent => structuredClone(anisaRaka)

/** Messages of all issues for a mutated copy of the sample. */
function problems(mutate: (c: WeddingContent) => void): string[] {
  const c = base()
  mutate(c)
  const r = weddingContentSchema.safeParse(c)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

const img = { src: 'media:x', width: 10, height: 10 }

describe('weddingContentSchema', () => {
  it('accepts the sample', () => {
    expect(problems(() => {})).toEqual([])
  })

  it('requires nicknames of 1–30 characters', () => {
    expect(problems((c) => (c.couple.bride.nickname = ' '))).toContain('Nama panggilan wajib diisi')
    expect(problems((c) => (c.couple.bride.nickname = 'a'.repeat(30)))).toEqual([])
    expect(problems((c) => (c.couple.bride.nickname = 'a'.repeat(31)))).toContain(
      'Nama panggilan maksimal 30 karakter',
    )
  })

  it('requires full names and parents of 2–80 characters', () => {
    expect(problems((c) => (c.couple.groom.fullName = 'A'))).toContain('Nama lengkap 2–80 karakter')
    expect(problems((c) => (c.couple.groom.father = 'x'.repeat(81)))).toContain(
      'Nama ayah 2–80 karakter',
    )
    expect(problems((c) => (c.couple.groom.mother = 'Ib'))).toEqual([])
  })

  it('requires couple photos and the cover background', () => {
    expect(problems((c) => (c.couple.bride.photo = { ...img, src: '' }))).toContain(
      'Foto wajib diunggah',
    )
    expect(problems((c) => (c.cover.background = { ...img, src: ' ' }))).toContain(
      'Foto wajib diunggah',
    )
  })

  it('requires at least one event and exactly one main event', () => {
    expect(problems((c) => (c.events = []))).toContain('Minimal satu acara')
    expect(problems((c) => c.events.forEach((e) => (e.isMain = true)))).toContain(
      'Pilih tepat satu acara utama',
    )
    expect(problems((c) => c.events.forEach((e) => (e.isMain = false)))).toContain(
      'Pilih tepat satu acara utama',
    )
  })

  it('requires start with an Indonesian offset and end after start', () => {
    expect(problems((c) => (c.events[0].start = ''))).toContain('Tanggal & jam mulai wajib diisi')
    expect(problems((c) => (c.events[0].start = '2027-02-14T08:00:00+02:00'))).toContain(
      'Tanggal & jam mulai wajib diisi',
    )
    expect(problems((c) => (c.events[0].end = c.events[0].start))).toContain(
      'Jam selesai harus setelah jam mulai',
    )
    expect(problems((c) => (c.events[0].end = '2027-02-14T07:59:00+07:00'))).toContain(
      'Jam selesai harus setelah jam mulai',
    )
    expect(problems((c) => (c.events[0].end = null))).toEqual([])
  })

  it('accepts only https map links', () => {
    expect(problems((c) => (c.events[0].mapUrl = 'http://maps.google.com'))).toContain(
      'Link harus diawali https://',
    )
    expect(problems((c) => (c.events[0].mapUrl = ''))).toEqual([])
  })

  it('limits the gallery to 30 photos, each with a 1–150 character description', () => {
    const photo = { src: img, alt: 'Foto' }
    expect(problems((c) => (c.gallery = Array(30).fill(photo)))).toEqual([])
    expect(problems((c) => (c.gallery = Array(31).fill(photo)))).toContain('Maksimal 30 foto')
    expect(problems((c) => (c.gallery = [{ ...photo, alt: '  ' }]))).toContain(
      'Deskripsi foto wajib diisi',
    )
    expect(problems((c) => (c.gallery = [{ ...photo, alt: 'a'.repeat(150) }]))).toEqual([])
    expect(problems((c) => (c.gallery = [{ ...photo, alt: 'a'.repeat(151) }]))).toContain(
      'Deskripsi foto maksimal 150 karakter',
    )
  })

  it('allows only digits in account numbers, ignoring spaces and dashes', () => {
    expect(problems((c) => (c.gifts!.accounts[0].accountNumber = '1234 5678-90'))).toEqual([])
    expect(problems((c) => (c.gifts!.accounts[0].accountNumber = '12AB'))).toContain(
      'Nomor rekening hanya boleh angka',
    )
  })

  it('limits the share message to 2000 characters', () => {
    expect(problems((c) => (c.shareMessage = 'a'.repeat(2001)))).toContain(
      'Pesan maksimal 2000 karakter',
    )
  })

  it('reports the first problem', () => {
    const c = base()
    c.events = []
    expect(firstContentProblem(c)).toBe('Minimal satu acara')
    expect(firstContentProblem(base())).toBeNull()
  })
})

describe('coupleSchema', () => {
  const couple = () => ({
    id: 'x',
    slug: 'anisa-raka',
    status: 'active',
    defaultTheme: 'elegant-classic',
    content: base(),
    version: 1,
    createdAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  })

  it('accepts a valid couple', () => {
    expect(coupleSchema.safeParse(couple()).success).toBe(true)
  })

  it('rejects bad slugs, statuses, themes and versions', () => {
    expect(coupleSchema.safeParse({ ...couple(), slug: 'login' }).success).toBe(false)
    expect(coupleSchema.safeParse({ ...couple(), status: 'live' }).success).toBe(false)
    expect(coupleSchema.safeParse({ ...couple(), defaultTheme: 'neon' }).success).toBe(false)
    expect(coupleSchema.safeParse({ ...couple(), version: 0 }).success).toBe(false)
  })
})
