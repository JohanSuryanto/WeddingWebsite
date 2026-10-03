// Browser-driven export (contracts/backup-format.md § Export): the server sends
// everything but file bytes; the browser fetches each file from its URL.
import { blobToBase64, type BackupDocument } from '../../data/backup'
import { apiFetch } from '../../data/http/client'

type ExportedMedia = Omit<BackupDocument['media'][number], 'data'> & { url: string | null }
type ExportDoc = Omit<BackupDocument, 'media'> & { media: ExportedMedia[] }

export class ExportError extends Error {}

/**
 * The full v2 backup as one JSON Blob. A file deleted by an edit made during the
 * export gets one fresh attempt; a file still missing then aborts with its couple named.
 */
export async function runExport(onProgress: (done: number, total: number) => void): Promise<Blob> {
  try {
    return await exportOnce(onProgress)
  } catch (err) {
    if (!(err instanceof ExportError)) throw err
    return exportOnce(onProgress)
  }
}

async function exportOnce(onProgress: (done: number, total: number) => void): Promise<Blob> {
  const doc = await apiFetch<ExportDoc>('/admin/export')
  const names = new Map(doc.couples.map((c) => [c.id, c.slug]))
  const media: BackupDocument['media'] = []
  onProgress(0, doc.media.length)
  for (const [i, m] of doc.media.entries()) {
    const label = `${m.kind === 'audio' ? 'musik' : 'foto'} milik ${names.get(m.coupleId) ?? m.coupleId}`
    let blob: Blob
    try {
      const res = await fetch(m.url ?? '')
      if (!res.ok) throw new Error(String(res.status))
      blob = await res.blob()
    } catch {
      throw new ExportError(`Gagal mengunduh ${label}`)
    }
    if (blob.size !== m.size) throw new ExportError(`Ukuran ${label} tidak cocok`)
    const { url: _url, ...meta } = m
    void _url
    media.push({ ...meta, data: await blobToBase64(blob) })
    onProgress(i + 1, doc.media.length)
  }
  const full: BackupDocument = { ...doc, media }
  return new Blob([JSON.stringify(full)], { type: 'application/json' })
}
