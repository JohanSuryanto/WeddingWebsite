// Playwright's `test` with one automatic check: a test fails when the browser
// reports a Content-Security-Policy violation (the e2e server sends the same CSP
// as production, from vercel.json). Specs import from here instead of
// '@playwright/test'; everything else is re-exported unchanged.
import { test as base, expect } from '@playwright/test'

export * from '@playwright/test'

export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [
    async ({ context }, use) => {
      const violations: string[] = []
      context.on('console', (msg) => {
        if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text())
      })
      await use()
      expect(violations, 'Content-Security-Policy violations').toEqual([])
    },
    { auto: true },
  ],
})
