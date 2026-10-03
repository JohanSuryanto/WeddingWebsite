// scrypt password hashes (research R6): scrypt$N$r$p$saltB64$hashB64
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const N = 2 ** 15
const R = 8
const P = 1
const KEY_LEN = 32
const MAXMEM = 64 * 1024 * 1024

function scrypt(password: string, salt: Buffer, keyLen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keyLen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LEN, { N, r: R, p: P, maxmem: MAXMEM })
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

/** False for a wrong password or a malformed hash; never throws for bad input. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [n, r, p] = parts.slice(1, 4).map(Number)
  if (![n, r, p].every((x) => Number.isInteger(x) && x > 0)) return false
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  if (!salt.length || !expected.length) return false
  try {
    const key = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: MAXMEM })
    return timingSafeEqual(key, expected)
  } catch {
    return false
  }
}

let dummy: Promise<string> | undefined
/** A real hash to verify against when the email is wrong, so timing doesn't reveal valid emails. */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(16).toString('hex'))
  return dummy
}
