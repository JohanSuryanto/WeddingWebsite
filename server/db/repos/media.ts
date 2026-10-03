// Media rows and the deletion queue (data-model.md § media, media_deletions).
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, lt, notInArray, sql } from 'drizzle-orm'
import type { WeddingContent } from '../../../src/content/types'
import { MAX_GALLERY } from '../../../src/data/mediaLimits'
import { collectMediaRefs } from '../../../src/data/resolveMedia'
import { limitExceeded, mediaNotReady } from '../../http/errors'
import { couplePrefix, type MediaKind, type MediaProvider, type VerifiedUpload } from '../../media/provider'
import type { Db } from '../client'
import { media, mediaDeletions, type MediaRow } from '../schema'

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

export function toInfo(row: MediaRow): MediaInfo {
  return {
    id: row.id,
    kind: row.kind,
    mime: row.mime,
    size: row.size,
    ...(row.width != null ? { width: row.width } : {}),
    ...(row.height != null ? { height: row.height } : {}),
    url: row.url,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function createPending(
  db: Db,
  input: { coupleId: string; kind: MediaKind; mime: string; size: number; width?: number; height?: number },
  keyOf: (mediaId: string) => string,
  id: string = randomUUID(),
): Promise<MediaRow> {
  const [row] = await db
    .insert(media)
    .values({ id, ...input, providerKey: keyOf(id), status: 'pending' })
    .returning()
  return row
}

export async function markReady(db: Db, id: string, verified: VerifiedUpload): Promise<MediaRow> {
  const [row] = await db
    .update(media)
    .set({
      status: 'ready',
      url: verified.url,
      size: verified.bytes,
      ...(verified.width ? { width: verified.width } : {}),
      ...(verified.height ? { height: verified.height } : {}),
    })
    .where(eq(media.id, id))
    .returning()
  return row
}

export async function getMedia(db: Db, id: string): Promise<MediaRow | undefined> {
  const [row] = await db.select().from(media).where(eq(media.id, id))
  return row
}

export async function listForCouple(db: Db, coupleId: string): Promise<MediaRow[]> {
  return db.select().from(media).where(eq(media.coupleId, coupleId)).orderBy(media.createdAt)
}

/** { id: MediaInfo } for every file of the couple (admin couple responses). */
export async function mediaMap(db: Db, coupleId: string): Promise<Record<string, MediaInfo>> {
  return Object.fromEntries((await listForCouple(db, coupleId)).map((r) => [r.id, toInfo(r)]))
}

export async function readyUrls(db: Db, coupleId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: media.id, url: media.url })
    .from(media)
    .where(and(eq(media.coupleId, coupleId), eq(media.status, 'ready')))
  return new Map(rows.filter((r) => r.url).map((r) => [r.id, r.url!]))
}

/** Every `media:<id>` in the content must be ready and belong to this couple (FR-015). */
export async function assertReferencesReady(db: Db, coupleId: string, content: WeddingContent) {
  const refs = [...collectMediaRefs(content)]
  if (!refs.length) return
  const rows = await db
    .select({ id: media.id })
    .from(media)
    .where(and(inArray(media.id, refs), eq(media.coupleId, coupleId), eq(media.status, 'ready')))
  const ok = new Set(rows.map((r) => r.id))
  const missing = refs.filter((id) => !ok.has(id))
  if (missing.length) throw mediaNotReady(missing)
}

/** ≤ 30 gallery photos (the schema checks this too, but create/import only check structure). */
export function assertContentLimits(content: WeddingContent) {
  if ((content.gallery?.length ?? 0) > MAX_GALLERY) throw limitExceeded(`Maksimal ${MAX_GALLERY} foto galeri`)
}

const resourceTypeOf = (kind: MediaKind): 'image' | 'video' => (kind === 'audio' ? 'video' : 'image')

type Deletion = { providerKey: string; resourceType: 'image' | 'video' | 'prefix' }

export async function queueDeletions(db: Db, items: Deletion[]) {
  if (!items.length) return
  await db.insert(mediaDeletions).values(items).onConflictDoNothing()
}

/**
 * Deletes queued files from the provider (all, or only `keys`). Successful ones
 * leave the queue; failures stay for the daily cron (research R9).
 */
export async function flushDeletions(db: Db, provider: MediaProvider, keys?: string[]): Promise<number> {
  if (keys && !keys.length) return 0
  const queued = await db
    .select()
    .from(mediaDeletions)
    .where(keys ? inArray(mediaDeletions.providerKey, keys) : undefined)
  let done = 0
  for (const item of queued) {
    try {
      if (item.resourceType === 'prefix') await provider.removePrefix(item.providerKey)
      else await provider.remove(item.providerKey, item.resourceType === 'video' ? 'audio' : 'image')
      await db.delete(mediaDeletions).where(eq(mediaDeletions.providerKey, item.providerKey))
      done++
    } catch (err) {
      console.error('[media] delete failed, will retry', item.providerKey, err)
      await db
        .update(mediaDeletions)
        .set({ attempts: sql`${mediaDeletions.attempts} + 1` })
        .where(eq(mediaDeletions.providerKey, item.providerKey))
    }
  }
  return done
}

/** Removes rows and their files (queued first, then attempted right away). */
export async function deleteMediaRows(db: Db, provider: MediaProvider, rows: MediaRow[]): Promise<number> {
  if (!rows.length) return 0
  const items = rows.map((r) => ({ providerKey: r.providerKey, resourceType: resourceTypeOf(r.kind) }))
  await db.transaction(async (tx) => {
    await queueDeletions(tx as unknown as Db, items)
    await tx.delete(media).where(inArray(media.id, rows.map((r) => r.id)))
  })
  await flushDeletions(db, provider, items.map((i) => i.providerKey))
  return rows.length
}

/** Deletes this couple's ready media that the content no longer references. */
export async function pruneUnreferenced(
  db: Db,
  provider: MediaProvider,
  coupleId: string,
  referenced: Set<string>,
): Promise<number> {
  const ids = [...referenced]
  const rows = await db
    .select()
    .from(media)
    .where(
      and(
        eq(media.coupleId, coupleId),
        eq(media.status, 'ready'),
        ids.length ? notInArray(media.id, ids) : undefined,
      ),
    )
  return deleteMediaRows(db, provider, rows)
}

/** Queues the couple's whole folder for deletion (couple delete). Call flushDeletions after commit. */
export function couplePrefixDeletion(root: string, coupleId: string): Deletion {
  return { providerKey: couplePrefix(root, coupleId), resourceType: 'prefix' }
}

/** Pending uploads older than `hours` (never completed). */
export async function stalePending(db: Db, hours = 24, now = new Date()): Promise<MediaRow[]> {
  const before = new Date(now.getTime() - hours * 3_600_000)
  return db
    .select()
    .from(media)
    .where(and(eq(media.status, 'pending'), lt(media.createdAt, before)))
}
