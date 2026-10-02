// Prints the SHA-256 (hex) of a password for VITE_ADMIN_PASSWORD_SHA256.
// Usage: npm run hash-password -- "your-password"
import { createHash } from 'node:crypto'

const password = process.argv[2]
if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"')
  process.exit(1)
}
console.log(createHash('sha256').update(password, 'utf8').digest('hex'))
