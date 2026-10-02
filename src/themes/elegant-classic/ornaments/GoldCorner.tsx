/** Art-deco style gold filigree placed in a section corner. */
export function GoldCorner({ position }: { position: 'top-left' | 'bottom-right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={`pointer-events-none absolute z-0 h-20 w-20 text-accent opacity-70 sm:h-28 sm:w-28 ${
        position === 'top-left' ? 'top-3 left-3' : 'right-3 bottom-3 rotate-180'
      }`}
    >
      <path d="M4 116V4h112" />
      <path d="M12 116V12h104" strokeOpacity="0.6" />
      <path d="M4 40c18 0 36-18 36-36" />
      <path d="M12 30c10 0 18-8 18-18" strokeOpacity="0.6" />
      <path d="M20 20l8 8M28 20l-8 8" strokeOpacity="0.8" />
      <circle cx="24" cy="24" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export const CornerTopLeft = () => <GoldCorner position="top-left" />
export const CornerBottomRight = () => <GoldCorner position="bottom-right" />
