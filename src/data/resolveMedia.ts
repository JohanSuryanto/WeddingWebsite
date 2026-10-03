import type { ImageRef, WeddingContent } from '../content/types'
import type { MediaStore } from './types'

export const MEDIA_PREFIX = 'media:'

export function isMediaRef(src: string | undefined | null): src is string {
  return !!src && src.startsWith(MEDIA_PREFIX)
}

export function mediaId(src: string): string {
  return src.slice(MEDIA_PREFIX.length)
}

export function mediaRef(id: string): string {
  return `${MEDIA_PREFIX}${id}`
}

/** Calls `fn` for every media-capable `src` in the content (images and music). */
function eachSrc(content: WeddingContent, fn: (src: string) => void) {
  const img = (i?: ImageRef) => i && fn(i.src)
  img(content.cover?.background)
  img(content.couple?.bride?.photo)
  img(content.couple?.groom?.photo)
  content.story?.forEach((s) => img(s.photo))
  content.gallery?.forEach((g) => img(g.src))
  content.gifts?.accounts?.forEach((a) => img(a.logo))
  if (content.music?.src) fn(content.music.src)
}

/** Every media id referenced by the content. */
export function collectMediaRefs(content: WeddingContent): Set<string> {
  const ids = new Set<string>()
  eachSrc(content, (src) => {
    if (isMediaRef(src)) ids.add(mediaId(src))
  })
  return ids
}

/** Deep copy with every `src` passed through `map` (null/undefined keeps the value). */
export function mapSources(
  content: WeddingContent,
  map: (src: string) => string | null | undefined,
): WeddingContent {
  const copy = structuredClone(content)
  const img = (i?: ImageRef) => {
    if (i) i.src = map(i.src) ?? i.src
  }
  img(copy.cover?.background)
  img(copy.couple?.bride?.photo)
  img(copy.couple?.groom?.photo)
  copy.story?.forEach((s) => img(s.photo))
  copy.gallery?.forEach((g) => img(g.src))
  copy.gifts?.accounts?.forEach((a) => img(a.logo))
  if (copy.music?.src) copy.music.src = map(copy.music.src) ?? copy.music.src
  return copy
}

/** Deep copy with media ids remapped (used by duplicate). */
export function rewriteMediaRefs(content: WeddingContent, idMap: Map<string, string>) {
  return mapSources(content, (src) =>
    isMediaRef(src) && idMap.has(mediaId(src)) ? mediaRef(idMap.get(mediaId(src))!) : null,
  )
}

/**
 * Replaces `media:<id>` references with URLs the invitation can use: the store's
 * delivery URL when it has one, otherwise a `blob:` URL of the downloaded file.
 * Missing media become '' (SafeImage shows its placeholder). Call `dispose`
 * to revoke the URLs.
 */
export async function resolveMedia(
  content: WeddingContent,
  store: MediaStore | null,
  extra?: ReadonlyMap<string, string>,
): Promise<{ content: WeddingContent; dispose: () => void }> {
  const created: string[] = []
  const urls = new Map<string, string>()
  for (const id of collectMediaRefs(content)) {
    // Delivery URLs (from the server) are used as-is: nothing to download or revoke.
    const known = extra?.get(id) ?? store?.urlOf?.(id)
    if (known) {
      urls.set(id, known)
      continue
    }
    const blob = store ? await store.getBlob(id) : null
    if (blob) {
      const url = URL.createObjectURL(blob)
      created.push(url)
      urls.set(id, url)
    } else {
      urls.set(id, '')
    }
  }
  return {
    content: mapSources(content, (src) =>
      isMediaRef(src) ? (urls.get(mediaId(src)) ?? '') : null,
    ),
    dispose: () => created.forEach((u) => URL.revokeObjectURL(u)),
  }
}
