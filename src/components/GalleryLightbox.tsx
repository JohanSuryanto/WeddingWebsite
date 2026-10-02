import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import type { GalleryPhoto } from '../content/types'

interface Props {
  photos: GalleryPhoto[]
  index: number
  onClose: () => void
}

/** Loaded lazily so the lightbox stays out of the initial bundle. */
export default function GalleryLightbox({ photos, index, onClose }: Props) {
  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      plugins={[Captions]}
      slides={photos.map((p) => ({
        src: p.src.src,
        width: p.src.width,
        height: p.src.height,
        alt: p.alt,
        description: p.caption,
      }))}
      labels={{
        Previous: 'Sebelumnya',
        Next: 'Berikutnya',
        Close: 'Tutup',
        Lightbox: 'Galeri foto',
        Carousel: 'Foto',
        Slide: 'Foto',
      }}
      controller={{ closeOnBackdropClick: true }}
      styles={{ container: { backgroundColor: 'rgb(40 26 34 / 0.94)' } }}
    />
  )
}
