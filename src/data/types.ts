import type { Attendance, WeddingContent, Wish } from '../content/types'
import type { ThemeId } from '../themes/types'

export type CoupleStatus = 'draft' | 'active'

/** One wedding (contracts/data-layer.md). */
export interface Couple {
  id: string
  slug: string
  status: CoupleStatus
  defaultTheme: ThemeId
  /** Image `src` values may be `media:<id>` references into the MediaStore. */
  content: WeddingContent
  version: number
  /** 4-digit code for the couple's send-invitation page (admin responses only). */
  passcode: string
  createdAt: string
  updatedAt: string
}

export type NewCouple = Pick<Couple, 'slug' | 'defaultTheme' | 'content'> & {
  /** Random when omitted. */
  passcode?: string
}

export type CoupleSummary = Pick<
  Couple,
  'id' | 'slug' | 'status' | 'defaultTheme' | 'updatedAt'
> & {
  /** "Anisa & Raka" */
  names: string
  /** Main event start (ISO), if set. */
  mainDate: string | null
  /** Cover image src (may be a media: ref), for thumbnails. */
  coverSrc: string | null
  /** ≥ 3 passcode lockouts in the last 24 h (FR-010d). */
  accessWarning: boolean
  /** A backup restore started but did not finish for this couple. */
  restorePending: boolean
  /** Times guests opened the invitation. */
  views: number
}

/** What the public site receives: media already resolved to absolute URLs. */
export interface PublicCouple {
  slug: string
  defaultTheme: ThemeId
  content: WeddingContent
}

/** Shown on the send-invitation passcode screen (US4). */
export interface CoupleGate {
  names: string
  status: CoupleStatus
  unlocked: boolean
  /** ISO time while passcode entry is paused. */
  retryAt: string | null
}

export interface RsvpRecord {
  id: string
  name: string
  attendance: Attendance
  guestCount: number
  submittedAt: string
  updatedAt: string
}

export interface RsvpTotals {
  attending: number
  notAttending: number
  /** Sum of guest counts of those attending. */
  people: number
}

/** A wish as the admin sees it. */
export type WishRecord = Wish & { hidden: boolean }

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

/** The couple changed since it was loaded (version mismatch). */
export class ConflictError extends Error {
  constructor(message = 'Data pasangan ini sudah diubah di tab lain.') {
    super(message)
    this.name = 'ConflictError'
  }
}

/** The address name is used by another couple or reserved. */
export class SlugTakenError extends Error {
  constructor(message = 'Nama alamat sudah dipakai pasangan lain') {
    super(message)
    this.name = 'SlugTakenError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Pasangan tidak ditemukan') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** The admin session is missing or expired (401 from an admin call). */
export class SessionExpiredError extends Error {
  constructor(message = 'Sesi berakhir, silakan masuk lagi') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

/** The couple exists but is a draft (403 unavailable). */
export class UnavailableError extends Error {
  constructor(message = 'Undangan belum tersedia') {
    super(message)
    this.name = 'UnavailableError'
  }
}

/** Network failure, timeout or server error. */
export class NetworkError extends Error {
  constructor(message = 'Tidak dapat terhubung ke server. Coba lagi.') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Too many failed attempts (admin login or couple passcode). */
export class LockedOutError extends Error {
  readonly retryAt: Date
  constructor(retryAt: Date, message = 'Terlalu banyak percobaan.') {
    super(message)
    this.name = 'LockedOutError'
    this.retryAt = retryAt
  }
}

export class RateLimitedError extends Error {
  readonly retryAt: Date
  constructor(retryAt: Date, message = 'Terlalu banyak pesan, coba lagi nanti') {
    super(message)
    this.name = 'RateLimitedError'
    this.retryAt = retryAt
  }
}

/** Wrong send-invitation passcode. */
export class InvalidPasscodeError extends Error {
  constructor(message = 'Kode akses salah') {
    super(message)
    this.name = 'InvalidPasscodeError'
  }
}

export interface CoupleRepository {
  /** Newest updated first. */
  list(): Promise<CoupleSummary[]>
  /** Throws NotFoundError. */
  get(id: string): Promise<Couple>
  findBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<Couple | null>
  /** Status 'draft', version 1. Throws SlugTakenError. */
  create(input: NewCouple): Promise<Couple>
  /** Throws ConflictError | SlugTakenError | NotFoundError. */
  update(id: string, patch: Partial<NewCouple>, expectedVersion: number): Promise<Couple>
  setStatus(id: string, status: CoupleStatus): Promise<Couple>
  /** New draft with a unique "-salinan" slug; media copied. */
  duplicate(id: string): Promise<Couple>
  /** Also removes the couple's media. */
  remove(id: string): Promise<void>
}

/** Read model for the public site (contracts/data-layer.md). */
export interface PublicCoupleSource {
  /** Throws NotFoundError | UnavailableError | NetworkError. */
  get(slug: string): Promise<PublicCouple>
}

export type MediaKind = 'image' | 'audio'

export interface StoredMedia {
  id: string
  coupleId: string
  kind: MediaKind
  mime: string
  size: number
  width?: number
  height?: number
  createdAt: string
}

export interface UsageReport {
  usedBytes: number
  quotaBytes: number | null
  /** 0–100 */
  percent: number
  /** At 80% or more (FR-014). */
  warn: boolean
  /** e.g. "Kuota media: 12,4 dari 25 kredit" */
  label: string
  /** Database size against its free limit, when known. */
  database?: { label: string; percent: number; warn: boolean }
}

export interface MediaStore {
  put(
    coupleId: string,
    blob: Blob,
    meta: { kind: MediaKind; width?: number; height?: number; onProgress?: (percent: number) => void },
  ): Promise<StoredMedia>
  getBlob(id: string): Promise<Blob | null>
  /** Delivery URL when known; resolveMedia prefers it over getBlob. */
  urlOf?(id: string): string | undefined
  remove(id: string): Promise<void>
  /** Deletes the couple's media not in `referenced`; returns how many. */
  removeUnreferenced(coupleId: string, referenced: Set<string>): Promise<number>
  usage(): Promise<UsageReport>
}
