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

export { LockedOutError } from '../../data/types'

/** Swap point (contracts/auth.md); implemented by HttpAuthService. */
export interface AuthService {
  /** Throws InvalidCredentialsError | LockedOutError. */
  login(email: string, password: string): Promise<AdminSession>
  logout(): Promise<void>
  /** null when absent or expired. */
  current(): AdminSession | null
  subscribe(listener: (session: AdminSession | null) => void): () => void
  /** Loads the current session from the server once at startup. */
  init(): Promise<void>
}
