// Local-disk media for dev and tests (MEDIA_DRIVER=local, research R10).
// Uploads go to /api/dev/media/upload/<key> (server/routes/devMedia.ts) and are
// served from /api/dev/media/<key>.
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { hmac, safeEqual } from '../http/cookies'
import {
  isSafeKey,
  type MediaKind,
  type MediaProvider,
  type UploadTicket,
  UploadVerificationError,
  type VerifiedUpload,
} from './provider'

export interface LocalSidecar {
  bytes: number
  mime: string
}

export const LOCAL_UPLOAD_TTL_MS = 10 * 60_000
const NOMINAL_LIMIT = 1024 ** 3 // 1 GB, for the usage meter

export class LocalProvider implements MediaProvider {
  readonly name = 'local' as const
  readonly root: string
  private readonly secret: string

  constructor(dir: string, secret: string) {
    this.root = resolve(dir)
    this.secret = secret
  }

  url(key: string) {
    return `/api/dev/media/${key}`
  }

  path(key: string) {
    if (!isSafeKey(key)) throw new UploadVerificationError('Kunci media tidak valid')
    return join(this.root, ...key.split('/'))
  }

  /** Signature over what the upload route accepts. */
  ticketSignature(key: string, maxBytes: number, exp: number) {
    return hmac(this.secret, `upload|${key}|${maxBytes}|${exp}`)
  }

  /** Signature over what the upload route stored; returned to the browser as the "provider result". */
  resultSignature(key: string, bytes: number) {
    return hmac(this.secret, `result|${key}|${bytes}`)
  }

  createUploadTicket(key: string, _kind: MediaKind, maxBytes: number): UploadTicket {
    const exp = Date.now() + LOCAL_UPLOAD_TTL_MS
    return {
      url: `/api/dev/media/upload/${key}`,
      fields: { maxBytes: String(maxBytes), exp: String(exp), sig: this.ticketSignature(key, maxBytes, exp) },
      fileField: 'file',
      expiresAt: new Date(exp).toISOString(),
    }
  }

  /** Called by the dev upload route after checking the ticket. */
  async store(key: string, bytes: Uint8Array, mime: string) {
    const file = this.path(key)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, bytes)
    await writeFile(`${file}.json`, JSON.stringify({ bytes: bytes.byteLength, mime } satisfies LocalSidecar))
    return { key, bytes: bytes.byteLength, mime, signature: this.resultSignature(key, bytes.byteLength) }
  }

  async readSidecar(key: string): Promise<LocalSidecar | null> {
    try {
      return JSON.parse(await readFile(`${this.path(key)}.json`, 'utf8')) as LocalSidecar
    } catch {
      return null
    }
  }

  async verifyUpload(key: string, result: unknown): Promise<VerifiedUpload> {
    const r = result as { key?: unknown; bytes?: unknown; signature?: unknown } | null
    if (!r || r.key !== key || typeof r.bytes !== 'number' || typeof r.signature !== 'string') {
      throw new UploadVerificationError('Hasil unggahan tidak cocok')
    }
    if (!safeEqual(r.signature, this.resultSignature(key, r.bytes))) {
      throw new UploadVerificationError('Tanda tangan unggahan tidak cocok')
    }
    const sidecar = await this.readSidecar(key)
    if (!sidecar || sidecar.bytes !== r.bytes) throw new UploadVerificationError('File unggahan tidak ditemukan')
    return { bytes: r.bytes, url: this.url(key) }
  }

  async upload(key: string, bytes: Uint8Array, _kind: MediaKind, mime: string): Promise<VerifiedUpload> {
    await this.store(key, bytes, mime)
    return { bytes: bytes.byteLength, url: this.url(key) }
  }

  async copy(fromKey: string, toKey: string): Promise<{ url: string }> {
    const to = this.path(toKey)
    await mkdir(dirname(to), { recursive: true })
    await copyFile(this.path(fromKey), to)
    await copyFile(`${this.path(fromKey)}.json`, `${to}.json`)
    return { url: this.url(toKey) }
  }

  async remove(key: string): Promise<void> {
    const file = this.path(key)
    await rm(file, { force: true })
    await rm(`${file}.json`, { force: true })
  }

  async removePrefix(prefix: string): Promise<void> {
    await rm(this.path(prefix.replace(/\/+$/, '')), { recursive: true, force: true })
  }

  async usage() {
    return { used: await dirSize(this.root), limit: NOMINAL_LIMIT, unit: 'bytes' as const }
  }
}

async function dirSize(dir: string): Promise<number> {
  let total = 0
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) total += await dirSize(p)
    else if (!e.name.endsWith('.json')) total += (await stat(p)).size
  }
  return total
}
