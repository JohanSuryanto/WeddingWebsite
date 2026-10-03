// Error envelope shared by every endpoint (contracts/api.md § Conventions).
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: string
  readonly fields?: FieldErrors
  readonly retryAt?: Date
  readonly extra?: Record<string, unknown>

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    opts: { fields?: FieldErrors; retryAt?: Date; extra?: Record<string, unknown> } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = opts.fields
    this.retryAt = opts.retryAt
    this.extra = opts.extra
  }
}

type Opts = { fields?: FieldErrors; retryAt?: Date; extra?: Record<string, unknown> }

export const invalidBody = (fields?: FieldErrors, message = 'Data yang dikirim tidak valid') =>
  new ApiError(400, 'invalid_body', message, { fields })
export const unauthenticated = (message = 'Silakan masuk terlebih dahulu') =>
  new ApiError(401, 'unauthenticated', message)
export const badOrigin = () => new ApiError(403, 'bad_origin', 'Permintaan ditolak')
export const unavailable = (message = 'Undangan belum tersedia') => new ApiError(403, 'unavailable', message)
export const notFound = (message = 'Tidak ditemukan') => new ApiError(404, 'not_found', message)
export const conflict = (message = 'Data pasangan ini sudah diubah di tab lain.') =>
  new ApiError(409, 'conflict', message)
export const slugTaken = (message = 'Nama alamat sudah dipakai pasangan lain') =>
  new ApiError(409, 'slug_taken', message, { fields: { slug: message } })
export const tooLarge = () => new ApiError(413, 'too_large', 'Data yang dikirim terlalu besar')
export const validation = (message: string, opts: Opts = {}) => new ApiError(422, 'validation', message, opts)
export const slugReserved = (message = 'Nama alamat ini dipakai oleh sistem') =>
  new ApiError(422, 'slug_reserved', message, { fields: { slug: message } })
export const mediaNotReady = (missing: string[]) =>
  new ApiError(422, 'media_not_ready', 'Ada foto atau musik yang belum selesai diunggah', {
    extra: { media: missing },
  })
export const limitExceeded = (message: string) => new ApiError(422, 'limit_exceeded', message)
export const notPublishable = (message: string) => new ApiError(422, 'not_publishable', message)
export const locked = (message: string, retryAt: Date) => new ApiError(423, 'locked', message, { retryAt })
export const rateLimited = (retryAt: Date, message = 'Terlalu banyak pesan, coba lagi nanti') =>
  new ApiError(429, 'rate_limited', message, { retryAt })

export function errorBody(err: ApiError) {
  return {
    error: {
      code: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
      ...(err.retryAt ? { retryAt: err.retryAt.toISOString() } : {}),
      ...(err.extra ?? {}),
    },
  }
}

/** Hono onError handler: ApiError → envelope; anything else → logged 500. */
export function toResponse(err: Error, c: Context) {
  c.header('Cache-Control', 'no-store')
  if (err instanceof ApiError) return c.json(errorBody(err), err.status)
  console.error('[api] unhandled error', err)
  return c.json({ error: { code: 'internal', message: 'Terjadi kesalahan di server' } }, 500)
}
