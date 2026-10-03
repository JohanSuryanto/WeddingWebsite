import type { UploadState } from './useUploads'

/** Progress, or the error with "Coba lagi" / "Batal" for this one file. */
export function UploadStatusLine({
  state,
  onRetry,
  onDismiss,
}: {
  state: UploadState
  onRetry: () => void
  onDismiss: () => void
}) {
  if (state.status === 'uploading') {
    return (
      <p className="text-sm font-bold text-text" role="status" aria-live="polite" data-testid="upload-progress">
        Mengunggah… {state.percent}%
      </p>
    )
  }
  if (state.status !== 'failed') return null
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="upload-failed">
      <p className="field-error mt-0" role="alert">
        {state.message}
      </p>
      {state.file && (
        <button type="button" className="btn-outline px-3 py-0.5 text-sm" onClick={onRetry}>
          Coba lagi
        </button>
      )}
      <button type="button" className="btn-outline px-3 py-0.5 text-sm" onClick={onDismiss}>
        Batal
      </button>
    </div>
  )
}
