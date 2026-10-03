// Backup files (contracts/backup-format.md). v1 = 002 browser-only dashboard,
// v2 = adds passcodes, RSVPs and wishes. Export and restore are driven by the
// browser (src/admin/backup/*), so no request ever carries file bytes to the API.
import { z } from 'zod'
import type { Attendance } from '../content/types'
import { newId } from './ids'
import { rewriteMediaRefs } from './resolveMedia'
import { slugSchema, storedContentSchema, themeIdSchema } from './schema'
import { SLUG_MAX } from './slug'
import type { Couple, MediaKind } from './types'

export const BACKUP_FORMAT = 'wedding-admin-backup'
export const BACKUP_FORMAT_VERSION = 2

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

/** Couples as stored. Drafts may be unfinished, so content is checked for structure only. */
const storedCoupleSchema = z.object({
  id: z.string().min(1),
  slug: slugSchema,
  status: z.enum(['draft', 'active']),
  defaultTheme: themeIdSchema,
  content: storedContentSchema,
  version: z.number().int().min(1),
  passcode: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const attendance = z.enum(['hadir', 'tidak_hadir'])

const rsvpSchema = z.object({
  id: z.string().min(1),
  coupleId: z.string().min(1),
  name: z.string().min(1).max(60),
  attendance,
  guestCount: z.number().int().min(0).max(5),
  submittedAt: z.string(),
  updatedAt: z.string(),
})

const wishSchema = z.object({
  id: z.string().min(1),
  coupleId: z.string().min(1),
  name: z.string().min(1).max(60),
  message: z.string().min(1).max(500),
  attendance: attendance.nullable().optional(),
  hidden: z.boolean().default(false),
  createdAt: z.string(),
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
  rsvps: z.array(rsvpSchema).optional(),
  wishes: z.array(wishSchema).optional(),
})

export class BackupError extends Error {
  constructor(problem: string) {
    super(`File cadangan tidak valid: ${problem}`)
    this.name = 'BackupError'
  }
}

/** A couple from a backup; v1 files have no passcode. */
export type BackupCouple = Omit<Couple, 'passcode'> & { passcode?: string }

export interface BackupMedia {
  id: string
  coupleId: string
  kind: MediaKind
  mime: string
  size: number
  width?: number
  height?: number
  createdAt: string
  blob: Blob
}

export interface BackupRsvp {
  id: string
  coupleId: string
  name: string
  attendance: Attendance
  guestCount: number
  submittedAt: string
  updatedAt: string
}

export interface BackupWish {
  id: string
  coupleId: string
  name: string
  message: string
  attendance?: Attendance | null
  hidden: boolean
  createdAt: string
}

export interface ParsedBackup {
  formatVersion: number
  couples: BackupCouple[]
  media: BackupMedia[]
  rsvps: BackupRsvp[]
  wishes: BackupWish[]
  totalBytes: number
  createdAt: string
}

export async function blobToBase64(blob: Blob): Promise<string> {
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

/** Validates a v1 or v2 backup completely before anything is written. */
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
  const media: BackupMedia[] = []
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
    formatVersion: result.data.formatVersion,
    couples: result.data.couples as unknown as BackupCouple[],
    media,
    rsvps: result.data.rsvps ?? [],
    wishes: (result.data.wishes ?? []) as BackupWish[],
    totalBytes: media.reduce((n, m) => n + m.size, 0),
    createdAt: result.data.createdAt,
  }
}

/** One couple and everything that belongs to it. */
export interface CoupleBundle {
  couple: BackupCouple
  media: BackupMedia[]
  rsvps: BackupRsvp[]
  wishes: BackupWish[]
}

export function bundleFor(parsed: ParsedBackup, coupleId: string): CoupleBundle {
  const couple = parsed.couples.find((c) => c.id === coupleId)
  if (!couple) throw new BackupError(`pasangan ${coupleId} tidak ada`)
  return {
    couple,
    media: parsed.media.filter((m) => m.coupleId === coupleId),
    rsvps: parsed.rsvps.filter((r) => r.coupleId === coupleId),
    wishes: parsed.wishes.filter((w) => w.coupleId === coupleId),
  }
}

/** First free `<slug>-pulihan`, `<slug>-pulihan-2`, … */
export function restoredSlug(slug: string, taken: ReadonlySet<string>): string {
  for (let i = 1; i < 100; i++) {
    const suffix = i === 1 ? '-pulihan' : `-pulihan-${i}`
    const candidate = `${slug.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  throw new BackupError('tidak bisa membuat nama alamat unik')
}

/**
 * "Simpan keduanya": a copy with a new couple id, a free address name and new
 * media/response ids, with every media ref rewritten (FR-021).
 */
export function planKeepBoth(bundle: CoupleBundle, takenSlugs: ReadonlySet<string>): CoupleBundle {
  const coupleId = newId()
  const idMap = new Map(bundle.media.map((m) => [m.id, newId()]))
  return {
    couple: {
      ...bundle.couple,
      id: coupleId,
      slug: restoredSlug(bundle.couple.slug, takenSlugs),
      content: rewriteMediaRefs(bundle.couple.content, idMap),
    },
    media: bundle.media.map((m) => ({ ...m, id: idMap.get(m.id)!, coupleId })),
    rsvps: bundle.rsvps.map((r) => ({ ...r, id: newId(), coupleId })),
    wishes: bundle.wishes.map((w) => ({ ...w, id: newId(), coupleId })),
  }
}

/** The JSON document of a v2 backup (media carry base64 `data`). */
export interface BackupDocument {
  format: typeof BACKUP_FORMAT
  formatVersion: typeof BACKUP_FORMAT_VERSION
  createdAt: string
  app: { build: string }
  couples: Couple[]
  media: (Omit<BackupMedia, 'blob'> & { data: string })[]
  rsvps: BackupRsvp[]
  wishes: BackupWish[]
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `undangan-backup-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`
}
