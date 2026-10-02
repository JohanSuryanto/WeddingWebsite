import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Couple, StoredMedia } from '../types'

export interface MediaRecord extends StoredMedia {
  blob: Blob
}

interface AdminDb extends DBSchema {
  couples: { key: string; value: Couple; indexes: { slug: string } }
  media: { key: string; value: MediaRecord; indexes: { coupleId: string } }
}

export type AdminDatabase = IDBPDatabase<AdminDb>

export const DB_NAME = 'wedding-admin'

/** Admin site storage (contracts/data-layer.md): couples + media blobs. */
export function openAdminDb(name = DB_NAME): Promise<AdminDatabase> {
  return openDB<AdminDb>(name, 1, {
    upgrade(db) {
      const couples = db.createObjectStore('couples', { keyPath: 'id' })
      couples.createIndex('slug', 'slug', { unique: true })
      const media = db.createObjectStore('media', { keyPath: 'id' })
      media.createIndex('coupleId', 'coupleId')
    },
  })
}

export function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}
