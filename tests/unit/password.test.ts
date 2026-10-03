// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../../server/auth/password'

describe('scrypt passwords', () => {
  it('round-trips and rejects wrong passwords', async () => {
    const hash = await hashPassword('rahasia123')
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(await verifyPassword('rahasia123', hash)).toBe(true)
    expect(await verifyPassword('rahasia124', hash)).toBe(false)
  })

  it('salts every hash', async () => {
    expect(await hashPassword('x')).not.toBe(await hashPassword('x'))
  })

  it('returns false for malformed hashes instead of throwing', async () => {
    for (const bad of ['', 'abc', 'scrypt$1$2$3$4', 'bcrypt$a$b$c$d$e', 'scrypt$x$8$1$AAAA$AAAA', 'scrypt$32768$8$1$$']) {
      expect(await verifyPassword('x', bad)).toBe(false)
    }
  })
})
