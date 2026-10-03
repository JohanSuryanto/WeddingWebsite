// Couples (data-model.md § couples). Content rules depend on the action:
// create/duplicate/import → structure only; PATCH and publish → full rules.
import { randomUUID } from 'node:crypto'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { mainEvent, orderedCouple } from '../../../src/content/selectors'
import type { WeddingContent } from '../../../src/content/types'
import { randomPasscode } from '../../../src/data/passcode'
import { isMediaRef, mediaId, rewriteMediaRefs } from '../../../src/data/resolveMedia'
import { firstContentProblem, storedContentSchema, weddingContentSchema } from '../../../src/data/schema'
import { isReservedSlug, uniqueSlug, validateSlug } from '../../../src/data/slug'
import type { Couple, CoupleStatus, CoupleSummary } from '../../../src/data/types'
import type { ThemeId } from '../../../src/themes/types'
import {
  conflict,
  notFound,
  notPublishable,
  slugReserved,
  slugTaken,
  unavailable,
  validation,
} from '../../http/errors'
import { fieldErrors } from '../../http/validate'
import { keyFor, type MediaProvider } from '../../media/provider'
import type { Db } from '../client'
import { isUniqueViolation } from '../pgErrors'
import { couples, media, securityEvents, type CoupleRow } from '../schema'
import {
  assertContentLimits,
  assertReferencesReady,
  couplePrefixDeletion,
  flushDeletions,
  listForCouple,
  queueDeletions,
} from './media'

export const coupleNotFound = () => notFound('Pasangan tidak ditemukan')

export function toCouple(row: CoupleRow): Couple {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    defaultTheme: row.defaultTheme,
    content: row.content,
    version: row.version,
    passcode: row.passcode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** "Sari & Budi", in the couple's display order. */
export function coupleNames(content: WeddingContent): string {
  const [a, b] = orderedCouple(content)
  return `${a?.nickname || '?'} & ${b?.nickname || '?'}`
}

function summarize(row: CoupleRow, accessWarning: boolean, coverUrls: Map<string, string>): CoupleSummary {
  const content = row.content
  const cover = content.cover?.background?.src || null
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    defaultTheme: row.defaultTheme,
    updatedAt: row.updatedAt.toISOString(),
    names: coupleNames(content),
    mainDate: (content.events?.length && mainEvent(content)?.start) || null,
    // Resolved here: the list doesn't load each couple's media.
    coverSrc: cover && isMediaRef(cover) ? (coverUrls.get(mediaId(cover)) ?? null) : cover,
    accessWarning,
    restorePending: row.restorePending,
  }
}

export async function listCouples(db: Db, now = new Date()): Promise<CoupleSummary[]> {
  const rows = await db.select().from(couples).orderBy(sql`${couples.updatedAt} desc`)
  const since = new Date(now.getTime() - 24 * 3_600_000)
  const warned = await db
    .select({ coupleId: securityEvents.coupleId })
    .from(securityEvents)
    .where(and(eq(securityEvents.kind, 'passcode_lockout'), gte(securityEvents.createdAt, since)))
    .groupBy(securityEvents.coupleId)
    .having(sql`count(*) >= 3`)
  const warnedIds = new Set(warned.map((w) => w.coupleId))
  const coverIds = rows
    .map((r) => r.content.cover?.background?.src)
    .filter((src): src is string => !!src && isMediaRef(src))
    .map(mediaId)
  const coverRows = coverIds.length
    ? await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, coverIds))
    : []
  const coverUrls = new Map(coverRows.filter((m) => m.url).map((m) => [m.id, m.url!]))
  return rows.map((r) => summarize(r, warnedIds.has(r.id), coverUrls))
}

export async function getCoupleRow(db: Db, id: string): Promise<CoupleRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw coupleNotFound()
  const [row] = await db.select().from(couples).where(eq(couples.id, id))
  if (!row) throw coupleNotFound()
  return row
}

export async function findRowBySlug(db: Db, slug: string): Promise<CoupleRow | undefined> {
  const [row] = await db.select().from(couples).where(eq(couples.slug, slug))
  return row
}

export const invitationNotFound = () => notFound('Undangan tidak ditemukan')

/** The couple behind a public address, or 404 "Undangan tidak ditemukan". */
export async function coupleBySlug(db: Db, slug: string): Promise<CoupleRow> {
  const row = await findRowBySlug(db, slug)
  if (!row) throw invitationNotFound()
  return row
}

/** Like coupleBySlug, but drafts are 403 "Undangan belum tersedia" (FR-003). */
export async function activeCoupleBySlug(db: Db, slug: string): Promise<CoupleRow> {
  const row = await coupleBySlug(db, slug)
  if (row.status !== 'active') throw unavailable()
  return row
}

function assertSlugValid(slug: string) {
  const message = validateSlug(slug)
  if (!message) return
  if (isReservedSlug(slug)) throw slugReserved(message)
  throw validation(message, { fields: { slug: message } })
}

/** Structure-only check for drafts (create, duplicate, import). */
function assertStructure(content: unknown) {
  const result = storedContentSchema.safeParse(content)
  if (!result.success) throw validation('Struktur data undangan tidak valid', { fields: fieldErrors(result.error) })
}

