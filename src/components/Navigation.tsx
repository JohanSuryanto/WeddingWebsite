import type { ReactNode } from 'react'
import { useActiveSection } from '../hooks/useActiveSection'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
}

export function Navigation({ items }: { items: NavItem[] }) {
  const active = useActiveSection(items.map((i) => i.id))

  return (
    <nav aria-label="Navigasi bagian undangan">
      {/* Mobile: bottom bar */}
      <ul className="fixed inset-x-0 bottom-0 z-40 flex border-t border-primary/30 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgb(0_0_0/0.25)] backdrop-blur md:hidden">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id} className="min-w-0 flex-1">
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.6rem] leading-tight transition-colors ${
                  isActive ? 'font-semibold text-highlight-text' : 'text-muted'
                }`}
              >
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-highlight' : ''
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    {item.icon}
                  </svg>
                </span>
                <span className="max-w-full truncate font-sans tracking-tight max-[359px]:sr-only">
                  {item.label}
                </span>
              </a>
            </li>
          )
        })}
      </ul>

      {/* Desktop: top bar */}
      <ul className="fixed inset-x-0 top-0 z-40 hidden justify-center gap-1 border-b border-primary/30 bg-surface/90 px-4 py-2 backdrop-blur md:flex">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 font-heading text-lg transition-colors hover:bg-surface-alt ${
                  isActive ? 'bg-highlight font-semibold text-highlight-text' : 'text-muted'
                }`}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
