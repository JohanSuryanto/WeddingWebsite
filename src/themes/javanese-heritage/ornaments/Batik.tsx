import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

const BROWN = '#6b4226'
const GOLD = '#a8792e'

/** Gunungan: the wayang "tree of life" — a pointed leaf shape with a tree inside. */
export function Gunungan({ className = '' }: { className?: string }) {
  const branches = [44, 56, 68, 80, 92]
  return (
    <svg viewBox="0 0 100 132" className={className} aria-hidden="true">
      <path
        d="M50 4 C62 22 84 46 88 76 C91 100 74 118 50 118 C26 118 9 100 12 76 C16 46 38 22 50 4 Z"
        fill="none"
        stroke={GOLD}
        strokeWidth="2"
      />
      <path
        d="M50 14 C59 29 76 50 79 75 C81 95 68 110 50 110 C32 110 19 95 21 75 C24 50 41 29 50 14 Z"
        fill={BROWN}
        fillOpacity="0.08"
        stroke={BROWN}
        strokeOpacity="0.4"
      />
      <path d="M50 30 V110" stroke={BROWN} strokeWidth="1.6" />
      {branches.map((y, i) => {
        const w = 10 + i * 3
        return (
          <g key={y} fill="none" stroke={BROWN} strokeWidth="1.2" strokeOpacity="0.8">
            <path d={`M50 ${y} q${w * 0.6} -6 ${w} 3`} />
            <path d={`M50 ${y} q${-w * 0.6} -6 ${-w} 3`} />
          </g>
        )
      })}
      <rect x="36" y="118" width="28" height="8" rx="1" fill={GOLD} />
    </svg>
  )
}

/** Kawung flower: four ovals around a dot, the motif of the batik pattern. */
export function Kawung({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill={GOLD} fillOpacity="0.85">
        <ellipse cx="12" cy="6" rx="3.2" ry="5.2" />
        <ellipse cx="12" cy="18" rx="3.2" ry="5.2" />
        <ellipse cx="6" cy="12" rx="5.2" ry="3.2" />
        <ellipse cx="18" cy="12" rx="5.2" ry="3.2" />
      </g>
      <circle cx="12" cy="12" r="1.8" fill={BROWN} />
    </svg>
  )
}

/** Tumpal: the band of triangles along the edge of a batik cloth (repeats, never stretches). */
function Tumpal({ flip = false }: { flip?: boolean }) {
  return (
    <svg className={`block h-4 w-full ${flip ? 'rotate-180' : ''}`} aria-hidden="true">
      <defs>
        <pattern id="jh-tumpal" width="18" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 2 L9 14 L18 2 Z" fill={BROWN} fillOpacity="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill="url(#jh-tumpal)" />
      <rect width="100%" height="2" fill={GOLD} />
    </svg>
  )
}

/** The kawung tile comes from tokens.css; this adds the tumpal bands and a faint gunungan. */
export function BatikBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(238_226_201/0.95))]" />
      <Gunungan className="absolute top-1/2 left-1/2 w-[18rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.12] sm:w-[24rem]" />
      <div className="absolute inset-x-0 top-0">
        <Tumpal />
      </div>
      <div className="absolute inset-x-0 bottom-0">
        <Tumpal flip />
      </div>
    </div>
  )
}

/** A gold corner: a double line with a kawung flower where the lines meet. */
function BatikCorner({ position }: { position: 'top-left' | 'bottom-right' }) {
  const top = position === 'top-left'
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 w-20 opacity-80 sm:w-28 ${
        top ? 'top-3 left-3' : 'right-3 bottom-3 rotate-180'
      }`}
    >
      <svg viewBox="0 0 100 100" className="h-auto w-full">
        <g fill="none" stroke={GOLD} strokeWidth="1.5">
          <path d="M4 96 V4 H96" />
          <path d="M12 96 V12 H96" strokeOpacity="0.6" />
        </g>
        {[30, 50, 70].map((p) => (
          <g key={p} fill={BROWN} fillOpacity="0.55">
            <path d={`M${p} 12 l5 7 l5 -7 z`} />
            <path d={`M12 ${p} l7 5 l-7 5 z`} />
          </g>
        ))}
      </svg>
      <Kawung size={22} className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4" />
    </div>
  )
}

export const CornerTopLeft = () => <BatikCorner position="top-left" />
export const CornerBottomRight = () => <BatikCorner position="bottom-right" />

export function KawungDivider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center justify-center gap-2">
      <span className="h-px w-12 bg-accent sm:w-20" />
      <Kawung size={14} />
      <Kawung size={22} />
      <Kawung size={14} />
      <span className="h-px w-12 bg-accent sm:w-20" />
    </div>
  )
}

export function GununganFlourish() {
  return (
    <div aria-hidden="true" className="mt-2 flex items-center justify-center gap-3">
      <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
      <Gunungan className="h-9 w-auto" />
      <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
    </div>
  )
}

/** The couple's initials in a gold ring of kawung ovals. */
export function KawungMonogram({ initials }: { initials: [string, string] }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <div aria-hidden="true" className="relative mx-auto my-5 h-32 w-32 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <circle cx="60" cy="60" r="44" fill="none" stroke={GOLD} strokeWidth="1.2" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={BROWN} strokeOpacity="0.35" />
        {petals.map((a) => (
          <ellipse
            key={a}
            cx="60"
            cy="16"
            rx="2.6"
            ry="4.6"
            fill={a % 60 ? BROWN : GOLD}
            fillOpacity={a % 60 ? 0.5 : 0.9}
            transform={`rotate(${a} 60 60)`}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-script text-3xl text-text sm:text-4xl">
        {initials[0]}
        <span className="mx-0.5 text-xl text-accent">&amp;</span>
        {initials[1]}
      </span>
    </div>
  )
}

const MELATI = Array.from({ length: 9 }, (_, i) => ({
  left: (i * 37 + 8) % 100,
  delay: (i * 2.1) % 15,
  duration: 14 + ((i * 3) % 7),
  size: 12 + ((i * 5) % 8),
  drift: (i % 2 ? 1 : -1) * (25 + ((i * 13) % 50)) + 'px',
}))

/** A five-petal jasmine (melati) flower. */
function Melati({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <g fill="#fffdf6" stroke="#e8dcc0" strokeWidth="0.6">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="10" cy="5" rx="3" ry="4.6" transform={`rotate(${a} 10 10)`} />
        ))}
      </g>
      <circle cx="10" cy="10" r="1.8" fill="#e9c46a" />
    </svg>
  )
}

/** Jasmine flowers drifting down. Renders nothing under reduced motion. */
export function MelatiFall() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  return (
    <div
      aria-hidden="true"
      data-testid="ambient-effect"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {MELATI.map((m, i) => (
        <span
          key={i}
          className="absolute -top-8 block"
          style={{
            left: `${m.left}%`,
            animation: `jh-melati-fall ${m.duration}s linear ${m.delay}s infinite`,
            ['--drift' as string]: m.drift,
          }}
        >
          <Melati size={m.size} />
        </span>
      ))}
    </div>
  )
}
