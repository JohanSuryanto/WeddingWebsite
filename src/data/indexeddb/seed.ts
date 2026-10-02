import type { WeddingContent } from '../../content/types'
import { SAMPLE_COUPLES } from '../../content/samples'
import { mapSources, mediaRef } from '../resolveMedia'
import type { IndexedDbCoupleRepository } from './IndexedDbCoupleRepository'
import type { IndexedDbMediaStore } from './IndexedDbMediaStore'

/**
 * On first run, copies the built-in sample couple(s) into the admin database,
 * with their bundled images and music stored as media (SC-007). No-op afterwards.
 */
export async function seedIfEmpty(
  repo: IndexedDbCoupleRepository,
  media: IndexedDbMediaStore,
): Promise<void> {
  if ((await repo.list()).length > 0) return
  for (const sample of SAMPLE_COUPLES) {
    const urlToRef = new Map<string, string>()
    const urls = new Set<string>()
    mapSources(sample.content, (src) => {
      if (src) urls.add(src)
      return null
    })
    for (const url of urls) {
      const blob = await (await fetch(url)).blob()
      const kind =
        blob.type.startsWith('audio') || /\.(wav|mp3|ogg)$/i.test(url) ? 'audio' : 'image'
      const stored = await media.put(sample.id, blob, { kind })
      urlToRef.set(url, mediaRef(stored.id))
    }
    const content: WeddingContent = mapSources(sample.content, (src) => urlToRef.get(src))
    await repo.putRaw({ ...sample, content })
  }
}
