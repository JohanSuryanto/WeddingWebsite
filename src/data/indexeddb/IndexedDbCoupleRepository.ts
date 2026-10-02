import { mainEvent, orderedCouple } from '../../content/selectors'
import { collectMediaRefs, rewriteMediaRefs } from '../resolveMedia'
import { uniqueSlug, validateSlug } from '../slug'
import {
  ConflictError,
  NotFoundError,
  SlugTakenError,
  type Couple,
  type CoupleRepository,
  type CoupleStatus,
  type CoupleSummary,
  type NewCouple,
} from '../types'
import { newId, type AdminDatabase, type MediaRecord } from './db'
import type { IndexedDbMediaStore } from './IndexedDbMediaStore'

function summarize(c: Couple): CoupleSummary {
  const [a, b] = orderedCouple(c.content)
  return {
    id: c.id,
    slug: c.slug,
    status: c.status,
    defaultTheme: c.defaultTheme,
    updatedAt: c.updatedAt,
    names: `${a.nickname || '?'} & ${b.nickname || '?'}`,
    mainDate: mainEvent(c.content)?.start || null,
    coverSrc: c.content.cover.background.src || null,
  }
}

/** Admin-site repository backed by IndexedDB (contracts/data-layer.md). */
export class IndexedDbCoupleRepository implements CoupleRepository {
  private readonly db: Promise<AdminDatabase>
  private readonly media: IndexedDbMediaStore

  constructor(db: Promise<AdminDatabase>, media: IndexedDbMediaStore) {
    this.db = db
    this.media = media
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    if (validateSlug(slug)) throw new SlugTakenError(validateSlug(slug)!)
    const existing = await (await this.db).getFromIndex('couples', 'slug', slug)
    if (existing && existing.id !== exceptId) throw new SlugTakenError()
  }

  async list(): Promise<CoupleSummary[]> {
    const all = await (await this.db).getAll('couples')
    return all.map(summarize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: string): Promise<Couple> {
    const c = await (await this.db).get('couples', id)
    if (!c) throw new NotFoundError()
    return c
  }

  async findBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<Couple | null> {
    const c = await (await this.db).getFromIndex('couples', 'slug', slug)
    if (!c) return null
    return c.status === 'active' || opts?.includeDrafts ? c : null
  }

  async create(input: NewCouple): Promise<Couple> {
    await this.assertSlugFree(input.slug)
    const now = new Date().toISOString()
    const couple: Couple = {
      id: newId(),
      slug: input.slug,
      status: 'draft',
      defaultTheme: input.defaultTheme,
      content: input.content,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    await (await this.db).add('couples', couple)
    return couple
  }

  /** Writes a couple as-is (seed and backup restore). */
  async putRaw(couple: Couple): Promise<void> {
    await (await this.db).put('couples', couple)
  }

  async update(id: string, patch: Partial<NewCouple>, expectedVersion: number): Promise<Couple> {
    const current = await this.get(id)
    if (current.version !== expectedVersion) throw new ConflictError()
    if (patch.slug !== undefined && patch.slug !== current.slug) {
      await this.assertSlugFree(patch.slug, id)
    }
    const next: Couple = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    }
    const db = await this.db
    const tx = db.transaction('couples', 'readwrite')
    const stored = await tx.store.get(id)
    if (!stored || stored.version !== expectedVersion) {
      tx.done.catch(() => {}) // abort rejects tx.done; the ConflictError below is the result
      tx.abort()
      throw new ConflictError()
    }
    await tx.store.put(next)
    await tx.done
    await this.media.removeUnreferenced(id, collectMediaRefs(next.content))
    return next
  }

  async setStatus(id: string, status: CoupleStatus): Promise<Couple> {
    const current = await this.get(id)
    const next = {
      ...current,
      status,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    }
    await (await this.db).put('couples', next)
    return next
  }

  async duplicate(id: string): Promise<Couple> {
    const source = await this.get(id)
    const db = await this.db
    const slug = await uniqueSlug(
      source.slug,
      async (s) => !!(await db.getFromIndex('couples', 'slug', s)),
    )
    const copyId = newId()
    const idMap = new Map<string, string>()
    for (const oldId of collectMediaRefs(source.content)) {
      const record = await this.media.getRecord(oldId)
      if (!record) continue
      const newMediaId = newId()
      idMap.set(oldId, newMediaId)
      await this.media.putRecord({ ...record, id: newMediaId, coupleId: copyId })
    }
    const now = new Date().toISOString()
    const copy: Couple = {
      ...source,
      id: copyId,
      slug,
      status: 'draft',
      content: rewriteMediaRefs(source.content, idMap),
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    await db.add('couples', copy)
    return copy
  }

  async remove(id: string): Promise<void> {
    const db = await this.db
    const tx = db.transaction(['couples', 'media'], 'readwrite')
    await tx.objectStore('couples').delete(id)
    const media = tx.objectStore('media')
    for (const key of await media.index('coupleId').getAllKeys(id)) await media.delete(key)
    await tx.done
  }

  /** Writes a couple and its media in one transaction (backup restore). */
  async putWithMedia(couple: Couple, records: MediaRecord[]): Promise<void> {
    const db = await this.db
    const tx = db.transaction(['couples', 'media'], 'readwrite')
    for (const record of records) await tx.objectStore('media').put(record)
    await tx.objectStore('couples').put(couple)
    await tx.done
  }

  /** Deletes everything (backup "replace all"). */
  async clearAll(): Promise<void> {
    const db = await this.db
    const tx = db.transaction(['couples', 'media'], 'readwrite')
    await tx.objectStore('couples').clear()
    await tx.objectStore('media').clear()
    await tx.done
  }
}
