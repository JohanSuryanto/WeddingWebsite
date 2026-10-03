// The couple's own send-invitation page (US4): passcode gate and couple-only data.
import { apiFetch } from '../data/http/client'
import {
  InvalidPasscodeError,
  SessionExpiredError,
  type CoupleGate,
  type CoupleStatus,
  type Page,
  type PublicCouple,
  type RsvpRecord,
  type RsvpTotals,
} from '../data/types'
import type { Attendance } from '../content/types'

export interface CoupleWish {
  id: string
  name: string
  message: string
  attendance?: Attendance
  createdAt: string
}

export interface CoupleResponses {
  totals: RsvpTotals
  rsvps: RsvpRecord[]
  wishes: Page<CoupleWish>
}

const enc = encodeURIComponent

export interface CoupleAccessService {
  gate(slug: string): Promise<CoupleGate>
  /** Throws InvalidPasscodeError | LockedOutError. */
  unlock(slug: string, passcode: string): Promise<void>
  lock(slug: string): Promise<void>
  /** Throws SessionExpiredError when the page is locked (wrong/old passcode). */
  load(slug: string): Promise<{ couple: PublicCouple; status: CoupleStatus }>
  /** Read only; hidden wishes excluded (FR-019). */
  responses(slug: string, wishesCursor?: string): Promise<CoupleResponses>
  csvUrl(slug: string): string
}

export const coupleAccess: CoupleAccessService = {
  gate: (slug) => apiFetch<CoupleGate>(`/public/couples/${enc(slug)}/gate`),

  async unlock(slug, passcode) {
    try {
      await apiFetch(`/public/couples/${enc(slug)}/unlock`, { method: 'POST', body: { passcode } })
    } catch (err) {
      // 401 here means the code was wrong.
      if (err instanceof SessionExpiredError) throw new InvalidPasscodeError()
      throw err
    }
  },

  async lock(slug) {
    await apiFetch(`/couple/${enc(slug)}/lock`, { method: 'POST' })
  },

  load: (slug) => apiFetch(`/couple/${enc(slug)}/send-invitation`),

  responses(slug, wishesCursor) {
    const q = wishesCursor ? `?wishesCursor=${enc(wishesCursor)}` : ''
    return apiFetch(`/couple/${enc(slug)}/responses${q}`)
  },

  csvUrl: (slug) => `/api/couple/${enc(slug)}/rsvps.csv`,
}
