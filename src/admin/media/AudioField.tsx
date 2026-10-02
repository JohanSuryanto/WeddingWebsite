import { useId, useRef, useState } from 'react'
import type { MusicTrack } from '../../content/types'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { formatSize } from './compressImage'
import { UploadError, useMediaSession } from './MediaSession'

/** Background music: pick, play in the dashboard, title, replace, remove. */
export function AudioField({
  value,
  onChange,
}: {
  value: MusicTrack | undefined
  onChange: (value: MusicTrack | undefined) => void
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadAudio, urls } = useMediaSession()
  const url = useMediaUrl(value?.src, urls)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [size, setSize] = useState<number | null>(null)

  async function pick(file: File | undefined) {
    if (!file) return
    setProblem(null)
    setBusy(true)
    try {
      const stored = await uploadAudio(file)
      setSize(stored.size)
      onChange({ src: stored.src, title: value?.title || file.name.replace(/\.[^.]+$/, '') })
    } catch (err) {
      setProblem(err instanceof UploadError ? err.message : 'Gagal mengunggah musik')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {value?.src && url ? (
        <audio controls src={url} className="w-full max-w-md" data-testid="music-player">
          <track kind="captions" />
        </audio>
      ) : (
        <p className="text-sm text-muted">{busy ? 'Mengunggah…' : 'Belum ada musik.'}</p>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="audio/*"
        className="sr-only"
        aria-label="Pilih file musik"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="btn-outline cursor-pointer px-4 py-1 text-sm">
          {value?.src ? 'Ganti' : 'Pilih Musik'}
        </label>
        {value?.src && (
          <button
            type="button"
            className="btn-outline px-4 py-1 text-sm"
            onClick={() => onChange(undefined)}
          >
            Hapus
          </button>
        )}
        {size !== null && <span className="text-xs text-muted">Tersimpan {formatSize(size)}</span>}
      </div>
      {value?.src && (
        <div>
          <label htmlFor={`${id}-title`} className="mb-1 block font-bold text-text">
            Judul (opsional)
          </label>
          <input
            id={`${id}-title`}
            className="field max-w-md"
            value={value.title ?? ''}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </div>
      )}
      {problem && (
        <p className="field-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}
