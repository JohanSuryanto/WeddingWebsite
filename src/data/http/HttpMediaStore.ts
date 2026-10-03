// Media over the API (contracts/media-upload.md): ask for a ticket, upload the file
// straight to the media host (never through the API), then confirm.
import { ValidationError } from '../../services/types'
import { NetworkError, type MediaKind, type MediaStore, type StoredMedia, type UsageReport } from '../types'
import { apiFetch } from './client'

/** A media file as the admin API returns it. */
export interface MediaInfo {
  id: string
  kind: MediaKind
  mime: string
  size: number
  width?: number
  height?: number
  url: string | null
  status: 'pending' | 'ready'
  createdAt: string
}

interface UploadTicket {
  url: string
  fields: Record<string, string>
  fileField: string
  expiresAt: string
}

interface UsageResponse {
  media: { used: number; limit: number; unit: 'credits' | 'bytes'; warn: boolean }
  database: { usedBytes: number; limitBytes: number; warn: boolean }
}

const MB = 1024 * 1024
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

export function formatBytes(n: number): string {
  if (n >= 1024 * MB) return `${number.format(n / (1024 * MB))} GB`
  if (n >= MB) return `${number.format(n / MB)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

/** POSTs the file with progress events; resolves with the host's JSON result. */
function sendUpload(ticket: UploadTicket, blob: Blob, onProgress?: (percent: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v)
    form.append(ticket.fileField, blob)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', ticket.url)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response)
      const body = xhr.response as { error?: { message?: string } } | null
      if (xhr.status >= 400 && xhr.status < 500 && body?.error?.message) {
        return reject(new ValidationError({}, body.error.message))
      }
      reject(new NetworkError('Gagal mengunggah. Coba lagi.'))
    }
    xhr.onerror = () => reject(new NetworkError('Gagal mengunggah. Coba lagi.'))
    xhr.ontimeout = xhr.onerror
    xhr.send(form)
  })
}

export class HttpMediaStore implements MediaStore {
  private urls = new Map<string, string>()

  /** Remembers delivery URLs from an admin couple response. */
  prime(map: Record<string, MediaInfo>) {
    for (const m of Object.values(map)) if (m.status === 'ready' && m.url) this.urls.set(m.id, m.url)
  }

  urlOf(id: string): string | undefined {
    return this.urls.get(id)
  }

  async put(
    coupleId: string,
    blob: Blob,
    meta: { kind: MediaKind; width?: number; height?: number; onProgress?: (percent: number) => void; id?: string },
  ): Promise<StoredMedia> {
    const mime = blob.type || (meta.kind === 'image' ? 'image/jpeg' : 'audio/mpeg')
    const { media, upload } = await apiFetch<{ media: MediaInfo; upload: UploadTicket }>(
      `/admin/couples/${coupleId}/media`,
      {
        method: 'POST',
        body: { kind: meta.kind, mime, size: blob.size, width: meta.width, height: meta.height, id: meta.id },
      },
    )
    const result = await sendUpload(upload, blob, meta.onProgress)
    const done = await apiFetch<{ media: MediaInfo }>(`/admin/media/${media.id}/complete`, {
      method: 'POST',
      body: result,
    })
    if (done.media.url) this.urls.set(done.media.id, done.media.url)
    const { id, kind, size, width, height, createdAt } = done.media
    return { id, coupleId, kind, mime: done.media.mime, size, width, height, createdAt }
  }

  async getBlob(id: string): Promise<Blob | null> {
    const url = this.urls.get(id)
    if (!url) return null
    try {
      const res = await fetch(url)
      return res.ok ? await res.blob() : null
    } catch {
      return null
    }
  }

  async remove(id: string): Promise<void> {
    this.urls.delete(id)
    await apiFetch(`/admin/media/${id}`, { method: 'DELETE' }).catch((err) => {
      if ((err as Error).name !== 'NotFoundError') throw err
    })
  }

  async removeUnreferenced(coupleId: string, referenced: Set<string>): Promise<number> {
    const { removed } = await apiFetch<{ removed: number }>(`/admin/couples/${coupleId}/media/prune`, {
      method: 'POST',
      body: { referenced: [...referenced] },
    })
    return removed
  }

  async usage(): Promise<UsageReport> {
    const { media, database } = await apiFetch<UsageResponse>('/admin/usage')
    const percent = media.limit ? Math.min(100, (media.used / media.limit) * 100) : 0
    const label =
      media.unit === 'credits'
        ? `Kuota media: ${number.format(media.used)} dari ${number.format(media.limit)} kredit`
        : `Media: ${formatBytes(media.used)} dari ${formatBytes(media.limit)}`
    return {
      usedBytes: media.unit === 'bytes' ? media.used : 0,
      quotaBytes: media.unit === 'bytes' ? media.limit : null,
      percent,
      warn: media.warn,
      label,
      database: {
        label: `Database: ${formatBytes(database.usedBytes)} dari ${formatBytes(database.limitBytes)}`,
        percent: database.limitBytes ? Math.min(100, (database.usedBytes / database.limitBytes) * 100) : 0,
        warn: database.warn,
      },
    }
  }
}

export const httpMediaStore = new HttpMediaStore()
