import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

/** Sends logged-out visitors to /login?next=<where they wanted to go>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { pathname, search } = useLocation()
  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />
  }
  return children
}
