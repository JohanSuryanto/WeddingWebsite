import { useCallback, useId, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import type { MusicTrack } from '../../content/types'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { formatSize } from './compressImage'
import { MediaPickerDialog } from './MediaPickerDialog'
import { useMediaSession } from './MediaSession'
import { sampleFile, type MediaSample } from './samples'
import { UploadStatusLine } from './UploadStatusLine'
import { useUpload } from './useUploads'

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
  const [size, setSize] = useState<number | null>(null)
  const upload = useUpload(
    (file, onProgress) => uploadAudio(file, onProgress),
    (stored, file) => {
      setSize(stored.size)
      onChange({ src: stored.src, title: value?.title || file.name.replace(/\.[^.]+$/, '') })
    },
    'Gagal mengunggah musik',
  )
  const busy = upload.state.status === 'uploading'

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
      toast('Musik contoh tidak bisa dimuat, coba lagi')
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
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-outline px-4 py-1 text-sm" onClick={() => setPicking(true)} disabled={busy}>
          {value?.src ? 'Ganti' : 'Pilih Musik'}
        </button>
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
      <UploadStatusLine state={upload.state} onRetry={upload.retry} onDismiss={upload.dismiss} />
      {picking && (
        <MediaPickerDialog kind="audio" title="Pilih musik" inputId={id} onSamples={pickSample} onClose={closePicker} />
      )}
    </div>
  )
}
