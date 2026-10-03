import { apiFetch, onUnauthorized } from '../../data/http/client'
import { SessionExpiredError } from '../../data/types'
import { InvalidCredentialsError, type AdminSession, type AuthService } from './types'

type Listener = (s: AdminSession | null) => void
type Message = { type: 'login'; session: AdminSession } | { type: 'logout' }

/**
 * Admin login against the server (contracts/auth.md). The session itself is an
 * HttpOnly cookie the page can't read; this keeps a cached copy for the UI.
 */
export class HttpAuthService implements AuthService {
  private session: AdminSession | null = null
  /** True after "Keluar" (here or in another tab), so the guard skips ?next=. */
  loggedOut = false
  private listeners = new Set<Listener>()
  private expiredListeners = new Set<() => void>()
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('admin-auth')

  constructor() {
    this.channel?.addEventListener('message', (e: MessageEvent<Message>) => {
      this.loggedOut = e.data.type === 'logout'
      this.set(e.data.type === 'login' ? e.data.session : null, false)
    })
    // Any admin call answered with 401 means the session is gone. The cached session
    // is kept so the page (and unsaved edits) stays put; the re-login dialog opens
    // instead of a redirect to /login (US2-4).
    onUnauthorized(() => {
      if (this.session) this.expiredListeners.forEach((l) => l())
    })
  }

  private set(session: AdminSession | null, broadcast: boolean) {
    this.session = session
    this.listeners.forEach((l) => l(session))
    if (broadcast) this.channel?.postMessage((session ? { type: 'login', session } : { type: 'logout' }) satisfies Message)
  }

  async init(): Promise<void> {
    try {
      const { session } = await apiFetch<{ session: AdminSession | null }>('/admin/session')
      this.set(session, false)
    } catch {
      this.set(null, false)
    }
  }

  async login(email: string, password: string): Promise<AdminSession> {
    try {
      const { session } = await apiFetch<{ session: AdminSession }>('/admin/login', {
        method: 'POST',
        body: { email, password },
      })
      this.loggedOut = false
      this.set(session, true)
      return session
    } catch (err) {
      // 401 from /admin/login means wrong credentials; 423 stays a LockedOutError.
      if (err instanceof SessionExpiredError) throw new InvalidCredentialsError()
      throw err
    }
  }

  async logout(): Promise<void> {
    try {
      await apiFetch('/admin/logout', { method: 'POST' })
    } finally {
      this.loggedOut = true
      this.set(null, true)
    }
  }

  /** The cached session. When it has expired, the next API call answers 401 and the re-login dialog opens. */
  current(): AdminSession | null {
    return this.session
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Called when the session ends while the admin is working (re-login dialog, US2-4). */
  onExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener)
    return () => this.expiredListeners.delete(listener)
  }
}
