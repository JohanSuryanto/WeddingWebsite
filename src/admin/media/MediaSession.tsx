import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ImageRef, WeddingContent } from '../../content/types'
import { mediaStore } from '../../data/index.admin'
import { collectMediaRefs, mediaRef } from '../../data/resolveMedia'
import { compressImage, validateUpload, type ImagePreset } from './compressImage'

// eslint-disable-next-line react-refresh/only-export-components
export class UploadError extends Error {}

export type UploadStatus = 'uploading' | 'failed'
type Progress = (percent: number) => void

interface MediaSessionValue {
  /** blob: URLs for media uploaded in this session (by media id). */
  urls: ReadonlyMap<string, string>
  uploadImage(file: File, preset: ImagePreset, onProgress?: Progress): Promise<ImageRef & { size: number }>
  uploadAudio(file: File, onProgress?: Progress): Promise<{ src: string; size: number }>
  /** Fields report uploads in flight or failed; null clears (FR-015). */
  track(key: string, status: UploadStatus | null): void
  /** True while any upload is running or failed: saving would lose or miss files. */
  blocking: boolean
  /** Call after a save so cleanup on leave keeps what the couple now uses. */
  markSaved(content: WeddingContent): void
}

const MediaSessionContext = createContext<MediaSessionValue | null>(null)

/**
 * Uploads for one couple while its editor is open. Validates, compresses and
 * stores files; on leave, deletes uploads the saved couple doesn't reference.
 */
export function MediaSessionProvider({
  coupleId,
  savedContent,
  children,
}: {
  coupleId: string
  savedContent: WeddingContent
  children: ReactNode
}) {
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [uploads, setUploads] = useState<ReadonlyMap<string, UploadStatus>>(() => new Map())
  const uploaded = useRef<string[]>([])
  const saved = useRef(collectMediaRefs(savedContent))
  const urlsRef = useRef(urls)
  useEffect(() => {
    urlsRef.current = urls
  }, [urls])

  useEffect(() => {
    const uploadedNow = uploaded
    const savedNow = saved
    return () => {
      for (const id of uploadedNow.current) {
        if (!savedNow.current.has(id)) void mediaStore.remove(id)
      }
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [coupleId])

  const remember = useCallback((id: string, blob: Blob) => {
    uploaded.current.push(id)
    setUrls((prev) => new Map(prev).set(id, URL.createObjectURL(blob)))
  }, [])

  const track = useCallback((key: string, status: UploadStatus | null) => {
    setUploads((prev) => {
      if ((prev.get(key) ?? null) === status) return prev
      const next = new Map(prev)
      if (status) next.set(key, status)
      else next.delete(key)
      return next
    })
  }, [])

  const value = useMemo<MediaSessionValue>(
    () => ({
      urls,
      track,
      blocking: uploads.size > 0,
      async uploadImage(file, preset, onProgress) {
        const problem = validateUpload(file, 'image')
        if (problem) throw new UploadError(problem)
        let result
        try {
          result = await compressImage(file, preset)
        } catch {
          throw new UploadError('Foto tidak bisa dibaca')
        }
        const stored = await mediaStore.put(coupleId, result.blob, {
          kind: 'image',
          width: result.width,
          height: result.height,
          onProgress,
        })
        remember(stored.id, result.blob)
        return {
          src: mediaRef(stored.id),
          width: result.width,
          height: result.height,
          size: stored.size,
        }
      },
      async uploadAudio(file, onProgress) {
        const problem = validateUpload(file, 'audio')
        if (problem) throw new UploadError(problem)
        const stored = await mediaStore.put(coupleId, file, { kind: 'audio', onProgress })
        remember(stored.id, file)
        return { src: mediaRef(stored.id), size: stored.size }
      },
      markSaved(content) {
        saved.current = collectMediaRefs(content)
      },
    }),
    [urls, coupleId, remember, track, uploads],
  )

  return <MediaSessionContext.Provider value={value}>{children}</MediaSessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaSession(): MediaSessionValue {
  const ctx = useContext(MediaSessionContext)
  if (!ctx) throw new Error('useMediaSession() must be used inside <MediaSessionProvider>')
  return ctx
}
