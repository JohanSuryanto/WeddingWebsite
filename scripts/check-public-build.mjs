// Fails if the public build contains any admin page or admin code (002 FR-001), or
// if either build contains server code or server secrets (003 FR-007, research R6).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Strings that only appear in server code or server configuration. */
const SERVER_ONLY = [
  'ADMIN_PASSWORD_HASH',
  'SESSION_SECRET',
  'CLOUDINARY_API_SECRET',
  'CRON_SECRET',
  'DATABASE_URL',
  'scrypt$',
  'drizzle-orm',
  '@electric-sql/pglite',
  'api_sign_request',
]

const problems = []

function scanAssets(dir, check) {
  const assets = join(dir, 'assets')
  for (const f of existsSync(assets) ? readdirSync(assets) : []) {
    if (f.endsWith('.js')) check(f, readFileSync(join(assets, f), 'utf8'))
  }
}

for (const site of ['public', 'admin']) {
  const dir = `dist/${site}`
  if (!existsSync(dir)) {
    problems.push(`${dir} not found; run npm run build first`)
    continue
  }
  scanAssets(dir, (file, code) => {
    for (const marker of SERVER_ONLY) {
      if (code.includes(marker)) problems.push(`server-only "${marker}" found in ${dir}/assets/${file}`)
    }
    if (site === 'public' && code.includes('__ADMIN_BUNDLE__')) problems.push(`admin code found in ${file}`)
  })
}
if (existsSync('dist/public/admin.html')) problems.push('dist/public/admin.html exists')

if (problems.length) {
  console.error('Build check FAILED:\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log('Build check passed: no admin code in dist/public, no server code or secrets in either build')
