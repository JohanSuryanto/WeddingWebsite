import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 1.3) % 12,
  duration: 10 + ((i * 7) % 8),
  size: 10 + ((i * 5) % 10),
  drift: (i % 2 ? 1 : -1) * (30 + ((i * 13) % 60)) + 'px',
}))

/** Gently falling petals. Renders nothing when reduced motion is requested. */
export function PetalFall() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  return (
    <div
      aria-hidden="true"
      data-testid="ambient-effect"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute -top-8 block rounded-[60%_0_60%_0] bg-primary/70"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.8,
            animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
            ['--drift' as string]: p.drift,
          }}
        />
      ))}
    </div>
  )
}
