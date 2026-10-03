// CoupleRepository over /api/admin/couples (contracts/data-layer.md).
import { ValidationError } from '../../services/types'
import {
  NotFoundError,
  SlugTakenError,
  type Couple,
  type CoupleRepository,
  type CoupleStatus,
  type CoupleSummary,
  type NewCouple,
} from '../types'
import { apiFetch } from './client'
import type { HttpMediaStore, MediaInfo } from './HttpMediaStore'

type CoupleWithMedia = { couple: Couple; media: Record<string, MediaInfo> }

/** Reserved/invalid address names come back as 422; screens expect SlugTakenError. */
function slugErrors(err: unknown): never {
  if (err instanceof ValidationError && (err.code === 'slug_reserved' || err.fieldErrors.slug)) {
    throw new SlugTakenError(err.fieldErrors.slug ?? err.message)
  }
  throw err
}

export class HttpCoupleRepository implements CoupleRepository {
  private readonly media: HttpMediaStore

  constructor(media: HttpMediaStore) {
    this.media = media
  }

  private withMedia({ couple, media }: CoupleWithMedia): Couple {
    this.media.prime(media)
    return couple
  }

  async list(): Promise<CoupleSummary[]> {
    return (await apiFetch<{ couples: CoupleSummary[] }>('/admin/couples')).couples
  }

  async get(id: string): Promise<Couple> {
    return this.withMedia(await apiFetch<CoupleWithMedia>(`/admin/couples/${encodeURIComponent(id)}`))
  }

  async findBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<Couple | null> {
    try {
      const couple = this.withMedia(
        await apiFetch<CoupleWithMedia>(`/admin/couples/by-slug/${encodeURIComponent(slug)}`),
      )
      return couple.status === 'active' || opts?.includeDrafts ? couple : null
    } catch (err) {
      if (err instanceof NotFoundError) return null
      throw err
    }
  }

  async create(input: NewCouple): Promise<Couple> {
    try {
      return (await apiFetch<{ couple: Couple }>('/admin/couples', { method: 'POST', body: input })).couple
    } catch (err) {
      slugErrors(err)
    }
  }

  async update(id: string, patch: Partial<NewCouple>, expectedVersion: number): Promise<Couple> {
    try {
      return (
        await apiFetch<{ couple: Couple }>(`/admin/couples/${id}`, {
          method: 'PATCH',
          body: { expectedVersion, patch },
        })
      ).couple
    } catch (err) {
      slugErrors(err)
    }
  }

  async setStatus(id: string, status: CoupleStatus): Promise<Couple> {
    return (await apiFetch<{ couple: Couple }>(`/admin/couples/${id}/status`, { method: 'POST', body: { status } }))
      .couple
  }

  async duplicate(id: string): Promise<Couple> {
    return (await apiFetch<{ couple: Couple }>(`/admin/couples/${id}/duplicate`, { method: 'POST' })).couple
  }

  async remove(id: string): Promise<void> {
    await apiFetch(`/admin/couples/${id}`, { method: 'DELETE' })
  }
}
