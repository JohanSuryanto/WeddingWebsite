import { defineConfig, devices } from '@playwright/test'

const desktop = devices['Desktop Chrome']
const PORT = 4817

/** Credentials baked into the test build (password: rahasia123). */
export const TEST_ADMIN = {
  email: 'admin@test.local',
  password: 'rahasia123',
  hash: 'bee5688aea66a47460b19c76f8f199c6b9585eb726f8322b1429793863609ca2',
}

export default defineConfig({
  fullyParallel: true,
  reporter: 'list',
  webServer: {
    command: `npm run build && node scripts/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...(process.env as Record<string, string>),
      VITE_ADMIN_EMAIL: TEST_ADMIN.email,
      VITE_ADMIN_PASSWORD_SHA256: TEST_ADMIN.hash,
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
      use: { ...desktop, viewport: { width: 1366, height: 900 }, baseURL: `http://admin.localhost:${PORT}` },
    },
  ],
})
