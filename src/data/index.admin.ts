// Data wiring for the ADMIN site (admin.wedding.johansuryanto.dev): the shared backend.
import { HttpCoupleRepository } from './http/HttpCoupleRepository'
import { httpMediaStore } from './http/HttpMediaStore'

export const mediaStore = httpMediaStore
export const coupleRepository = new HttpCoupleRepository(httpMediaStore)

/** Kept for callers from the browser-storage phase; the server needs no warm-up. */
export const ready: Promise<void> = Promise.resolve()
