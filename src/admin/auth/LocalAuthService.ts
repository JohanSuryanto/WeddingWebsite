import {
  InvalidCredentialsError,
  LockedOutError,
  type AdminSession,
  type AuthService,
} from './types'

export const SESSION_KEY = 'admin.session'
export const LOCKOUT_KEY = 'admin.lockout'
export const SESSION_HOURS = 12
export const MAX_FAILURES = 5
export const LOCKOUT_MS = 60_000

interface Lockout {
  failures: number
  lockedUntil: number | null
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Blocked storage: the session simply won't persist.
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Frontend-only login (contracts/auth.md). NOT real security: the hash and the
 * check live in the browser. It only gates the screens until the backend exists.
 */
export class LocalAuthService implements AuthService {
  private readonly email: string
  private readonly passwordHash: string
  private readonly now: () => number
  private listeners = new Set<(s: AdminSession | null) => void>()

  constructor(opts: { email?: string; passwordHash?: string; now?: () => number } = {}) {
    this.email = (opts.email ?? '').trim().toLowerCase()
    this.passwordHash = (opts.passwordHash ?? '').trim().toLowerCase()
    this.now = opts.now ?? Date.now
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === SESSION_KEY) this.emit()
      })
    }
  }

  private emit() {
    const s = this.current()
    this.listeners.forEach((l) => l(s))
  }

  async login(email: string, password: string): Promise<AdminSession> {
    if (!this.email || !this.passwordHash) {
      throw new Error('Login belum dikonfigurasi (lihat .env.example)')
    }
    const lock = read<Lockout>(LOCKOUT_KEY) ?? { failures: 0, lockedUntil: null }
    if (lock.lockedUntil && lock.lockedUntil > this.now()) {
      throw new LockedOutError(new Date(lock.lockedUntil))
    }

    const ok =
      email.trim().toLowerCase() === this.email && (await sha256Hex(password)) === this.passwordHash
    if (!ok) {
      const failures = (lock.lockedUntil ? 0 : lock.failures) + 1
      if (failures >= MAX_FAILURES) {
        const until = this.now() + LOCKOUT_MS
        write(LOCKOUT_KEY, { failures: 0, lockedUntil: until })
        throw new LockedOutError(new Date(until))
      }
      write(LOCKOUT_KEY, { failures, lockedUntil: null })
      throw new InvalidCredentialsError()
    }

    write(LOCKOUT_KEY, null)
    const session: AdminSession = {
      email: this.email,
      expiresAt: new Date(this.now() + SESSION_HOURS * 3600_000).toISOString(),
    }
    write(SESSION_KEY, session)
    this.emit()
    return session
  }

  async logout(): Promise<void> {
    write(SESSION_KEY, null)
    this.emit()
  }

  current(): AdminSession | null {
    const s = read<AdminSession>(SESSION_KEY)
    if (!s) return null
    if (Date.parse(s.expiresAt) <= this.now() || s.email !== this.email) {
      write(SESSION_KEY, null)
      return null
    }
    return s
  }

  subscribe(listener: (s: AdminSession | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
