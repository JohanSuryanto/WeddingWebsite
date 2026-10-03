import { useEffect, useRef, useState } from 'react'
import { SessionExpiredError } from '../../data/types'
import { waitForRelogin } from '../auth/relogin'

/** Runs the loader; if the session ended, waits for the re-login dialog and tries once more. */
async function loadWithRelogin<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader()
  } catch (err) {
    if (!(err instanceof SessionExpiredError)) throw err
    await waitForRelogin()
    return loader()
  }
}

export type LoadState<T> =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: T }

/**
 * Runs `loader` when `key` changes; `reload()` runs it again. Results for an
 * older key are ignored, and show as loading.
 */
export function useLoad<T>(loader: () => Promise<T>, key: string) {
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState<{ key: string; tick: number; state: LoadState<T> } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    loadWithRelogin(loaderRef.current).then(
      (data) => !cancelled && setResult({ key, tick, state: { status: 'ready', data } }),
      (error: Error) => !cancelled && setResult({ key, tick, state: { status: 'error', error } }),
    )
    return () => {
      cancelled = true
    }
  }, [key, tick])

  const state: LoadState<T> = result && result.key === key ? result.state : { status: 'loading' }
  return { state, reload: () => setTick((t) => t + 1) }
}
