import { useWedding } from '../WeddingProvider'
import { mainEvent, orderedCouple } from '../../content/selectors'
import { useGuestName } from '../../hooks/useGuestName'
import { formatDateId } from '../../lib/dateFormat'
import { useTheme } from '../../themes'

interface Props {
  onOpen: () => void
  leaving: boolean
}

export function Cover({ onOpen, leaving }: Props) {
  const wedding = useWedding()
  const guest = useGuestName()
  const { CoverBackdrop, NameFlourish, Monogram } = useTheme().ornaments
  const [first, second] = orderedCouple(wedding)
  const event = mainEvent(wedding)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-title"
      className={`fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-y-auto bg-bg px-4 py-10 transition-all duration-700 ease-in-out motion-reduce:transition-none ${
        leaving ? 'pointer-events-none -translate-y-8 opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={wedding.cover.background.src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        fetchPriority="high"
      />
      <CoverBackdrop />

      <div className="relative z-[1] w-full max-w-md text-center">
        <p className="font-heading text-lg tracking-[0.3em] text-muted uppercase">
          {wedding.cover.heading}
        </p>
        {Monogram && <Monogram initials={[first.nickname.charAt(0), second.nickname.charAt(0)]} />}
        <h1
          id="cover-title"
          className="mt-4 font-script text-5xl leading-tight font-normal break-words text-text sm:text-6xl md:text-7xl"
        >
          {first.nickname}
          <span className="mx-2 text-accent sm:mx-3">&amp;</span>
          {second.nickname}
        </h1>
        {NameFlourish && <NameFlourish />}
        <p className="mt-3 font-heading text-xl text-text">{formatDateId(event.start)}</p>

        <div className="card mx-auto mt-10 max-w-full px-6 py-5">
          <p className="text-sm text-muted">Kepada Yth.</p>
          <p
            data-testid="guest-name"
            className="mt-1 font-heading text-2xl font-semibold break-words text-text"
          >
            {guest ?? wedding.cover.defaultGuestLabel}
          </p>
          <p className="mt-2 text-xs text-muted">
            Mohon maaf apabila ada kesalahan penulisan nama dan gelar
          </p>
        </div>

        <button type="button" onClick={onOpen} className="btn-primary mt-8">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M3 7l9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
          </svg>
          Buka Undangan
        </button>
      </div>
    </div>
  )
}
