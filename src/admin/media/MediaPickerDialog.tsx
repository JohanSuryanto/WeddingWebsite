import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { SAMPLE_MUSIC, SAMPLE_PHOTOS, type MediaSample } from './samples'

/**
 * "Pilih foto / musik": pick from the sample library or upload from this device.
 * Device upload opens the field's own file input (`inputId`), so everything still
 * goes through the field's normal upload path.
 */
export function MediaPickerDialog({
  kind,
  title,
  inputId,
  multiple = false,
  onSamples,
  onClose,
}: {
  kind: 'image' | 'audio'
  title: string
  inputId: string
  multiple?: boolean
  onSamples: (samples: MediaSample[]) => void
  onClose: () => void
}) {
  const samples = kind === 'image' ? SAMPLE_PHOTOS : SAMPLE_MUSIC
  const [selected, setSelected] = useState<string[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(
    () => () => {
      audio.current?.pause()
    },
    [],
  )

  const close = useCallback(() => {
    audio.current?.pause()
    onClose()
  }, [onClose])

  function choose(list: MediaSample[]) {
    audio.current?.pause()
    onSamples(list)
    onClose()
  }

  function togglePlay(s: MediaSample) {
    if (playing === s.id) {
      audio.current?.pause()
      setPlaying(null)
      return
    }
    audio.current?.pause()
    const el = new Audio(s.url)
    el.onended = () => setPlaying(null)
    audio.current = el
    void el.play().catch(() => setPlaying(null))
    setPlaying(s.id)
  }

  const fromDevice = (
    <button
      type="button"
      className="btn-primary"
      onClick={() => {
        audio.current?.pause()
        document.getElementById(inputId)?.click()
        onClose()
      }}
    >
      Unggah dari perangkat
    </button>
  )

  return (
    <Dialog
      title={title}
      onClose={close}
      actions={
        <>
          <button type="button" className="btn-outline" onClick={close}>
            Batal
          </button>
          {multiple && kind === 'image' && (
            <button
              type="button"
              className="btn-outline"
              disabled={!selected.length}
              onClick={() => choose(samples.filter((s) => selected.includes(s.id)))}
            >
              Tambahkan {selected.length || ''} contoh
            </button>
          )}
          {fromDevice}
        </>
      }
    >
      <p className="text-sm text-muted">
        Pilih {kind === 'image' ? 'foto' : 'musik'} contoh{multiple ? ' (bisa lebih dari satu)' : ''}, atau unggah dari
        perangkat Anda.
      </p>

      {kind === 'image' ? (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Foto contoh" data-testid="sample-photos">
          {samples.map((s) => {
            const on = selected.includes(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`block w-full overflow-hidden rounded-lg border-2 text-left ${
                    on ? 'border-accent ring-2 ring-accent' : 'border-transparent'
                  }`}
                  aria-pressed={multiple ? on : undefined}
                  onClick={() =>
                    multiple ? setSelected((x) => (on ? x.filter((id) => id !== s.id) : [...x, s.id])) : choose([s])
                  }
                >
                  <img src={s.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                  <span className="block truncate px-1.5 py-1 text-xs text-text">{s.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="mt-3 divide-y divide-accent/20" aria-label="Musik contoh" data-testid="sample-music">
          {samples.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-2">
              <button
                type="button"
                className="btn-outline min-w-20 px-3 py-1 text-sm"
                aria-label={`${playing === s.id ? 'Hentikan' : 'Putar'} ${s.label}`}
                onClick={() => togglePlay(s)}
              >
                {playing === s.id ? '■ Stop' : '▶ Putar'}
              </button>
              <span className="min-w-0 flex-1 truncate text-text">{s.label}</span>
              <button type="button" className="btn-outline px-3 py-1 text-sm" aria-label={`Pilih ${s.label}`} onClick={() => choose([s])}>
                Pilih
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
