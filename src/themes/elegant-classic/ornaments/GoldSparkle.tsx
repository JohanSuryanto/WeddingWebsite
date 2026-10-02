import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

const SPARKLES = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 29 + 7) % 100,
  top: (i * 41 + 11) % 100,
  delay: (i * 0.9) % 6,
  duration: 4 + (i % 3),
  size: 8 + ((i * 3) % 8),
}))

/** A few slowly twinkling gold stars. Renders nothing under reduced motion. */
export function GoldSparkle() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  return (
    <div
      aria-hidden="true"
      data-testid="ambient-effect"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden text-accent"
    >
      {SPARKLES.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 12 12"
          className="absolute opacity-0"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `ec-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          <path d="M6 0l1.2 4.8L12 6l-4.8 1.2L6 12l-1.2-4.8L0 6l4.8-1.2z" fill="currentColor" />
        </svg>
      ))}
    </div>
  )
}
