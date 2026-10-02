import { GoldCorner } from './GoldCorner'

/** Ivory wash with a double gold frame, like a printed invitation card. */
export function CoverFrame() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-90 bg-[radial-gradient(ellipse_at_center,var(--theme-surface),var(--theme-bg)_55%,var(--theme-surface-alt))]" />
      <div className="absolute inset-3 border border-accent/60 sm:inset-6" />
      <div className="absolute inset-5 border border-accent/30 sm:inset-8" />
      <GoldCorner position="top-left" />
      <GoldCorner position="bottom-right" />
    </div>
  )
}
