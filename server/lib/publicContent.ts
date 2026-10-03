import { isMediaRef, mapSources, mediaId } from '../../src/data/resolveMedia'
import type { PublicCouple } from '../../src/data/types'
import type { CoupleRow } from '../db/schema'

/** What guests receive: `media:<id>` replaced with delivery URLs (missing → ''), no admin fields. */
export function toPublicCouple(row: CoupleRow, urls: Map<string, string>): PublicCouple {
  return {
    slug: row.slug,
    defaultTheme: row.defaultTheme,
    content: mapSources(row.content, (src) => (isMediaRef(src) ? (urls.get(mediaId(src)) ?? '') : null)),
  }
}
