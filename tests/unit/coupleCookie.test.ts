// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { signCoupleToken, verifyCoupleToken } from '../../server/auth/coupleAccess'

const SECRET = 'secret-secret-secret-secret-secret-1'
const ID = '7d1f3f9e-0b6e-4b1a-9a43-2d7c5b0c1a11'
const now = Date.now()
const exp = now + 30 * 24 * 3600_000

describe('couple access token', () => {
  it('round-trips for the same couple, version and secret', () => {
    const token = signCoupleToken(SECRET, ID, 3, exp)
    expect(verifyCoupleToken(SECRET, token, ID, 3, now)).toBe(true)
  })

  it('rejects another secret, couple, version or an expired token', () => {
    const token = signCoupleToken(SECRET, ID, 3, exp)
    expect(verifyCoupleToken('other-secret-other-secret-other-1', token, ID, 3, now)).toBe(false)
    expect(verifyCoupleToken(SECRET, token, '00000000-0000-4000-8000-000000000000', 3, now)).toBe(false)
    expect(verifyCoupleToken(SECRET, token, ID, 4, now)).toBe(false)
    expect(verifyCoupleToken(SECRET, token, ID, 3, exp + 1)).toBe(false)
  })

  it('rejects tampered and malformed tokens', () => {
    const token = signCoupleToken(SECRET, ID, 3, exp)
    const [a, b, , sig] = token.split('.')
    const later = Buffer.from(String(exp + 1e9)).toString('base64url')
    expect(verifyCoupleToken(SECRET, [a, b, later, sig].join('.'), ID, 3, now)).toBe(false)
    for (const bad of ['', 'x', 'a.b.c', `${token}.extra`, token.slice(0, -2)]) {
      expect(verifyCoupleToken(SECRET, bad, ID, 3, now)).toBe(false)
    }
  })
})
