import { randomBytes, scryptSync } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'

const desktop = devices['Desktop Chrome']
const PORT = 4817

/** Admin login for the e2e server (password: rahasia123). */
export const TEST_ADMIN = { email: 'admin@test.local', password: 'rahasia123' }

/** Same format as server/auth/password.ts (scrypt$N$r$p$salt$hash). */
function scryptHash(password: string) {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$32768$8$1$${salt.toString('base64')}$${key.toString('base64')}`
}

/** Server environment for the e2e run: temporary PGlite database + local media. */
export const E2E_ENV = {
  DATABASE_URL: 'pglite:./.data/e2e-db',
  MEDIA_DRIVER: 'local',
  MEDIA_ROOT: 'wedding/e2e',
  LOCAL_MEDIA_DIR: '.data/e2e-media',
  ADMIN_EMAIL: TEST_ADMIN.email,
  ADMIN_PASSWORD_HASH: scryptHash(TEST_ADMIN.password),
  SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-123',
  CRON_SECRET: 'e2e-cron',
  PUBLIC_ORIGIN: `http://localhost:${PORT}`,
  ADMIN_ORIGIN: `http://admin.localhost:${PORT}`,
  API_SURFACE: 'both',
}

const LOCKOUT_SPECS = /lockout\.spec\.ts$/
const BACKUP_SPECS = /backup-roundtrip\.spec\.ts$/
const PUBLIC_PROJECTS = ['mobile-320', 'mobile-375', 'tablet-768', 'desktop-1366', 'desktop-1920', 'iphone-webkit']

export default defineConfig({
  fullyParallel: true,
  // CI: failures also become GitHub annotations, readable without the job log.
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  webServer: {
    // Fresh database and media each run: wipe .data/e2e-*, migrate, seed Anisa & Raka
    // (passcode saved to .data/e2e-passcode.txt), then serve the builds plus the API.
    command: [
      'npm run build',
      'node scripts/e2e-reset.mjs',
      'npm run db:migrate',
      'npm run db:seed -- --passcode-file .data/e2e-passcode.txt',
      `npx tsx scripts/serve.ts ${PORT}`,
    ].join(' && '),
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...(process.env as Record<string, string>),
      ...E2E_ENV,
      VITE_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
  projects: [
    // Public site: wedding.johansuryanto.dev
    ...[
      {
        name: 'mobile-320',
        use: { ...desktop, viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true },
      },
      {
        name: 'mobile-375',
        use: { ...desktop, viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true },
      },
      { name: 'tablet-768', use: { ...desktop, viewport: { width: 768, height: 1024 } } },
      { name: 'desktop-1366', use: { ...desktop, viewport: { width: 1366, height: 768 } } },
      { name: 'desktop-1920', use: { ...desktop, viewport: { width: 1920, height: 1080 } } },
      { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    ].map((p) => ({
      ...p,
      testDir: './tests/e2e',
      use: { ...p.use, baseURL: `http://localhost:${PORT}` },
    })),
    // Admin site: admin.wedding.johansuryanto.dev
    {
      name: 'admin-375',
      testDir: './tests/e2e-admin',
      testIgnore: [LOCKOUT_SPECS, BACKUP_SPECS],
      use: {
        ...desktop,
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        baseURL: `http://admin.localhost:${PORT}`,
      },
    },
    {
      name: 'admin-1366',
      testDir: './tests/e2e-admin',
      testIgnore: [LOCKOUT_SPECS, BACKUP_SPECS],
      use: { ...desktop, viewport: { width: 1366, height: 900 }, baseURL: `http://admin.localhost:${PORT}` },
    },
    // A full backup holds every couple in the shared database; tests running alongside
    // would delete files mid-export. So it runs alone, after the projects above.
    {
      name: 'admin-backup',
      testDir: './tests/e2e-admin',
      testMatch: BACKUP_SPECS,
      dependencies: [...PUBLIC_PROJECTS, 'admin-375', 'admin-1366'],
      use: { ...desktop, viewport: { width: 1366, height: 900 }, baseURL: `http://admin.localhost:${PORT}` },
    },
    // Login lockout is server-wide (FR-009): it would lock every other test out for a
    // minute, so these run alone, last.
    {
      name: 'admin-lockout',
      testDir: './tests/e2e-admin',
      testMatch: LOCKOUT_SPECS,
      dependencies: ['admin-backup'],
      use: { ...desktop, viewport: { width: 1366, height: 900 }, baseURL: `http://admin.localhost:${PORT}` },
    },
  ],
})
