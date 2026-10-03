import { describe, expect, it } from 'vitest'
import { isValidPasscode, PASSCODE_PATTERN, randomPasscode } from '../../src/data/passcode'

describe('passcode', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPasscode('0000')).toBe(true)
    expect(isValidPasscode('4821')).toBe(true)
    for (const bad of ['', '123', '12345', '12a4', ' 123', '١٢٣٤']) expect(isValidPasscode(bad)).toBe(false)
  })

  it('generates valid, varied codes', () => {
    const codes = Array.from({ length: 1000 }, randomPasscode)
    expect(codes.every((c) => PASSCODE_PATTERN.test(c))).toBe(true)
    // Leading zeros are kept and every first digit shows up.
    expect(new Set(codes.map((c) => c[0])).size).toBe(10)
    expect(new Set(codes).size).toBeGreaterThan(900)
  })
})
