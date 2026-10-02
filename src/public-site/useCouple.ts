import { useEffect, useState } from 'react'
import { coupleRepository, mediaStore } from '../data/index.public'
import { resolveMedia } from '../data/resolveMedia'
import type { Couple } from '../data/types'

export type CoupleState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'draft'; couple: Couple }
  | { status: 'ready'; couple: Couple }

type Result = Exclude<CoupleState, { status: 'loading' }>

/** Loads a couple by address name, with media resolved for display. */
export function useCouple(slug: string | undefined): CoupleState {
  const [result, setResult] = useState<{ slug: string | undefined; value: Result } | null>(null)

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    const done = (value: Result) => !cancelled && setResult({ slug, value })
    ;(async () => {
      const couple = slug ? await coupleRepository.findBySlug(slug, { includeDrafts: true }) : null
      if (!couple) return done({ status: 'not-found' })
      if (couple.status !== 'active') return done({ status: 'draft', couple })
      const resolved = await resolveMedia(couple.content, mediaStore)
      if (cancelled) return resolved.dispose()
      dispose = resolved.dispose
      done({ status: 'ready', couple: { ...couple, content: resolved.content } })
    })()
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [slug])

  // A result for a previous address counts as still loading.
  return result && result.slug === slug ? result.value : { status: 'loading' }
}
