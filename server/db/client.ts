import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

export type Schema = typeof schema
/** Works with both drivers: postgres.js (Neon, production) and PGlite (dev, tests). */
export type Db = PgDatabase<PgQueryResultHKT, Schema>

export const MIGRATIONS_DIR = resolve(process.cwd(), 'server/db/migrations')

type Driver = { db: Db; migrate: () => Promise<void>; close: () => Promise<void> }

async function connect(url: string): Promise<Driver> {
  if (url.startsWith('pglite:')) {
    // pglite:memory → in-memory (tests); pglite:<path> → saved on disk (dev, e2e).
    const path = url.slice('pglite:'.length)
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    if (path !== 'memory') mkdirSync(dirname(resolve(path)), { recursive: true })
    const client = path === 'memory' ? new PGlite() : new PGlite(path)
    const db = drizzle({ client, schema })
    return {
      db: db as unknown as Db,
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_DIR }),
      close: () => client.close(),
    }
  }
  const { default: postgres } = await import('postgres')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  // Neon's pooler runs PgBouncer in transaction mode: no prepared statements.
  // One connection per function instance; the pooler does the fan-in.
  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle({ client, schema })
  return {
    db: db as unknown as Db,
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_DIR }),
    close: () => client.end(),
  }
}

// One connection per URL per process, reused across warm function invocations.
// Kept on globalThis so `vite dev` reloading this module doesn't open a second
// PGlite instance on the same data directory.
const globalCache = globalThis as typeof globalThis & { __weddingDb?: Map<string, Promise<Driver>> }
const cache = (globalCache.__weddingDb ??= new Map<string, Promise<Driver>>())

function driver(url: string): Promise<Driver> {
  let entry = cache.get(url)
  if (!entry) {
    entry = connect(url)
    cache.set(url, entry)
    entry.catch(() => cache.delete(url))
  }
  return entry
}

export async function getDb(url: string): Promise<Db> {
  return (await driver(url)).db
}

export async function migrateDb(url: string): Promise<void> {
  await (await driver(url)).migrate()
}

/** Fresh, uncached connection with migrations applied (tests): in-memory PGlite by default. */
export async function createIsolatedDb(url = 'pglite:memory'): Promise<{ db: Db; close: () => Promise<void> }> {
  const d = await connect(url)
  await d.migrate()
  return { db: d.db, close: d.close }
}

export async function closeDb(url: string): Promise<void> {
  const entry = cache.get(url)
  if (!entry) return
  cache.delete(url)
  await (await entry).close()
}
