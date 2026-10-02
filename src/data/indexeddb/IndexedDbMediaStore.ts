import type { MediaKind, MediaStore, StoredMedia } from '../types'
import { newId, type AdminDatabase, type MediaRecord } from './db'

function withoutBlob({ blob: _blob, ...meta }: MediaRecord): StoredMedia {
  void _blob
  return meta
}

export class IndexedDbMediaStore implements MediaStore {
  private readonly db: Promise<AdminDatabase>

  constructor(db: Promise<AdminDatabase>) {
    this.db = db
  }

  async put(
    coupleId: string,
    blob: Blob,
    meta: { kind: MediaKind; width?: number; height?: number },
  ): Promise<StoredMedia> {
    const record: MediaRecord = {
      id: newId(),
      coupleId,
      kind: meta.kind,
      mime: blob.type || (meta.kind === 'image' ? 'image/jpeg' : 'audio/mpeg'),
      size: blob.size,
      width: meta.width,
      height: meta.height,
      createdAt: new Date().toISOString(),
      blob,
    }
    await (await this.db).put('media', record)
    return withoutBlob(record)
  }

  /** Stores a record as-is (backup restore keeps ids). */
  async putRecord(record: MediaRecord): Promise<void> {
    await (await this.db).put('media', record)
  }

  async getRecord(id: string): Promise<MediaRecord | undefined> {
    return (await this.db).get('media', id)
  }

  async listByCouple(coupleId: string): Promise<MediaRecord[]> {
    return (await this.db).getAllFromIndex('media', 'coupleId', coupleId)
  }

  async getBlob(id: string): Promise<Blob | null> {
    return (await (await this.db).get('media', id))?.blob ?? null
  }

  async remove(id: string): Promise<void> {
    await (await this.db).delete('media', id)
  }

  async removeUnreferenced(coupleId: string, referenced: Set<string>): Promise<number> {
    const db = await this.db
    const tx = db.transaction('media', 'readwrite')
    let removed = 0
    for (const key of await tx.store.index('coupleId').getAllKeys(coupleId)) {
      if (!referenced.has(key)) {
        await tx.store.delete(key)
        removed++
      }
    }
    await tx.done
    return removed
  }

  async usage(): Promise<{ usedBytes: number; quotaBytes: number | null }> {
    try {
      const estimate = await navigator.storage?.estimate?.()
      if (estimate?.usage != null) {
        return { usedBytes: estimate.usage, quotaBytes: estimate.quota ?? null }
      }
    } catch {
      // fall through to counting our own records
    }
    const all = await (await this.db).getAll('media')
    return { usedBytes: all.reduce((n, m) => n + m.size, 0), quotaBytes: null }
  }
}
