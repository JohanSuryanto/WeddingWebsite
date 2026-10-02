import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LocalAuthService } from './LocalAuthService'
import type { AdminSession, AuthService } from './types'

/** Swap point for the backend phase: replace with an HttpAuthService. */
// eslint-disable-next-line react-refresh/only-export-components
export const authService: AuthService = new LocalAuthService({
  email: import.meta.env.VITE_ADMIN_EMAIL,
  passwordHash: import.meta.env.VITE_ADMIN_PASSWORD_SHA256,
})

interface AuthContextValue {
  session: AdminSession | null
  login: AuthService['login']
  logout: AuthService['logout']
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => authService.current())
  useEffect(() => authService.subscribe(setSession), [])
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
