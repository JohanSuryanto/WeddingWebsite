import { SafeImage } from '../../components/SafeImage'
import { SectionShell } from '../../components/SectionShell'
import type { Person } from '../../content/types'
import { useWedding } from '../WeddingProvider'
import { orderedCouple } from '../../content/selectors'

function PersonCard({ person }: { person: Person }) {
  return (
    <article className="flex flex-col items-center text-center">
      <div className="rounded-full bg-gradient-to-br from-primary to-accent p-1.5 shadow-card">
        <SafeImage
          image={person.photo}
          alt={`Foto ${person.nickname}`}
          className="h-44 w-44 rounded-full border-4 border-surface object-cover sm:h-52 sm:w-52"
        />
      </div>
      <p className="mt-5 font-script text-5xl text-text">{person.nickname}</p>
      <h3 className="mt-1 text-2xl text-text">{person.fullName}</h3>
      {person.childOrder && <p className="mt-2 text-sm text-muted">{person.childOrder}</p>}
      <p className="text-text">
        Bapak {person.father} &amp; Ibu {person.mother}
      </p>
      {person.instagram && (
        <a
          href={`https://instagram.com/${person.instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline mt-4 text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
          </svg>
          @{person.instagram}
        </a>
      )}
    </article>
  )
}

export function Couple() {
  const wedding = useWedding()
  const [first, second] = orderedCouple(wedding)
  return (
    <SectionShell
      id="mempelai"
      title="Mempelai"
      subtitle="Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan pernikahan putra-putri kami:"
    >
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center md:gap-12">
        <PersonCard person={first} />
        <p aria-hidden="true" className="font-script text-6xl text-accent md:mt-24">
          &amp;
        </p>
        <PersonCard person={second} />
      </div>
    </SectionShell>
  )
}
