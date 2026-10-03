import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { NetworkError } from '../../data/types'
import { ValidationError } from '../../services/types'
import { UploadError, useMediaSession } from './MediaSession'

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; percent: number }
  | { status: 'failed'; message: string; file: File | null }

export const RETRY_MESSAGE = 'Gagal mengunggah — Coba lagi'

/** Message for an upload error, and whether trying the same file again can help. */
export function describeUploadError(err: unknown, fallback: string): { message: string; retryable: boolean } {
  if (err instanceof NetworkError) return { message: RETRY_MESSAGE, retryable: true }
  if (err instanceof UploadError || err instanceof ValidationError) return { message: err.message, retryable: false }
  return { message: fallback, retryable: false }
}

/**
 * One file field's upload: progress, failure and retry of that file only (FR-015).
 * While uploading or failed, the editor's "Simpan" stays disabled.
 */
export function useUpload<T>(
  run: (file: File, onProgress: (percent: number) => void) => Promise<T>,
  onDone: (result: T, file: File) => void,
  fallback: string,
) {
  const key = useId()
  const { track } = useMediaSession()
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const runRef = useRef(run)
  const doneRef = useRef(onDone)
  useEffect(() => {
    runRef.current = run
    doneRef.current = onDone
  })
  useEffect(() => () => track(key, null), [key, track])

  const start = useCallback(
    async (file: File) => {
      track(key, 'uploading')
      setState({ status: 'uploading', percent: 0 })
      try {
        const result = await runRef.current(file, (percent) => setState({ status: 'uploading', percent }))
        track(key, null)
        setState({ status: 'idle' })
        doneRef.current(result, file)
      } catch (err) {
        const { message, retryable } = describeUploadError(err, fallback)
        track(key, retryable ? 'failed' : null)
        setState({ status: 'failed', message, file: retryable ? file : null })
      }
    },
    [key, track, fallback],
  )

  const dismiss = useCallback(() => {
    track(key, null)
    setState({ status: 'idle' })
  }, [key, track])

  const retry = useCallback(() => {
    if (state.status === 'failed' && state.file) void start(state.file)
  }, [state, start])

  return { state, start, retry, dismiss }
}
