import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { HttpAuthService } from './HttpAuthService'
import type { AdminSession, AuthService } from './types'

/** Server-checked login (contracts/auth.md). */
// eslint-disable-next-line react-refresh/only-export-components
export const authService = new HttpAuthService() satisfies AuthService

interface AuthContextValue {
  session: AdminSession | null
  login: AuthService['login']
  logout: AuthService['logout']
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => authService.current())
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const off = authService.subscribe(setSession)
    authService.init().then(() => setReady(true))
    return off
  }, [])
  // Wait for the server's answer before any route decides login vs dashboard.
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
        <p className="text-muted">Memuat…</p>
      </div>
    )
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        login: (e, p) => authService.login(e, p),
        logout: () => authService.logout(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>')
  return ctx
}

/** Only same-site paths are allowed as a post-login destination. */
// eslint-disable-next-line react-refresh/only-export-components
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}
