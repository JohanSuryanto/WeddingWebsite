import type { PublicCouple, PublicCoupleSource } from '../types'
import { apiFetch } from './client'

/** Published couples for guests (GET /api/public/couples/:slug). */
export class HttpPublicCoupleSource implements PublicCoupleSource {
  async get(slug: string): Promise<PublicCouple> {
    return (await apiFetch<{ couple: PublicCouple }>(`/public/couples/${encodeURIComponent(slug)}`)).couple
  }
}
