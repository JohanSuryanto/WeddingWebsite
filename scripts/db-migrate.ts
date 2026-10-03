// Applies server/db/migrations to DATABASE_URL.
// Usage: npm run db:migrate   (reads .env.local when present)
import { closeDb, migrateDb } from '../server/db/client'
import { loadEnvFileIfPresent } from '../server/env'

loadEnvFileIfPresent()
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL belum diisi (lihat .env.example)')
  process.exit(1)
}
await migrateDb(url)
await closeDb(url)
console.log('Migrasi selesai')
