// Runs the API tests on real PostgreSQL instead of in-memory PGlite.
// Uses TEST_DATABASE_URL if set (CI), else the server from DATABASE_URL in .env.local.
// Each test file creates and drops its own wedding_test_* database; your data is untouched.
// Usage: npm run test:pg
import { spawnSync } from 'node:child_process'

if (!process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // no .env.local: fall through to the check below
  }
  const url = process.env.DATABASE_URL ?? ''
  if (!/^postgres(ql)?:\/\//.test(url)) {
    console.error('Set TEST_DATABASE_URL, or DATABASE_URL=postgres://… in .env.local')
    process.exit(1)
  }
  const server = new URL(url)
  server.pathname = '/postgres'
  process.env.TEST_DATABASE_URL = server.toString()
}

const run = spawnSync('npx', ['vitest', 'run', '--project', 'api'], { stdio: 'inherit', shell: true })
process.exit(run.status ?? 1)
