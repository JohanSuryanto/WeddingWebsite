import { buildInviteUrl } from '../../src/lib/inviteLink'
import { GUEST_NAME_MAX, guestCodeOf, parseGuestCode, parseGuestName } from '../../src/lib/guestName'

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

describe('guest link code (?g=)', () => {
  it('is the first 8 characters of the guest id, read back from the link', () => {
    const id = 'A1B2C3D4-0000-4000-8000-000000000000'
    const url = buildInviteUrl('https://x.test/anisa-raka', 'Johan & Partner', '2', guestCodeOf(id))
    expect(url).toBe('https://x.test/anisa-raka?inv=Johan+%26+Partner&t=2&g=a1b2c3d4')
    const search = new URL(url).search
    expect(parseGuestCode(search)).toBe('a1b2c3d4')
    expect(parseGuestName(search)).toBe('Johan & Partner')
    // A raw "&" in the name still stops before g=.
    expect(parseGuestName('?inv=Johan & Partner&t=2&g=a1b2c3d4')).toBe('Johan & Partner')
  })

  it('is null when missing or malformed', () => {
    expect(parseGuestCode('?inv=Budi&t=1')).toBeNull()
    expect(parseGuestCode('?g=xyz')).toBeNull()
    expect(parseGuestCode('?g=a1b2c3d4e5')).toBeNull()
  })
})
