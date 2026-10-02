// Data wiring for the ADMIN site (admin.wedding.johansuryanto.dev).
// Frontend-only phase: IndexedDB in the admin's browser.
// Backend phase: replace with HttpCoupleRepository / HttpMediaStore; screens stay unchanged.
import { openAdminDb } from './indexeddb/db'
import { IndexedDbCoupleRepository } from './indexeddb/IndexedDbCoupleRepository'
import { IndexedDbMediaStore } from './indexeddb/IndexedDbMediaStore'
import { seedIfEmpty } from './indexeddb/seed'

const db = openAdminDb()

export const mediaStore = new IndexedDbMediaStore(db)
export const coupleRepository = new IndexedDbCoupleRepository(db, mediaStore)

/** Resolves once the sample couple has been seeded on first run. */
export const ready: Promise<void> = seedIfEmpty(coupleRepository, mediaStore).catch((err) => {
  console.error('Seeding the sample couple failed', err)
})
