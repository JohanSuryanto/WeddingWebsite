import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'
import { Leaf, SAGE_COLORS } from './Botanicals'

const LEAVES = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 43 + 5) % 100,
  delay: (i * 1.7) % 14,
  duration: 13 + ((i * 5) % 8),
  size: 12 + ((i * 7) % 10),
  drift: (i % 2 ? 1 : -1) * (40 + ((i * 17) % 70)) + 'px',
  color: SAGE_COLORS[i % SAGE_COLORS.length],
}))

/** A few leaves drifting down. Renders nothing under reduced motion. */
export function FallingLeaves() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  return (
    <div
      aria-hidden="true"
      data-testid="ambient-effect"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="absolute -top-8 block"
          style={{
            left: `${l.left}%`,
            animation: `rg-leaf-fall ${l.duration}s linear ${l.delay}s infinite`,
            ['--drift' as string]: l.drift,
          }}
        >
          <Leaf color={l.color} size={l.size} />
        </span>
      ))}
    </div>
  )
}
