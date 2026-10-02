import { Flower } from './Flower'

export function FloralDivider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center justify-center gap-3">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-accent sm:w-24" />
      <Flower size={22} hue="blush" />
      <Flower size={30} hue="rose" />
      <Flower size={22} hue="blush" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-accent sm:w-24" />
    </div>
  )
}
