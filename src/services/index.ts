import type { WeddingContent } from '../content/types'
import { createMemoryRsvpService, createMemoryWishService } from './memory'
import type { RsvpService, WishService } from './types'

export interface InvitationServices {
  rsvpService: RsvpService
  wishService: WishService
}

// Swap point for the backend phase: return HTTP implementations of the same
// interfaces here (see 001 contracts/submission-services.md).
export function createServicesFor(content: WeddingContent): InvitationServices {
  return {
    rsvpService: createMemoryRsvpService(),
    wishService: createMemoryWishService(content.sampleWishes),
  }
}

export { ServicesProvider, useServices } from './ServicesProvider'
export * from './types'
