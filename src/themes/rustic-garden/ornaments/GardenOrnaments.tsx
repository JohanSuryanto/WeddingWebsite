import { Eucalyptus, Sprig } from './Botanicals'

/** Eucalyptus branch tucked into a section corner. */
export function BranchCorner({ position }: { position: 'top-left' | 'bottom-right' }) {
  const top = position === 'top-left'
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 w-28 opacity-80 sm:w-40 ${
        top ? '-top-2 -left-4' : '-right-4 -bottom-2 rotate-180'
      }`}
    >
      <div className="rg-sway origin-bottom-left">
        <Eucalyptus width={160} className="h-auto w-full rotate-[200deg] scale-y-[-1]" />
      </div>
    </div>
  )
}

export const CornerTopLeft = () => <BranchCorner position="top-left" />
export const CornerBottomRight = () => <BranchCorner position="bottom-right" />

/** Paper texture comes from tokens.css; this adds branches framing the cover. */
export function GardenBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(233_239_227/0.9))]" />
      <div className="rg-sway absolute -top-4 -left-8 w-44 origin-top-left sm:w-64">
        <Eucalyptus width={260} className="h-auto w-full rotate-[200deg] scale-y-[-1]" />
      </div>
      <div className="rg-sway absolute -top-4 -right-8 w-40 origin-top-right sm:w-60">
        <Eucalyptus width={240} flip className="h-auto w-full rotate-[160deg] scale-y-[-1]" />
      </div>
      <div className="absolute -bottom-10 left-1/2 flex w-[22rem] max-w-[110%] -translate-x-1/2 justify-center opacity-90">
        <Eucalyptus width={220} className="-mr-10 h-auto w-1/2" flip />
        <Eucalyptus width={220} className="h-auto w-1/2" />
      </div>
    </div>
  )
}

/** Vine divider: two sprigs meeting at a small brown berry. */
export function VineDivider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center justify-center gap-1">
      <Sprig width={80} className="scale-x-[-1]" />
      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      <Sprig width={80} />
    </div>
  )
}

export function SprigFlourish() {
  return (
    <div aria-hidden="true" className="mt-2 flex items-center justify-center gap-2">
      <Sprig width={70} className="scale-x-[-1]" />
      <Sprig width={70} />
    </div>
  )
}
