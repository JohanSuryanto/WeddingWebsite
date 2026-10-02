import { useId } from 'react'

const SAGE = ['#8FA382', '#A9BA9C', '#6F8663', '#B8C7AB']

/** Watercolor-style eucalyptus branch: a curved stem with round leaves. */
export function Eucalyptus({
  width = 160,
  className,
  flip = false,
}: {
  width?: number
  className?: string
  flip?: boolean
}) {
  const id = useId()
  const leaves = [
    [30, 70, 13],
    [48, 52, 15],
    [70, 44, 14],
    [92, 34, 16],
    [116, 30, 13],
    [138, 22, 11],
    [40, 86, 11],
    [62, 68, 12],
    [84, 58, 12],
    [106, 50, 11],
    [128, 42, 9],
  ]
  return (
    <svg
      viewBox="0 0 170 110"
      width={width}
      height={(width * 110) / 170}
      className={className}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-l`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M8 104 C40 80 70 60 160 18"
        stroke="#7A6A55"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {leaves.map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill={SAGE[i % SAGE.length]} fillOpacity="0.78" />
          <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-l)`} />
        </g>
      ))}
    </svg>
  )
}

/** Slim fern/olive sprig with paired pointed leaves. */
export function Sprig({ width = 90, className }: { width?: number; className?: string }) {
  const pairs = [18, 32, 46, 60, 74]
  return (
    <svg
      viewBox="0 0 100 40"
      width={width}
      height={(width * 40) / 100}
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20 H96" stroke="#7A6A55" strokeWidth="1.2" strokeLinecap="round" />
      {pairs.map((x, i) => (
        <g key={x} fill={SAGE[i % SAGE.length]} fillOpacity="0.85">
          <path d={`M${x} 20 q6 -12 14 -12 q-4 10 -14 12z`} />
          <path d={`M${x} 20 q6 12 14 12 q-4 -10 -14 -12z`} />
        </g>
      ))}
      <path d="M86 20 q6 -6 10 0 q-4 6 -10 0z" fill={SAGE[2]} />
    </svg>
  )
}

/** Single leaf used for the falling-leaves effect and small accents. */
export function Leaf({ color = SAGE[0], size = 14 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path d="M2 18 C2 8 8 2 18 2 C18 12 12 18 2 18Z" fill={color} fillOpacity="0.85" />
      <path d="M3 17 L16 4" stroke="#6F8663" strokeWidth="0.8" />
    </svg>
  )
}

export const SAGE_COLORS = SAGE
