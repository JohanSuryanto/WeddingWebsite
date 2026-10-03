import { createMemoryRsvpService, createMemoryWishService } from '../../src/services/memory'
import { ValidationError } from '../../src/services/types'
import type { Wish } from '../../src/content/types'

const seed: Wish[] = [
  { id: 'old', name: 'Lama', message: 'Pesan lama', createdAt: new Date('2026-01-01') },
  { id: 'new', name: 'Baru', message: 'Pesan baru', createdAt: new Date('2026-06-01') },
]

describe('memory RSVP service', () => {
  it('returns a response and forces guestCount 0 when not attending', async () => {
    const svc = createMemoryRsvpService(0)
    const res = await svc.submit({ name: ' Budi ', attendance: 'tidak_hadir', guestCount: 3 })
    expect(res).toMatchObject({ name: 'Budi', attendance: 'tidak_hadir', guestCount: 0 })
    expect(res.submittedAt).toBeInstanceOf(Date)
  })

  it('rejects with ValidationError carrying field errors', async () => {
    const svc = createMemoryRsvpService(0)
    const err = await svc.submit({ name: '', attendance: '', guestCount: 1 }).catch((e) => e)
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.fieldErrors).toEqual({
      name: 'Nama wajib diisi',
      attendance: 'Silakan pilih konfirmasi kehadiran',
    })
  })
})

describe('memory wish service', () => {
  it('lists seed wishes newest first', async () => {
    const svc = createMemoryWishService(seed, 0)
    expect((await svc.list()).items.map((w) => w.id)).toEqual(['new', 'old'])
  })

  it('prepends a submitted wish', async () => {
    const svc = createMemoryWishService(seed, 0)
    const wish = await svc.submit({ name: 'Andi', message: 'Selamat ya!', attendance: 'hadir' })
    const { items: list } = await svc.list()
    expect(list[0]).toEqual(wish)
    expect(list).toHaveLength(3)
  })

  it('does not share state between instances (nothing persisted)', async () => {
    const a = createMemoryWishService(seed, 0)
    await a.submit({ name: 'Andi', message: 'Selamat ya!' })
    const b = createMemoryWishService(seed, 0)
    expect((await b.list()).items).toHaveLength(2)
    expect(localStorage.length).toBe(0)
  })

  it('rejects invalid wishes', async () => {
    const svc = createMemoryWishService([], 0)
    await expect(svc.submit({ name: 'Andi', message: 'a' })).rejects.toBeInstanceOf(ValidationError)
  })
})
