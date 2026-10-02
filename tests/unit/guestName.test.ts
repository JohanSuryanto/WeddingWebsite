import { GUEST_NAME_MAX, parseGuestName } from '../../src/lib/guestName'

describe('parseGuestName (?inv=)', () => {
  it('returns null when absent', () => {
    expect(parseGuestName('')).toBeNull()
    expect(parseGuestName('?t=2')).toBeNull()
  })

  it('returns null when empty', () => {
    expect(parseGuestName('?inv=')).toBeNull()
    expect(parseGuestName('?inv=%20%20')).toBeNull()
    expect(parseGuestName('?inv={}')).toBeNull()
  })

  it('decodes + and %20 as spaces', () => {
    expect(parseGuestName('?inv=Budi+Santoso')).toBe('Budi Santoso')
    expect(parseGuestName('?inv=Budi%20Santoso')).toBe('Budi Santoso')
  })

  it('keeps an encoded & in the name', () => {
    expect(parseGuestName('?inv=Johan%20%26%20Partner')).toBe('Johan & Partner')
  })

  it('keeps an unencoded & in the name', () => {
    expect(parseGuestName('?inv=Johan%20&%20Partner')).toBe('Johan & Partner')
    expect(parseGuestName('?inv=Johan+&+Partner')).toBe('Johan & Partner')
    expect(parseGuestName('?inv=Johan&Partner')).toBe('Johan&Partner')
  })

  it('stops at the next real parameter', () => {
    expect(parseGuestName('?inv=Johan%20&%20Partner&t=2')).toBe('Johan & Partner')
    expect(parseGuestName('?t=3&inv=Budi')).toBe('Budi')
    expect(parseGuestName('?inv=Budi&fbclid=abc123')).toBe('Budi')
  })

  it('strips placeholder braces', () => {
    expect(parseGuestName('?inv={Johan%20&%20Partner}')).toBe('Johan & Partner')
    expect(parseGuestName('?inv=%7BBudi%7D')).toBe('Budi')
  })

  it('trims and collapses whitespace', () => {
    expect(parseGuestName('?inv=%20%20Pak%20%20Andi%20')).toBe('Pak Andi')
  })

  it('removes control characters', () => {
    expect(parseGuestName('?inv=Andi%0A%09Wijaya')).toBe('Andi Wijaya')
  })

  it('survives malformed encoding', () => {
    expect(parseGuestName('?inv=Budi%E0%A4%A')).toBe('Budi%E0%A4%A')
  })

  it(`truncates to ${GUEST_NAME_MAX} characters`, () => {
    const long =
      'Keluarga Besar Bapak H. Muhammad Abdullah Syarifuddin dan Ibu Hj. Siti Aminah beserta keluarga'
    const result = parseGuestName(`?inv=${encodeURIComponent(long)}`)!
    expect(result.length).toBeLessThanOrEqual(GUEST_NAME_MAX)
    expect(long.startsWith(result)).toBe(true)
  })

  it('keeps markup as literal text', () => {
    expect(parseGuestName('?inv=%3Cscript%3Ealert(1)%3C%2Fscript%3E')).toBe(
      '<script>alert(1)</script>',
    )
  })

  it('no longer reads the old ?to= parameter', () => {
    expect(parseGuestName('?to=Budi')).toBeNull()
  })
})
