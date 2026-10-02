import { Countdown } from '../../components/Countdown'
import { SaveTheDate } from '../../components/SaveTheDate'
import { SectionShell } from '../../components/SectionShell'
import type { WeddingEvent } from '../../content/types'
import { useWedding } from '../WeddingProvider'
import { mainEvent } from '../../content/selectors'
import { formatDateId, formatTimeRangeId } from '../../lib/dateFormat'

function EventCard({ event }: { event: WeddingEvent }) {
  return (
    <article className="card flex flex-col items-center px-6 py-8 text-center">
      <h3 className="text-3xl text-text">{event.name}</h3>
      <div className="my-4 h-px w-16 bg-accent" aria-hidden="true" />
      <p className="font-bold text-text">{formatDateId(event.start)}</p>
      <p className="text-text">{formatTimeRangeId(event.start, event.end)}</p>
      <p className="mt-4 font-heading text-xl font-semibold text-text">{event.venueName}</p>
      <p className="text-sm text-muted">{event.address}</p>
      {event.mapUrl && (
        <a
          href={event.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline mt-6 text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          Lihat Lokasi
        </a>
      )}
    </article>
  )
}

export function Events() {
  const wedding = useWedding()
  const main = mainEvent(wedding)
  return (
    <SectionShell
      id="acara"
      title="Acara"
      variant="alt"
      subtitle="Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada:"
    >
      <Countdown target={main.start} />
      <SaveTheDate events={wedding.events} mainEvent={main} couple={wedding.couple} />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {wedding.events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </SectionShell>
  )
}
