// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { webcrypto } from 'node:crypto'
import {
  LOCKOUT_MS,
  LocalAuthService,
  SESSION_HOURS,
  sha256Hex,
} from '../../src/admin/auth/LocalAuthService'
import { InvalidCredentialsError, LockedOutError } from '../../src/admin/auth/types'

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}

const PASSWORD = 'rahasia123'
const HASH = createHash('sha256').update(PASSWORD).digest('hex')

function service(clock = { t: Date.parse('2026-10-02T10:00:00Z') }) {
  const auth = new LocalAuthService({
    email: 'Admin@Test.Local',
    passwordHash: HASH,
    now: () => clock.t,
  })
  return { auth, clock }
}

beforeEach(() => localStorage.clear())

describe('LocalAuthService', () => {
  it('hashes like the hash-password script', async () => {
    expect(await sha256Hex(PASSWORD)).toBe(HASH)
  })

  it('logs in with the right credentials (email case-insensitive)', async () => {
    const { auth } = service()
    const s = await auth.login('  admin@test.LOCAL ', PASSWORD)
    expect(s.email).toBe('admin@test.local')
    expect(auth.current()).toEqual(s)
  })

  it('rejects a wrong password or email', async () => {
    const { auth } = service()
    await expect(auth.login('admin@test.local', 'salah')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    )
    await expect(auth.login('lain@test.local', PASSWORD)).rejects.toThrow(
      'Email atau kata sandi salah',
    )
    expect(auth.current()).toBeNull()
  })

  it('locks login for 60 s after 5 failures, even for the right password', async () => {
    const { auth, clock } = service()
    for (let i = 0; i < 4; i++) {
      await expect(auth.login('admin@test.local', 'x')).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      )
    }
    const fifth = await auth.login('admin@test.local', 'x').catch((e) => e)
    expect(fifth).toBeInstanceOf(LockedOutError)
    expect((fifth as LockedOutError).retryAt.getTime()).toBe(clock.t + LOCKOUT_MS)

    await expect(auth.login('admin@test.local', PASSWORD)).rejects.toBeInstanceOf(LockedOutError)
    clock.t += LOCKOUT_MS
    await expect(auth.login('admin@test.local', PASSWORD)).resolves.toBeTruthy()
  })

  it('resets the failure count after a successful login', async () => {
    const { auth } = service()
    for (let i = 0; i < 4; i++) await auth.login('admin@test.local', 'x').catch(() => {})
    await auth.login('admin@test.local', PASSWORD)
    await expect(auth.login('admin@test.local', 'x')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    )
  })

  it(`expires the session after ${SESSION_HOURS} hours`, async () => {
    const { auth, clock } = service()
    await auth.login('admin@test.local', PASSWORD)
    clock.t += SESSION_HOURS * 3600_000 - 1
    expect(auth.current()).not.toBeNull()
    clock.t += 1
    expect(auth.current()).toBeNull()
  })

  it('logs out and notifies subscribers', async () => {
    const { auth } = service()
    const seen: unknown[] = []
    auth.subscribe((s) => seen.push(s))
    await auth.login('admin@test.local', PASSWORD)
    await auth.logout()
    expect(auth.current()).toBeNull()
    expect(seen.at(-1)).toBeNull()
    expect(seen).toHaveLength(2)
  })

  it('explains when login is not configured', async () => {
    const auth = new LocalAuthService({})
    await expect(auth.login('a@b.c', 'x')).rejects.toThrow('Login belum dikonfigurasi')
  })
})
