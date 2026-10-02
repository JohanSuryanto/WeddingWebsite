import { useId, useRef, useState } from 'react'
import type { ImageRef } from '../../content/types'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { formatSize, type ImagePreset } from './compressImage'
import { UploadError, useMediaSession } from './MediaSession'

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
}: {
  label: string
  value: ImageRef | undefined
  onChange: (value: ImageRef | undefined) => void
  preset: ImagePreset
  error?: string
  required?: boolean
  aspect?: string
  testId?: string
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadImage, urls } = useMediaSession()
  const url = useMediaUrl(value?.src, urls)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const shownError = problem ?? error

  async function pick(file: File | undefined) {
    if (!file) return
    setProblem(null)
    setBusy(true)
    try {
      const { size: stored, ...ref } = await uploadImage(file, preset)
      setSize(stored)
      onChange(ref)
    } catch (err) {
      setProblem(err instanceof UploadError ? err.message : 'Gagal mengunggah foto')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
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
        } bg-surface-alt`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void pick(e.dataTransfer.files[0])
        }}
      >
        {hasImage && url ? (
          <img src={url} alt={`Pratinjau ${label}`} className="h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-sm text-muted">
            {busy ? 'Memproses…' : 'Tarik foto ke sini atau pilih file'}
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
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="btn-outline cursor-pointer px-4 py-1 text-sm">
          {hasImage ? 'Ganti' : 'Pilih Foto'}
        </label>
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
      {shownError && (
        <p className="field-error" role="alert">
          {shownError}
        </p>
      )}
    </div>
  )
}
