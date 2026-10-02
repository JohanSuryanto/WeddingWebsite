import { useEffect, useRef, useState } from 'react'

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
    loaderRef.current().then(
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
