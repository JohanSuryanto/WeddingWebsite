import { useWedding } from '../WeddingProvider'
import { orderedCouple } from '../../content/selectors'
import { useReveal } from '../../hooks/useReveal'
import { useTheme } from '../../themes'

export function Closing() {
  const wedding = useWedding()
  const { CoverBackdrop, NameFlourish } = useTheme().ornaments
  const [first, second] = orderedCouple(wedding)
  const { quote, message } = wedding.closing
  const ref = useReveal<HTMLDivElement>()

  return (
    <section
      id="penutup"
      aria-label="Penutup"
      className="relative overflow-hidden bg-bg px-4 py-20 md:py-28"
    >
      <CoverBackdrop />
      <div ref={ref} className="reveal relative z-[1] mx-auto max-w-2xl text-center">
        {quote && (
          <figure className="card px-6 py-8">
            <blockquote className="font-heading text-lg text-text italic sm:text-xl">
              “{quote.text}”
            </blockquote>
            <figcaption className="mt-3 text-sm font-bold text-muted">{quote.source}</figcaption>
          </figure>
        )}
        <p className="mt-10 text-text">{message}</p>
        <p className="mt-8 font-heading text-lg text-muted">Kami yang berbahagia,</p>
        <p className="mt-2 font-script text-5xl text-text sm:text-6xl">
          {first.nickname} <span className="text-accent">&amp;</span> {second.nickname}
        </p>
        {NameFlourish && <NameFlourish />}
      </div>
    </section>
  )
}
