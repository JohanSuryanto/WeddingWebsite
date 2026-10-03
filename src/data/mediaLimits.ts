// Upload limits shared by the dashboard and the server (002 FR-016, 003 FR-012).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024
export const MAX_GALLERY = 30

/** Photos are re-encoded in the browser before upload, so only these arrive. */
export const IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png'] as const

export const maxBytesFor = (kind: 'image' | 'audio') => (kind === 'audio' ? MAX_AUDIO_BYTES : MAX_UPLOAD_BYTES)

/** Indonesian message when a file breaks the limits, else null. Audio: any audio/* type, like the dashboard. */
export function checkMediaLimits(kind: 'image' | 'audio', mime: string, size: number): string | null {
  const ok = kind === 'image' ? (IMAGE_MIMES as readonly string[]).includes(mime) : mime.startsWith('audio/')
  if (!ok) return 'Jenis file tidak didukung'
  if (size > maxBytesFor(kind)) return 'Ukuran maksimal 10 MB'
  return null
}
