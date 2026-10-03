import type { WeddingContent } from '../content/types'
import { createHttpRsvpService, createHttpWishService } from './http'
import { createMemoryRsvpService, createMemoryWishService } from './memory'
import type { RsvpService, WishService } from './types'

export interface InvitationServices {
  rsvpService: RsvpService
  wishService: WishService
}

/**
 * Live invitations (a published couple's address) save to the server; admin
 * previews pass no slug and get in-memory services, so trying the forms there
 * never writes real responses (contracts/data-layer.md).
 */
export function createServicesFor(content: WeddingContent, opts: { slug?: string } = {}): InvitationServices {
  if (opts.slug) {
    return { rsvpService: createHttpRsvpService(opts.slug), wishService: createHttpWishService(opts.slug) }
  }
  return {
    rsvpService: createMemoryRsvpService(),
    wishService: createMemoryWishService(content.sampleWishes),
  }
}

export { ServicesProvider, useServices } from './ServicesProvider'
export * from './types'
