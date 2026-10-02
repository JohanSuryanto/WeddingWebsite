import { SafeImage } from '../../components/SafeImage'
import { SectionShell } from '../../components/SectionShell'
import { useWedding } from '../WeddingProvider'

export function Story() {
  const wedding = useWedding()
  const story = wedding.story ?? []
  if (story.length === 0) return null
  return (
    <SectionShell id="cerita" title="Cerita Kami">
      <ol className="relative mx-auto max-w-3xl">
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-4 w-px bg-primary md:left-1/2 md:-translate-x-1/2"
        />
        {story.map((m, i) => (
          <li
            key={m.title}
            className={`relative mb-10 pl-12 last:mb-0 md:w-1/2 md:pl-0 ${
              i % 2 === 0 ? 'md:pr-10 md:text-right' : 'md:ml-auto md:pl-10'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-6 left-4 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-surface bg-accent shadow-card ${
                i % 2 === 0 ? 'md:right-0 md:left-auto md:translate-x-1/2' : 'md:left-0'
              }`}
            />
            <article className="card overflow-hidden text-left">
              {m.photo && (
                <SafeImage
                  image={m.photo}
                  alt={m.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              )}
              <div className="p-5">
                <p className="inline-block rounded-full bg-surface-alt px-3 py-1 text-xs font-bold text-text">
                  {m.date}
                </p>
                <h3 className="mt-2 text-2xl text-text">{m.title}</h3>
                <p className="mt-1 text-text">{m.description}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </SectionShell>
  )
}
