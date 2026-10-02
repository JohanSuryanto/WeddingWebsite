import { z } from 'zod'
import type { MediaRecord } from './indexeddb/db'
import type { IndexedDbCoupleRepository } from './indexeddb/IndexedDbCoupleRepository'
import type { IndexedDbMediaStore } from './indexeddb/IndexedDbMediaStore'
import { slugSchema, themeIdSchema } from './schema'
import type { Couple } from './types'

/** contracts/backup-format.md */
export const BACKUP_FORMAT = 'wedding-admin-backup'
export const BACKUP_FORMAT_VERSION = 1

const mediaSchema = z.object({
  id: z.string().min(1),
  coupleId: z.string().min(1),
  kind: z.enum(['image', 'audio']),
  mime: z.string(),
  size: z.number().int().min(0),
  width: z.number().optional(),
  height: z.number().optional(),
  createdAt: z.string(),
  data: z.string(),
})

/**
 * Couples as stored. Drafts may be unfinished, so content is checked for
 * structure only; the full content rules apply when the admin saves.
 */
const storedCoupleSchema = z.object({
  id: z.string().min(1),
  slug: slugSchema,
  status: z.enum(['draft', 'active']),
  defaultTheme: themeIdSchema,
  content: z.looseObject({
    cover: z.looseObject({ background: z.looseObject({ src: z.string() }) }),
    couple: z.looseObject({ bride: z.looseObject({}), groom: z.looseObject({}) }),
    events: z.array(z.looseObject({})),
    closing: z.looseObject({}),
  }),
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z
    .number()
    .int()
    .min(1)
    .max(BACKUP_FORMAT_VERSION, 'Versi file cadangan lebih baru dari aplikasi'),
  createdAt: z.string(),
  app: z.object({ build: z.string() }).optional(),
  couples: z.array(storedCoupleSchema),
  media: z.array(mediaSchema),
})

export class BackupError extends Error {
  constructor(problem: string) {
    super(`File cadangan tidak valid: ${problem}`)
    this.name = 'BackupError'
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function base64ToBytes(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** All couples and media as one JSON Blob. */
export async function createBackup(
  repo: IndexedDbCoupleRepository,
  media: IndexedDbMediaStore,
  build = 'dev',
): Promise<Blob> {
  const couples: Couple[] = []
  const mediaOut: z.infer<typeof mediaSchema>[] = []
  for (const summary of await repo.list()) {
    const couple = await repo.get(summary.id)
    couples.push(couple)
    for (const { blob, ...meta } of await media.listByCouple(couple.id)) {
      mediaOut.push({ ...meta, data: await blobToBase64(blob) })
    }
  }
  const envelope = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    app: { build },
    couples,
    media: mediaOut,
  }
  return new Blob([JSON.stringify(envelope)], { type: 'application/json' })
}

export interface ParsedBackup {
  couples: Couple[]
  media: MediaRecord[]
  totalBytes: number
  createdAt: string
}

/** Validates a backup file completely before anything is written. */
export async function parseBackup(file: Blob): Promise<ParsedBackup> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new BackupError('bukan file JSON')
  }
  const result = backupSchema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new BackupError(`${issue.path.join('.') || 'file'}: ${issue.message}`)
  }
  const media: MediaRecord[] = []
  for (const m of result.data.media) {
    let bytes: Uint8Array<ArrayBuffer>
    try {
      bytes = base64ToBytes(m.data)
    } catch {
      throw new BackupError(`media ${m.id}: data rusak`)
    }
    if (bytes.length !== m.size) throw new BackupError(`media ${m.id}: ukuran tidak cocok`)
    const { data: _data, ...meta } = m
    void _data
    media.push({ ...meta, blob: new Blob([bytes], { type: m.mime }) })
  }
  return {
    couples: result.data.couples as unknown as Couple[],
    media,
    totalBytes: media.reduce((n, m) => n + m.size, 0),
    createdAt: result.data.createdAt,
  }
}

/** Couples in the backup whose id or slug already exists. */
export async function findConflicts(parsed: ParsedBackup, repo: IndexedDbCoupleRepository) {
  const existing = await repo.list()
  const ids = new Set(existing.map((c) => c.id))
  const slugs = new Set(existing.map((c) => c.slug))
  return parsed.couples.filter((c) => ids.has(c.id) || slugs.has(c.slug))
}

/**
 * Restores a parsed backup. "replace" clears everything first; "add" skips
 * couples whose id or slug already exists. Media keep their ids.
 */
export async function restoreBackup(
  parsed: ParsedBackup,
  mode: 'replace' | 'add',
  repo: IndexedDbCoupleRepository,
): Promise<{ restored: number; skipped: string[] }> {
  if (mode === 'replace') await repo.clearAll()
  const skip = new Set(mode === 'add' ? (await findConflicts(parsed, repo)).map((c) => c.id) : [])
  const skipped: string[] = []
  let restored = 0
  for (const couple of parsed.couples) {
    if (skip.has(couple.id)) {
      skipped.push(couple.slug)
      continue
    }
    await repo.putWithMedia(
      couple,
      parsed.media.filter((m) => m.coupleId === couple.id),
    )
    restored++
  }
  return { restored, skipped }
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `undangan-backup-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`
}
