// Fails if the public build contains any admin page or admin code (FR-001).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist/public'
const problems = []
if (!existsSync(dir)) problems.push(`${dir} not found; run npm run build first`)
else {
  if (existsSync(join(dir, 'admin.html'))) problems.push('dist/public/admin.html exists')
  const assets = join(dir, 'assets')
  for (const f of existsSync(assets) ? readdirSync(assets) : []) {
    if (f.endsWith('.js') && readFileSync(join(assets, f), 'utf8').includes('__ADMIN_BUNDLE__')) {
      problems.push(`admin code found in ${f}`)
    }
  }
}
if (problems.length) {
  console.error('Public build check FAILED:\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log('Public build check passed: no admin pages or code in dist/public')
