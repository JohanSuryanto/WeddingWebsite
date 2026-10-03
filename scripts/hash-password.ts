// Prints the scrypt hash of a password for ADMIN_PASSWORD_HASH.
// Usage: npm run hash-password -- "your-password"
import { hashPassword } from '../server/auth/password'

const password = process.argv[2]
if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"')
  process.exit(1)
}
console.log(await hashPassword(password))
