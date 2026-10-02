import { SAGE_COLORS } from './Botanicals'

/** Couple's initials inside a hand-drawn leafy wreath. */
export function LeafWreath({ initials }: { initials: [string, string] }) {
  const leaves = Array.from({ length: 22 }, (_, i) => i)
  return (
    <div aria-hidden="true" className="relative mx-auto my-5 h-32 w-32 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <circle cx="60" cy="60" r="46" fill="none" stroke="#7A6A55" strokeWidth="1" />
        {leaves.map((i) => {
          // Leave a small gap at the bottom of the wreath.
          const angle = -80 + i * 15
          return (
            <g key={i} transform={`rotate(${angle} 60 60) translate(60 14)`}>
              <path
                d={i % 2 ? 'M0 0 q7 -5 12 2 q-7 4 -12 -2z' : 'M0 0 q-7 -5 -12 2 q7 4 12 -2z'}
                fill={SAGE_COLORS[i % SAGE_COLORS.length]}
                fillOpacity="0.9"
              />
            </g>
          )
        })}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-script text-3xl text-text sm:text-4xl">
        {initials[0]}
        <span className="mx-0.5 text-xl text-accent">&amp;</span>
        {initials[1]}
      </span>
    </div>
  )
}
