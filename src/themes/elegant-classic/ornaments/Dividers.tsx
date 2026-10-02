function Diamond({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d="M6 0l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="currentColor" />
    </svg>
  )
}

export function GoldDivider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center justify-center gap-3 text-accent">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-accent sm:w-28" />
      <Diamond className="h-2 w-2 opacity-70" />
      <Diamond className="h-3.5 w-3.5" />
      <Diamond className="h-2 w-2 opacity-70" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-accent sm:w-28" />
    </div>
  )
}

export function GoldRule() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-3 flex w-56 items-center gap-2 text-accent sm:w-72"
    >
      <span className="h-px flex-1 bg-accent/70" />
      <Diamond className="h-2.5 w-2.5" />
      <span className="h-px flex-1 bg-accent/70" />
    </div>
  )
}

/** Couple's initials inside a double gold ring. */
export function Monogram({ initials }: { initials: [string, string] }) {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto my-6 flex h-28 w-28 items-center justify-center rounded-full border border-accent sm:h-32 sm:w-32"
    >
      <span className="absolute inset-1.5 rounded-full border border-accent/40" />
      <span className="flex items-center gap-2 font-heading text-3xl text-text sm:text-4xl">
        {initials[0]}
        <Diamond className="h-3 w-3 text-accent" />
        {initials[1]}
      </span>
    </div>
  )
}
