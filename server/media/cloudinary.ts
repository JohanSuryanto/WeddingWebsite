// Cloudinary Free (production media, research R3, contracts/media-upload.md).
// Signed direct uploads from the browser; the upload response is verified with
// our API secret instead of a rate-limited Admin API call.
import { createHash } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import type { Env } from '../env'
import { safeEqual } from '../http/cookies'
import {
  type MediaKind,
  type MediaProvider,
  type UploadTicket,
  UploadVerificationError,
  type VerifiedUpload,
} from './provider'

const TICKET_TTL_MS = 10 * 60_000

/** Audio is a `video` resource on Cloudinary. */
export const resourceType = (kind: MediaKind) => (kind === 'audio' ? 'video' : 'image')

export class CloudinaryProvider implements MediaProvider {
  readonly name = 'cloudinary' as const
  private readonly cloud: string
  private readonly apiKey: string
  private readonly secret: string

  constructor(env: Pick<Env, 'CLOUDINARY_CLOUD_NAME' | 'CLOUDINARY_API_KEY' | 'CLOUDINARY_API_SECRET'>) {
    this.cloud = env.CLOUDINARY_CLOUD_NAME!
    this.apiKey = env.CLOUDINARY_API_KEY!
    this.secret = env.CLOUDINARY_API_SECRET!
    cloudinary.config({ cloud_name: this.cloud, api_key: this.apiKey, api_secret: this.secret, secure: true })
  }

  createUploadTicket(key: string, kind: MediaKind): UploadTicket {
    const timestamp = Math.floor(Date.now() / 1000)
    const signed = { public_id: key, timestamp, overwrite: 'false' }
    const signature = cloudinary.utils.api_sign_request(signed, this.secret)
    return {
      url: `https://api.cloudinary.com/v1_1/${this.cloud}/${resourceType(kind)}/upload`,
      fields: {
        api_key: this.apiKey,
        timestamp: String(timestamp),
        public_id: key,
        overwrite: 'false',
        signature,
      },
      fileField: 'file',
      expiresAt: new Date(Date.now() + TICKET_TTL_MS).toISOString(),
    }
  }

  /** Cloudinary signs `public_id=…&version=…` + api_secret (SHA-1) in every upload response. */
  responseSignature(publicId: string, version: string | number) {
    return createHash('sha1').update(`public_id=${publicId}&version=${version}${this.secret}`).digest('hex')
  }

  async verifyUpload(key: string, result: unknown): Promise<VerifiedUpload> {
    const r = result as {
      public_id?: unknown
      version?: unknown
      signature?: unknown
      bytes?: unknown
      secure_url?: unknown
      width?: unknown
      height?: unknown
    } | null
    if (
      !r ||
      r.public_id !== key ||
      (typeof r.version !== 'number' && typeof r.version !== 'string') ||
      typeof r.signature !== 'string' ||
      typeof r.bytes !== 'number' ||
      typeof r.secure_url !== 'string'
    ) {
      throw new UploadVerificationError('Hasil unggahan tidak cocok')
    }
    if (!safeEqual(r.signature, this.responseSignature(key, r.version))) {
      throw new UploadVerificationError('Tanda tangan unggahan tidak cocok')
    }
    return {
      bytes: r.bytes,
      url: r.secure_url,
      width: typeof r.width === 'number' ? r.width : undefined,
      height: typeof r.height === 'number' ? r.height : undefined,
    }
  }

  async upload(key: string, bytes: Uint8Array, kind: MediaKind, mime: string): Promise<VerifiedUpload> {
    const dataUri = `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
    const res = await cloudinary.uploader.upload(dataUri, {
      public_id: key,
      resource_type: resourceType(kind),
      overwrite: false,
    })
    return { bytes: res.bytes, url: res.secure_url, width: res.width, height: res.height }
  }

  async copy(fromKey: string, toKey: string, kind: MediaKind): Promise<{ url: string }> {
    const type = resourceType(kind)
    const source = cloudinary.url(fromKey, { resource_type: type, secure: true })
    const res = await cloudinary.uploader.upload(source, { public_id: toKey, resource_type: type, overwrite: false })
    return { url: res.secure_url }
  }

  async remove(key: string, kind: MediaKind): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: resourceType(kind), invalidate: true })
  }

  async removePrefix(prefix: string): Promise<void> {
    for (const type of ['image', 'video'] as const) {
      await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: type })
    }
  }

  async usage() {
    const u = (await cloudinary.api.usage()) as {
      credits?: { usage?: number; limit?: number }
      storage?: { usage?: number }
    }
    if (u.credits?.limit) return { used: u.credits.usage ?? 0, limit: u.credits.limit, unit: 'credits' as const }
    // Plans without a credits block: report storage against 25 GB.
    return { used: u.storage?.usage ?? 0, limit: 25 * 1024 ** 3, unit: 'bytes' as const }
  }
}
