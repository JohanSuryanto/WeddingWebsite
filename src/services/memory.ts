import type { Wish } from '../content/types'
import { hasErrors, validateRsvp, validateWish } from '../lib/validation'
import { ValidationError, type RsvpResponse, type RsvpService, type WishService } from './types'

/**
 * In-memory implementations for the frontend-only phase.
 * Nothing is persisted: no localStorage, cookies or network. A refresh clears it.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `w-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}

export function createMemoryRsvpService(delayMs = 400): RsvpService {
  return {
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
  let wishes = [...seed].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return {
    async list() {
      return [...wishes]
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
