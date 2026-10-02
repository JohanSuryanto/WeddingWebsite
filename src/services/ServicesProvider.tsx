import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { WeddingContent } from '../content/types'
import { createServicesFor, type InvitationServices } from './index'

const ServicesContext = createContext<InvitationServices | null>(null)

/** RSVP and wishes services for one couple's invitation. */
export function ServicesProvider({
  content,
  children,
}: {
  content: WeddingContent
  children: ReactNode
}) {
  const services = useMemo(() => createServicesFor(content), [content])
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServices(): InvitationServices {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices() must be used inside <ServicesProvider>')
  return services
}
