export interface AdminSession {
  email: string
  expiresAt: string
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email atau kata sandi salah')
    this.name = 'InvalidCredentialsError'
  }
}

export class LockedOutError extends Error {
  readonly retryAt: Date
  constructor(retryAt: Date) {
    super('Terlalu banyak percobaan.')
    this.name = 'LockedOutError'
    this.retryAt = retryAt
  }
}

/** Swap point for the backend phase (contracts/auth.md). */
export interface AuthService {
  /** Throws InvalidCredentialsError | LockedOutError. */
  login(email: string, password: string): Promise<AdminSession>
  logout(): Promise<void>
  /** null when absent or expired. */
  current(): AdminSession | null
  subscribe(listener: (session: AdminSession | null) => void): () => void
}
