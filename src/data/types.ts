import type { WeddingContent } from '../content/types'
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
  createdAt: string
  updatedAt: string
}

export type NewCouple = Pick<Couple, 'slug' | 'defaultTheme' | 'content'>

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

export interface MediaStore {
  put(
    coupleId: string,
    blob: Blob,
    meta: { kind: MediaKind; width?: number; height?: number },
  ): Promise<StoredMedia>
  getBlob(id: string): Promise<Blob | null>
  remove(id: string): Promise<void>
  /** Deletes the couple's media not in `referenced`; returns how many. */
  removeUnreferenced(coupleId: string, referenced: Set<string>): Promise<number>
  usage(): Promise<{ usedBytes: number; quotaBytes: number | null }>
}
