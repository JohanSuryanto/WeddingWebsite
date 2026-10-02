import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { parseGuestName } from '../lib/guestName'

/** undefined = read ?inv= from the address bar; string/null = use this value. */
const GuestNameOverride = createContext<string | null | undefined>(undefined)

/** Sets the guest name explicitly (used by the admin live preview). */
export function GuestNameProvider({
  name,
  children,
}: {
  name: string | null
  children: ReactNode
}) {
  return <GuestNameOverride.Provider value={name}>{children}</GuestNameOverride.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGuestName(): string | null {
  const override = useContext(GuestNameOverride)
  const fromUrl = useMemo(() => parseGuestName(window.location.search), [])
  if (override !== undefined) return override?.trim() || null
  return fromUrl
}
