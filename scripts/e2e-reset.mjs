// Removes the e2e database, media and passcode file so every Playwright run starts clean.
import { rmSync } from 'node:fs'

for (const path of ['.data/e2e-db', '.data/e2e-media', '.data/e2e-passcode.txt']) {
  rmSync(path, { recursive: true, force: true })
}
console.log('e2e data reset')
