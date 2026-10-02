import { Flower, Leaf } from './Flower'
import { FloralCorner } from './FloralCorner'

/** Soft gradient wash with floral clusters behind the cover content. */
export function CoverBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--theme-surface-alt),transparent_60%),radial-gradient(ellipse_at_bottom,#efd9e0,transparent_55%)]" />
      <FloralCorner position="top-left" />
      <FloralCorner position="bottom-right" />
      <div className="absolute top-1/4 -right-6 hidden opacity-60 sm:block">
        <Flower size={90} hue="mauve" />
        <Leaf size={70} rotate={-30} />
      </div>
      <div className="absolute bottom-1/4 -left-6 hidden opacity-60 sm:block">
        <Leaf size={70} rotate={30} />
        <Flower size={80} hue="blush" />
      </div>
    </div>
  )
}
