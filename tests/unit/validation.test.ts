import { validateRsvp, validateWish } from '../../src/lib/validation'

const rsvp = { name: 'Budi', attendance: 'hadir' as const, guestCount: 2 }
const wish = { name: 'Budi', message: 'Selamat!' }

describe('validateRsvp', () => {
  it('accepts a valid response', () => {
    expect(validateRsvp(rsvp)).toEqual({})
  })

  it('requires a name of 2–60 characters', () => {
    expect(validateRsvp({ ...rsvp, name: '   ' }).name).toBe('Nama wajib diisi')
    expect(validateRsvp({ ...rsvp, name: 'A' }).name).toBe('Nama 2–60 karakter')
    expect(validateRsvp({ ...rsvp, name: 'AB' }).name).toBeUndefined()
    expect(validateRsvp({ ...rsvp, name: 'A'.repeat(60) }).name).toBeUndefined()
    expect(validateRsvp({ ...rsvp, name: 'A'.repeat(61) }).name).toBe('Nama 2–60 karakter')
  })

  it('requires an attendance choice', () => {
    expect(validateRsvp({ ...rsvp, attendance: '' }).attendance).toBe(
      'Silakan pilih konfirmasi kehadiran',
    )
  })

  it('requires 1–5 guests when attending', () => {
    for (const n of [0, 6, 1.5]) {
      expect(validateRsvp({ ...rsvp, guestCount: n }).guestCount).toBe('Jumlah tamu 1–5 orang')
    }
    for (const n of [1, 5]) expect(validateRsvp({ ...rsvp, guestCount: n })).toEqual({})
  })

  it('ignores guest count when not attending', () => {
    expect(validateRsvp({ ...rsvp, attendance: 'tidak_hadir', guestCount: 0 })).toEqual({})
  })
})

describe('validateWish', () => {
  it('accepts a valid wish', () => {
    expect(validateWish(wish)).toEqual({})
  })

  it('requires a message of 3–500 characters', () => {
    expect(validateWish({ ...wish, message: '' }).message).toBe('Ucapan wajib diisi')
    expect(validateWish({ ...wish, message: 'ab' }).message).toBe('Ucapan minimal 3 karakter')
    expect(validateWish({ ...wish, message: 'abc' }).message).toBeUndefined()
    expect(validateWish({ ...wish, message: 'a'.repeat(500) }).message).toBeUndefined()
    expect(validateWish({ ...wish, message: 'a'.repeat(501) }).message).toBe(
      'Ucapan maksimal 500 karakter',
    )
  })

  it('requires a name', () => {
    expect(validateWish({ ...wish, name: '' }).name).toBe('Nama wajib diisi')
  })
})
