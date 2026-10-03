import { useCallback, useEffect, useState } from 'react'
import { publicCouples } from '../data/index.public'
import { NotFoundError, UnavailableError, type PublicCouple } from '../data/types'

export type CoupleState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'draft' }
  | { status: 'error' }
  | { status: 'ready'; couple: PublicCouple }

type Result = Exclude<CoupleState, { status: 'loading' }>

/** Loads a published couple by address name; `retry` reloads after an error (FR-024). */
export function useCouple(slug: string | undefined): CoupleState & { retry: () => void } {
  const [result, setResult] = useState<{ key: string; value: Result } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${slug}#${attempt}`

  useEffect(() => {
    let cancelled = false
    const done = (value: Result) => !cancelled && setResult({ key, value })
    if (!slug) {
      done({ status: 'not-found' })
      return
    }
    publicCouples.get(slug).then(
      (couple) => done({ status: 'ready', couple }),
      (err) => {
        if (err instanceof NotFoundError) done({ status: 'not-found' })
        else if (err instanceof UnavailableError) done({ status: 'draft' })
        else done({ status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [slug, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  // A result for a previous address (or attempt) counts as still loading.
  const state: CoupleState = result && result.key === key ? result.value : { status: 'loading' }
  return { ...state, retry }
}
