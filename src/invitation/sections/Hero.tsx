import { useWedding } from '../WeddingProvider'
import { mainEvent, orderedCouple } from '../../content/selectors'
import { useReveal } from '../../hooks/useReveal'
import { formatDateShort } from '../../lib/dateFormat'
import { useTheme } from '../../themes'

export function Hero() {
  const wedding = useWedding()
  const { CoverBackdrop, NameFlourish } = useTheme().ornaments
  const [first, second] = orderedCouple(wedding)
  const ref = useReveal<HTMLDivElement>()

  return (
    <section
      id="beranda"
      aria-labelledby="beranda-title"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-20"
    >
      <CoverBackdrop />
      <div ref={ref} className="reveal relative z-[1] text-center">
        <p className="font-heading text-lg tracking-[0.25em] text-muted uppercase">
          Kami akan menikah
        </p>
        <h1
          id="beranda-title"
          className="mt-4 font-script text-6xl leading-tight font-normal text-text sm:text-7xl md:text-8xl"
        >
          {first.nickname}
          <span className="block text-4xl text-accent sm:inline sm:px-4 sm:text-6xl">&amp;</span>
          {second.nickname}
        </h1>
        {NameFlourish && <NameFlourish />}
        <p className="mt-4 font-heading text-2xl tracking-widest text-text">
          {formatDateShort(mainEvent(wedding).start)}
        </p>
        {wedding.couple.hashtag && (
          <p className="mt-3 text-sm font-bold text-muted">{wedding.couple.hashtag}</p>
        )}
      </div>
    </section>
  )
}