/** The full content rules, the same ones the editor form enforces (002 FR-012). */
function assertComplete(content: unknown) {
  const result = weddingContentSchema.safeParse(content)
  if (!result.success) {
    const fields = fieldErrors(result.error)
    throw validation(Object.values(fields)[0] ?? 'Data undangan tidak valid', { fields })
  }
}

export interface CreateCoupleInput {
  slug: string
  defaultTheme: ThemeId
  content: WeddingContent
  passcode?: string
}

export async function createCouple(
  db: Db,
  input: CreateCoupleInput,
  opts: { id?: string; status?: CoupleStatus; restorePending?: boolean; skipMediaCheck?: boolean } = {},
): Promise<CoupleRow> {
  assertSlugValid(input.slug)
  assertStructure(input.content)
  assertContentLimits(input.content)
  const id = opts.id ?? randomUUID()
  if (!opts.skipMediaCheck) await assertReferencesReady(db, id, input.content)
  if (await findRowBySlug(db, input.slug)) throw slugTaken()
  try {
    const [row] = await db
      .insert(couples)
      .values({
        id,
        slug: input.slug,
        status: opts.status ?? 'draft',
        defaultTheme: input.defaultTheme,
        content: input.content,
        passcode: input.passcode ?? randomPasscode(),
        restorePending: opts.restorePending ?? false,
      })
      .returning()
    return row
  } catch (err) {
    if (isUniqueViolation(err)) throw slugTaken()
    throw err
  }
}

export interface CouplePatch {
  slug?: string
  defaultTheme?: ThemeId
  content?: WeddingContent
  passcode?: string
}

export async function updateCouple(db: Db, id: string, patch: CouplePatch, expectedVersion: number): Promise<CoupleRow> {
  const current = await getCoupleRow(db, id)
  if (patch.slug !== undefined && patch.slug !== current.slug) {
    assertSlugValid(patch.slug)
    const other = await findRowBySlug(db, patch.slug)
    if (other && other.id !== id) throw slugTaken()
  }
  if (patch.content !== undefined) {
    assertComplete(patch.content)
    assertContentLimits(patch.content)
    await assertReferencesReady(db, id, patch.content)
  }
  const passcodeChanged = patch.passcode !== undefined && patch.passcode !== current.passcode
  try {
    const [row] = await db
      .update(couples)
      .set({
        ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
        ...(patch.defaultTheme !== undefined ? { defaultTheme: patch.defaultTheme } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(passcodeChanged ? { passcode: patch.passcode, passcodeVersion: sql`${couples.passcodeVersion} + 1` } : {}),
        version: sql`${couples.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(couples.id, id), eq(couples.version, expectedVersion)))
      .returning()
    if (!row) throw conflict()
    return row
  } catch (err) {
    if (isUniqueViolation(err)) throw slugTaken()
    throw err
  }
}

export async function setCoupleStatus(db: Db, id: string, status: CoupleStatus): Promise<CoupleRow> {
  const current = await getCoupleRow(db, id)
  if (status === 'active') {
    if (current.restorePending) throw notPublishable('Pemulihan belum selesai')
    const problem = firstContentProblem(current.content)
    if (problem) throw notPublishable(problem)
    await assertReferencesReady(db, id, current.content)
  }
  const [row] = await db
    .update(couples)
    .set({ status, version: sql`${couples.version} + 1`, updatedAt: new Date() })
    .where(eq(couples.id, id))
    .returning()
  return row
}

/** Deletes the couple (rows cascade) and its whole media folder (FR-013). */
export async function deleteCouple(db: Db, provider: MediaProvider, root: string, id: string): Promise<void> {
  await getCoupleRow(db, id)
  const prefix = couplePrefixDeletion(root, id)
  await db.transaction(async (tx) => {
    await queueDeletions(tx as unknown as Db, [prefix])
    await tx.delete(couples).where(eq(couples.id, id))
  })
  await flushDeletions(db, provider, [prefix.providerKey])
}

/** New draft with a unique "-salinan" address, a new passcode, and copied media. */
export async function duplicateCouple(db: Db, provider: MediaProvider, root: string, id: string): Promise<CoupleRow> {
  const source = await getCoupleRow(db, id)
  const copyId = randomUUID()
  const idMap = new Map<string, string>()
  const copies: (typeof media.$inferInsert)[] = []
  for (const m of await listForCouple(db, id)) {
    if (m.status !== 'ready') continue
    const newId = randomUUID()
    const key = keyFor(root, copyId, newId)
    const { url } = await provider.copy(m.providerKey, key, m.kind)
    idMap.set(m.id, newId)
    copies.push({ ...m, id: newId, coupleId: copyId, providerKey: key, url, createdAt: new Date() })
  }
  // Two duplicates at the same moment can pick the same "-salinan" address:
  // the unique constraint catches it, and the next free address is tried.
  for (let attempt = 0; ; attempt++) {
    const slug = await uniqueSlug(source.slug, async (s) => !!(await findRowBySlug(db, s)))
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(couples)
          .values({
            id: copyId,
            slug,
            status: 'draft',
            defaultTheme: source.defaultTheme,
            content: rewriteMediaRefs(source.content, idMap),
            passcode: randomPasscode(),
          })
          .returning()
        if (copies.length) await tx.insert(media).values(copies)
        return row
      })
    } catch (err) {
      if (!isUniqueViolation(err) || attempt >= 4) throw err
    }
  }
}
