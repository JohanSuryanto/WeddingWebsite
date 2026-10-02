import { lazy, Suspense, useState } from 'react'
import { SafeImage } from '../../components/SafeImage'
import { SectionShell } from '../../components/SectionShell'
import { useWedding } from '../WeddingProvider'

const GalleryLightbox = lazy(() => import('../../components/GalleryLightbox'))

export function Gallery() {
  const wedding = useWedding()
  const photos = wedding.gallery ?? []
  const [index, setIndex] = useState<number | null>(null)
  if (photos.length === 0) return null

  return (
    <SectionShell id="galeri" title="Galeri" variant="alt" subtitle="Momen-momen bahagia kami">
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.src.src}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Lihat foto: ${p.alt}`}
              className="group block w-full overflow-hidden rounded-xl"
            >
              <SafeImage
                image={p.src}
                alt={p.alt}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>
      {index !== null && (
        <Suspense fallback={null}>
          <GalleryLightbox photos={photos} index={index} onClose={() => setIndex(null)} />
        </Suspense>
      )}
    </SectionShell>
  )
}
