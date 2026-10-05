import { useCallback, useId, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import type { ImageRef } from '../../content/types'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { formatSize, type ImagePreset } from './compressImage'
import { MediaPickerDialog } from './MediaPickerDialog'
import { useMediaSession } from './MediaSession'
import { sampleFile, type MediaSample } from './samples'
import { UploadStatusLine } from './UploadStatusLine'
import { useUpload } from './useUploads'

const EMPTY: ImageRef = { src: '', width: 1, height: 1 }

/** One photo: pick/drop, preview, replace, remove; shows the stored size. */
export function ImageField({
  label,
  value,
  onChange,
  preset,
  error,
  required,
  aspect = 'aspect-[4/3]',
  testId,
  samples,
}: {
  label: string
  value: ImageRef | undefined
  onChange: (value: ImageRef | undefined) => void
  preset: ImagePreset
  error?: string
  required?: boolean
  aspect?: string
  testId?: string
  /** Picker samples; the general photo samples when omitted. */
  samples?: readonly MediaSample[]
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadImage, urls } = useMediaSession()
  const url = useMediaUrl(value?.src, urls)
  const [size, setSize] = useState<number | null>(null)
  const upload = useUpload(
    (file, onProgress) => uploadImage(file, preset, onProgress),
    ({ size: stored, ...ref }) => {
      setSize(stored)
      onChange(ref)
    },
    'Gagal mengunggah foto',
  )
  const busy = upload.state.status === 'uploading'
  const shownError = error

  function pick(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''
    if (file) void upload.start(file)
  }

  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const closePicker = useCallback(() => setPicking(false), [])
  async function pickSample([sample]: MediaSample[]) {
    try {
      pick(await sampleFile(sample))
    } catch {
      toast('Foto contoh tidak bisa dimuat, coba lagi')
    }
  }

  const hasImage = !!value?.src
  return (
    <div data-testid={testId}>
      <p className="mb-1 font-bold text-text">
        {label}
        {required && <span className="text-[#a33a50]"> *</span>}
      </p>
      <div
        className={`relative flex ${aspect} w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border-2 border-dashed ${
          shownError ? 'border-[#a33a50]' : 'border-accent/50'
        } cursor-pointer bg-surface-alt`}
        role="button"
        tabIndex={0}
        aria-label={`Buka pilihan foto ${label}`}
        onClick={() => !busy && setPicking(true)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !busy) {
            e.preventDefault()
            setPicking(true)
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          pick(e.dataTransfer.files[0])
        }}
      >
        {hasImage && url ? (
          <img src={url} alt={`Pratinjau ${label}`} className="h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-sm text-muted">
            {busy ? 'Memproses…' : 'Klik untuk memilih foto, atau tarik foto ke sini'}
          </span>
        )}
        {busy && hasImage && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 font-bold text-white">
            Memproses…
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Pilih foto ${label}`}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-outline px-4 py-1 text-sm" onClick={() => setPicking(true)} disabled={busy}>
          {hasImage ? 'Ganti' : 'Pilih Foto'}
        </button>
        {hasImage && (
          <button
            type="button"
            className="btn-outline px-4 py-1 text-sm"
            onClick={() => {
              setSize(null)
              onChange(required ? EMPTY : undefined)
            }}
          >
            Hapus
          </button>
        )}
        {size !== null && (
          <span className="text-xs text-muted" data-testid="stored-size">
            Tersimpan {formatSize(size)}
          </span>
        )}
      </div>
      <UploadStatusLine state={upload.state} onRetry={upload.retry} onDismiss={upload.dismiss} />
      {picking && (
        <MediaPickerDialog
          kind="image"
          title={`Pilih foto: ${label}`}
          inputId={id}
          samples={samples}
          onSamples={pickSample}
          onClose={closePicker}
        />
      )}
      {shownError && (
        <p className="field-error" role="alert">
          {shownError}
        </p>
      )}
    </div>
  )
}
