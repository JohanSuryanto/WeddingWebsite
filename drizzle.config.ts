import { defineConfig } from 'drizzle-kit'

// `npm run db:generate` writes SQL migrations from the schema; no database needed.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
})
