import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import type { GalleryPhoto } from '../../content/types'
import { MAX_GALLERY } from '../../data/mediaLimits'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { MediaPickerDialog } from './MediaPickerDialog'
import { useMediaSession } from './MediaSession'
import { SAMPLE_GALLERY, sampleFile, type MediaSample } from './samples'
import { describeUploadError } from './useUploads'

export const GALLERY_MAX = MAX_GALLERY

/** A photo still uploading, or failed and waiting for "Coba lagi" (FR-015). */
interface PendingUpload {
  key: string
  file: File
  /** Starting description (sample photos use their label). */
  alt: string
  status: 'uploading' | 'failed'
  percent: number
  message?: string
}

let uploadSeq = 0

const announcements: Announcements = {
  onDragStart: ({ active }) => `Foto ${active.id} diambil.`,
  onDragOver: ({ active, over }) => (over ? `Foto ${active.id} di atas posisi ${over.id}.` : ''),
  onDragEnd: ({ active, over }) =>
    over ? `Foto ${active.id} dipindahkan ke posisi ${over.id}.` : `Foto ${active.id} dilepas.`,
  onDragCancel: ({ active }) => `Pemindahan foto ${active.id} dibatalkan.`,
}

function PhotoItem({
  photo,
  index,
  count,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  photo: GalleryPhoto
  index: number
  count: number
  error?: string
  onChange: (p: GalleryPhoto) => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const { urls } = useMediaSession()
  const url = useMediaUrl(photo.src.src, urls)
  const id = String(index + 1)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const altId = `gallery-alt-${index}`
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="gallery-item"
      className={`card overflow-hidden ${error ? 'ring-2 ring-[#a33a50]' : ''} ${isDragging ? 'z-10 opacity-80' : ''}`}
    >
      <div
        className="relative aspect-square cursor-grab touch-none bg-surface-alt active:cursor-grabbing"
        aria-label={`Seret untuk memindahkan foto ${id}`}
        {...attributes}
        {...listeners}
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />}
        <span className="absolute top-1 left-1 rounded-full bg-black/60 px-2 text-xs font-bold text-white">
          {id}
        </span>
      </div>
      <div className="space-y-2 p-2">
        <label htmlFor={altId} className="sr-only">
          Deskripsi foto {id}
        </label>
        <input
          id={altId}
          className="field min-h-11 py-1 text-sm"
          placeholder="Deskripsi foto"
          value={photo.alt}
          maxLength={150}
          onChange={(e) => onChange({ ...photo, alt: e.target.value })}
          aria-invalid={!!error}
          aria-describedby={error ? `${altId}-error` : undefined}
        />
        {error && (
          <p id={`${altId}-error`} className="field-error mt-0 text-xs">
            {error}
          </p>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            className="btn-outline min-h-11 flex-1 px-2 py-0 text-sm"
            aria-label={`Pindahkan foto ${id} ke atas`}
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn-outline min-h-11 flex-1 px-2 py-0 text-sm"
            aria-label={`Pindahkan foto ${id} ke bawah`}
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn-outline min-h-11 flex-1 px-2 py-0 text-sm text-[#a33a50]"
            aria-label={`Hapus foto ${id}`}
            onClick={onRemove}
          >
            Hapus
          </button>
        </div>
      </div>
    </li>
  )
}

/** Gallery: multi-upload, drag/↑↓ reorder, required description per photo. */
export function GalleryField({
  value,
  onChange,
  errors,
}: {
  value: GalleryPhoto[]
  onChange: (value: GalleryPhoto[]) => void
  /** Description error per index. */
  errors?: (string | undefined)[]
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadImage, track } = useMediaSession()
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  // Sequential uploads append to the latest list, not the one from when they started.
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])
  const pendingRef = useRef(pending)
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => () => pendingRef.current.forEach((u) => track(u.key, null)), [track])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const patch = (key: string, change: Partial<PendingUpload> | null) =>
    setPending((list) =>
      change ? list.map((u) => (u.key === key ? { ...u, ...change } : u)) : list.filter((u) => u.key !== key),
    )

  async function uploadOne(item: PendingUpload): Promise<string | null> {
    track(item.key, 'uploading')
    patch(item.key, { status: 'uploading', percent: 0, message: undefined })
    try {
      const { size: _size, ...src } = await uploadImage(item.file, 'gallery', (percent) => patch(item.key, { percent }))
      void _size
      track(item.key, null)
      patch(item.key, null)
      const next = [...valueRef.current, { src, alt: item.alt }]
      valueRef.current = next
      onChange(next)
      return null
    } catch (err) {
      const { message, retryable } = describeUploadError(err, 'Gagal mengunggah foto')
      if (retryable) {
        track(item.key, 'failed')
        patch(item.key, { status: 'failed', message })
        return null
      }
      // Not worth retrying (wrong type, too big): drop it and say why.
      track(item.key, null)
      patch(item.key, null)
      return `${item.file.name}: ${message}`
    }
  }

  async function add(files: FileList | File[] | null, alts: string[] = []) {
    if (!files?.length) return
    setProblem(null)
    const room = GALLERY_MAX - value.length - pending.length
    const list = Array.from(files)
    if (inputRef.current) inputRef.current.value = ''
    const items: PendingUpload[] = list.slice(0, Math.max(0, room)).map((file, i) => ({
      key: `gallery-upload-${++uploadSeq}`,
      file,
      alt: alts[i] ?? '',
      status: 'uploading',
      percent: 0,
    }))
    setPending((p) => [...p, ...items])
    const problems = list.length > room ? [`Maksimal ${GALLERY_MAX} foto`] : []
    for (const item of items) {
      const failure = await uploadOne(item)
      if (failure) problems.push(failure)
    }
    if (problems.length) setProblem(problems.join('; '))
  }

  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const closePicker = useCallback(() => setPicking(false), [])
  async function addSamples(samples: MediaSample[]) {
    let files: File[]
    try {
      files = await Promise.all(samples.map(sampleFile))
    } catch {
      toast('Foto contoh tidak bisa dimuat, coba lagi')
      return
    }
    await add(files, samples.map((x) => x.label))
  }

  function discard(item: PendingUpload) {
    track(item.key, null)
    patch(item.key, null)
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return
    onChange(arrayMove(value, from, to))
  }

  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) move(Number(e.active.id) - 1, Number(e.over.id) - 1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Pilih foto galeri"
          onChange={(e) => void add(e.target.files)}
        />
        <button
          type="button"
          className="btn-outline px-4 py-1 text-sm"
          disabled={value.length + pending.length >= GALLERY_MAX}
          onClick={() => setPicking(true)}
        >
          + Tambah Foto
        </button>
        <span className="text-sm text-muted">
          {value.length}/{GALLERY_MAX} foto
        </span>
      </div>
      {picking && (
        <MediaPickerDialog
          kind="image"
          title="Tambah foto galeri"
          inputId={inputId}
          multiple
          samples={SAMPLE_GALLERY}
          onSamples={(samples) => void addSamples(samples)}
          onClose={closePicker}
        />
      )}
      {pending.length > 0 && (
        <ul className="space-y-1" aria-label="Unggahan foto galeri">
          {pending.map((u) => (
            <li
              key={u.key}
              data-testid="gallery-upload"
              className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{u.file.name}</span>
              {u.status === 'uploading' ? (
                <span className="font-bold text-text" role="status">
                  Mengunggah… {u.percent}%
                </span>
              ) : (
                <>
                  <span className="field-error mt-0" role="alert">
                    {u.message}
                  </span>
                  <button type="button" className="btn-outline px-3 py-0.5 text-sm" onClick={() => void uploadOne(u)}>
                    Coba lagi
                  </button>
                  <button type="button" className="btn-outline px-3 py-0.5 text-sm" onClick={() => discard(u)}>
                    Hapus
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <p className="field-error" role="alert">
          {problem}
        </p>
      )}
      {value.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                'Tekan spasi untuk mengambil foto, gunakan tombol panah untuk memindahkan, lalu spasi lagi untuk meletakkan.',
            },
          }}
        >
          <SortableContext
            items={value.map((_, i) => String(i + 1))}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {value.map((photo, i) => (
                <PhotoItem
                  key={photo.src.src}
                  photo={photo}
                  index={i}
                  count={value.length}
                  error={errors?.[i]}
                  onChange={(p) => onChange(value.map((x, j) => (j === i ? p : x)))}
                  onMove={(to) => move(i, to)}
                  onRemove={() => onChange(value.filter((_, j) => j !== i))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
