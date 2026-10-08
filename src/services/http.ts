// RSVP and wishes saved on the server for one published couple (US5).
import type { Attendance, Wish } from '../content/types'
import { apiFetch } from '../data/http/client'
import { RateLimitedError } from '../data/types'
import { parseGuestCode } from '../lib/guestName'
import { ValidationError, type RsvpResponse, type RsvpService, type WishService } from './types'

const base = (slug: string) => `/public/couples/${encodeURIComponent(slug)}`

/** The page's `?g=` code goes along, so the couple sees which listed guest replied. */
const withGuestCode = <T extends object>(input: T) => ({
  ...input,
  guestCode: parseGuestCode(window.location.search) ?? undefined,
})

type WireRsvp = { name: string; attendance: Attendance; guestCount: number; submittedAt: string }
type WireWish = Omit<Wish, 'createdAt'> & { createdAt: string }

const toRsvp = (r: WireRsvp): RsvpResponse => ({ ...r, submittedAt: new Date(r.submittedAt) })
const toWish = (w: WireWish): Wish => ({ ...w, createdAt: new Date(w.createdAt) })

/** Too many submissions shows as a form error, like other problems (FR-020). */
function asFormError(err: unknown): never {
  if (err instanceof RateLimitedError) throw new ValidationError({ form: err.message })
  throw err
}

export function createHttpRsvpService(slug: string): RsvpService {
  return {
    async mine() {
      const { rsvp } = await apiFetch<{ rsvp: WireRsvp | null }>(`${base(slug)}/rsvp/mine`)
      return rsvp ? toRsvp(rsvp) : null
    },
    async submit(input) {
      try {
        const { rsvp } = await apiFetch<{ rsvp: WireRsvp }>(`${base(slug)}/rsvp`, { method: 'POST', body: withGuestCode(input) })
        return toRsvp(rsvp)
      } catch (err) {
        asFormError(err)
      }
    },
  }
}

export function createHttpWishService(slug: string): WishService {
  return {
    async list(cursor) {
      const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      const page = await apiFetch<{ items: WireWish[]; nextCursor: string | null }>(`${base(slug)}/wishes${q}`)
      return { items: page.items.map(toWish), nextCursor: page.nextCursor }
    },
    async submit(input) {
      try {
        const { wish } = await apiFetch<{ wish: WireWish }>(`${base(slug)}/wishes`, { method: 'POST', body: withGuestCode(input) })
        return toWish(wish)
      } catch (err) {
        asFormError(err)
      }
    },
  }
}
