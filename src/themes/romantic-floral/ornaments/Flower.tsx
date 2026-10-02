import { useId } from 'react'

/** Watercolor-style five-petal flower drawn in SVG. */
export function Flower({
  size = 80,
  hue = 'rose',
  className,
}: {
  size?: number
  hue?: 'rose' | 'blush' | 'mauve'
  className?: string
}) {
  const id = useId()
  const colors = {
    rose: ['#F3C6CF', '#D8A7B1'],
    blush: ['#FCE8EA', '#EDBFC7'],
    mauve: ['#E6CBD6', '#9E7A8C'],
  }[hue]
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-p`} cx="50%" cy="80%" r="80%">
          <stop offset="0%" stopColor={colors[1]} stopOpacity="0.95" />
          <stop offset="100%" stopColor={colors[0]} stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id={`${id}-c`}>
          <stop offset="0%" stopColor="#E8C98F" />
          <stop offset="100%" stopColor="#C9A66B" />
        </radialGradient>
      </defs>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx="50"
          cy="28"
          rx="17"
          ry="24"
          fill={`url(#${id}-p)`}
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="9" fill={`url(#${id}-c)`} />
    </svg>
  )
}

export function Leaf({
  size = 60,
  className,
  rotate = 0,
}: {
  size?: number
  className?: string
  rotate?: number
}) {
  return (
    <svg
      viewBox="0 0 60 30"
      width={size}
      height={size / 2}
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path d="M2 15 Q30 -6 58 15 Q30 36 2 15Z" fill="#B7C4AE" fillOpacity="0.75" />
      <path d="M4 15 H56" stroke="#8FA285" strokeWidth="1" strokeOpacity="0.7" />
    </svg>
  )
}
