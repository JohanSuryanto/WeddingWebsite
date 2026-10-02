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
import { useId, useRef, useState } from 'react'
import type { GalleryPhoto } from '../../content/types'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { UploadError, useMediaSession } from './MediaSession'

export const GALLERY_MAX = 30

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
  const { uploadImage } = useMediaSession()
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function add(files: FileList | null) {
    if (!files?.length) return
    setProblem(null)
    const room = GALLERY_MAX - value.length
    const list = Array.from(files)
    if (list.length > room) setProblem(`Maksimal ${GALLERY_MAX} foto`)
    let next = value
    const failures: string[] = []
    for (const [i, file] of list.slice(0, Math.max(0, room)).entries()) {
      setBusy(`Memproses ${i + 1} dari ${Math.min(list.length, room)}…`)
      try {
        const { size: _size, ...src } = await uploadImage(file, 'gallery')
        void _size
        next = [...next, { src, alt: '' }]
        onChange(next)
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof UploadError ? err.message : 'gagal'}`)
      }
    }
    if (failures.length) setProblem(failures.join('; '))
    setBusy(null)
    if (inputRef.current) inputRef.current.value = ''
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
        <label
          htmlFor={inputId}
          className={`btn-outline cursor-pointer px-4 py-1 text-sm ${value.length >= GALLERY_MAX ? 'pointer-events-none opacity-50' : ''}`}
        >
          + Tambah Foto
        </label>
        <span className="text-sm text-muted">
          {value.length}/{GALLERY_MAX} foto
        </span>
        {busy && <span className="text-sm font-bold text-text">{busy}</span>}
      </div>
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
