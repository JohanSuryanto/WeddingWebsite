// Where photos and music live (contracts/media-upload.md). Cloudinary in production,
// local disk in dev/tests. Files never pass through the API: the browser uploads
// directly with a short-lived ticket, and the server verifies the result.
import type { Env } from '../env'

export type MediaKind = 'image' | 'audio'

export interface UploadTicket {
  /** Where the browser POSTs multipart/form-data. */
  url: string
  /** Extra form fields (signature, timestamp, public_id, …). */
  fields: Record<string, string>
  fileField: string
  expiresAt: string
}

export interface VerifiedUpload {
  bytes: number
  url: string
  width?: number
  height?: number
}

export interface MediaProvider {
  readonly name: 'cloudinary' | 'local'
  createUploadTicket(key: string, kind: MediaKind, maxBytes: number): UploadTicket
  /** Checks the provider's upload result really came from the provider for `key`; throws otherwise. */
  verifyUpload(key: string, result: unknown): Promise<VerifiedUpload>
  /** Server-side upload of bytes already on the server (seed script). */
  upload(key: string, bytes: Uint8Array, kind: MediaKind, mime: string): Promise<VerifiedUpload>
  copy(fromKey: string, toKey: string, kind: MediaKind): Promise<{ url: string }>
  remove(key: string, kind: MediaKind): Promise<void>
  /** Deletes every file whose key starts with `prefix` (couple delete). */
  removePrefix(prefix: string): Promise<void>
  usage(): Promise<{ used: number; limit: number; unit: 'credits' | 'bytes' }>
}

export class UploadVerificationError extends Error {}

/** `<root>/<coupleId>/<mediaId>`: random UUIDs make URLs hard to guess (research R3). */
export function keyFor(root: string, coupleId: string, mediaId: string): string {
  return `${root}/${coupleId}/${mediaId}`
}

export function couplePrefix(root: string, coupleId: string): string {
  return `${root}/${coupleId}/`
}

const KEY_PATTERN = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*\/?$/i

export function isSafeKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.includes('..')
}

export async function createMediaProvider(env: Env): Promise<MediaProvider> {
  if (env.MEDIA_DRIVER === 'cloudinary') {
    const { CloudinaryProvider } = await import('./cloudinary')
    return new CloudinaryProvider(env)
  }
  const { LocalProvider } = await import('./local')
  return new LocalProvider(env.LOCAL_MEDIA_DIR, env.SESSION_SECRET)
}
