import { useEffect, useState } from 'react'
import { mediaStore } from '../../data/index.admin'
import { isMediaRef, mediaId } from '../../data/resolveMedia'

/** Displayable URL for a src that may be a media: ref (object URL revoked on change). */
export function useMediaUrl(src: string | null | undefined, known?: ReadonlyMap<string, string>) {
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(null)

  useEffect(() => {
    if (!src || !isMediaRef(src) || known?.has(mediaId(src))) return
    let url: string | null = null
    let cancelled = false
    mediaStore.getBlob(mediaId(src)).then((blob) => {
      if (cancelled || !blob) return
      url = URL.createObjectURL(blob)
      setResolved({ src, url })
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [src, known])

  if (!src) return null
  if (!isMediaRef(src)) return src
  return known?.get(mediaId(src)) ?? (resolved?.src === src ? resolved.url : null)
}
