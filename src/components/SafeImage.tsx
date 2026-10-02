import { useState, type ImgHTMLAttributes } from 'react'
import type { ImageRef } from '../content/types'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> & {
  image: ImageRef
  alt: string
}

/** Image with reserved dimensions and a themed placeholder if loading fails. */
export function SafeImage({ image, alt, className = '', loading = 'lazy', ...rest }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-surface-alt text-primary ${className}`}
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.5 2.7C19.5 16.4 12 21 12 21z" />
        </svg>
      </div>
    )
  }
  return (
    <img
      src={image.src}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  )
}
