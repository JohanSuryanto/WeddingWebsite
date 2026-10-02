import { Flower, Leaf } from './Flower'

/** Cluster of flowers and leaves placed in a corner. */
export function FloralCorner({ position }: { position: 'top-left' | 'bottom-right' }) {
  const isTop = position === 'top-left'
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 h-32 w-32 opacity-80 sm:h-44 sm:w-44 ${
        isTop ? '-top-4 -left-4' : '-right-4 -bottom-4 rotate-180'
      }`}
    >
      <div className="ornament-sway relative h-full w-full origin-top-left">
        <Leaf size={70} rotate={20} className="absolute top-14 left-10" />
        <Leaf size={60} rotate={70} className="absolute top-16 left-0" />
        <Flower size={72} hue="rose" className="absolute top-2 left-2" />
        <Flower size={48} hue="blush" className="absolute top-2 left-16" />
        <Flower size={40} hue="mauve" className="absolute top-16 left-4" />
      </div>
    </div>
  )
}

export const CornerTopLeft = () => <FloralCorner position="top-left" />
export const CornerBottomRight = () => <FloralCorner position="bottom-right" />
