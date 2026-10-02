import type { ReactNode } from 'react'
import { useReveal } from '../hooks/useReveal'
import { useTheme } from '../themes'

interface Props {
  id: string
  title: string
  subtitle?: string
  variant?: 'default' | 'alt'
  children: ReactNode
}

export function SectionShell({ id, title, subtitle, variant = 'default', children }: Props) {
  const { ornaments } = useTheme()
  const { SectionDivider, CornerTopLeft, CornerBottomRight } = ornaments
  const ref = useReveal<HTMLDivElement>()
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative overflow-hidden px-4 py-16 sm:px-6 md:py-24 ${
        variant === 'alt' ? 'bg-surface-alt' : 'bg-bg'
      }`}
    >
      {CornerTopLeft && <CornerTopLeft />}
      {CornerBottomRight && <CornerBottomRight />}
      <div ref={ref} className="reveal relative z-[1] mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <h2 id={`${id}-title`} className="text-3xl text-text sm:text-4xl">
            {title}
          </h2>
          <SectionDivider />
          {subtitle && <p className="mx-auto max-w-2xl text-muted">{subtitle}</p>}
        </header>
        {children}
      </div>
    </section>
  )
}
