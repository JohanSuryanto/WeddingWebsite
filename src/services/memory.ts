import type { Wish } from '../content/types'
import { hasErrors, validateRsvp, validateWish } from '../lib/validation'
import { ValidationError, type RsvpResponse, type RsvpService, type WishService } from './types'

/**
 * In-memory implementations, used by the admin previews so trying the forms
 * there never writes real responses. Nothing is persisted; a refresh clears it.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `w-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}

export function createMemoryRsvpService(delayMs = 400): RsvpService {
  return {
    async mine() {
      return null
    },
    async submit(input) {
      const errors = validateRsvp(input)
      if (hasErrors(errors)) throw new ValidationError(errors)
      await wait(delayMs)
      const attendance = input.attendance as RsvpResponse['attendance']
      return {
        name: input.name.trim(),
        attendance,
        guestCount: attendance === 'hadir' ? input.guestCount : 0,
        submittedAt: new Date(),
      }
    },
  }
}

export function createMemoryWishService(seed: Wish[] = [], delayMs = 400): WishService {
  // Content from the server is JSON, so dates arrive as ISO strings.
  let wishes = seed
    .map((w) => ({ ...w, createdAt: new Date(w.createdAt) }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return {
    async list() {
      return { items: [...wishes], nextCursor: null }
    },
    async submit(input) {
      const errors = validateWish(input)
      if (hasErrors(errors)) throw new ValidationError(errors)
      await wait(delayMs)
      const wish: Wish = {
        id: newId(),
        name: input.name.trim(),
        message: input.message.trim(),
        attendance: input.attendance,
        createdAt: new Date(),
      }
      wishes = [wish, ...wishes]
      return wish
    },
  }
}
