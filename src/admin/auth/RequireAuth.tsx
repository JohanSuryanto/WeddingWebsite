import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { authService, useAuth } from './AuthProvider'

/** Sends logged-out visitors to /login?next=<where they wanted to go>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { pathname, search } = useLocation()
  if (!session) {
    // After "Keluar" go to a plain /login; otherwise come back here after logging in.
    if (authService.loggedOut) return <Navigate to="/login" replace />
    return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />
  }
  return children
}
