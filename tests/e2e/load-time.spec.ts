import { expect, test } from '@playwright/test'

// SC-003: first screen within 3 s on a typical 4G phone connection (warm server).
// The cold-start part (≤ 10 s after a quiet period) is measured in production.
test('the invitation cover appears within 3 s on 4G', async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium' || testInfo.project.name !== 'mobile-375', 'CDP throttling: one Chromium phone run')
  // Warm the API and database first, as on a server that is awake.
  await page.request.get('/api/public/couples/anisa-raka')

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await page.goto('/anisa-raka?inv=Budi')
  await expect(page.getByRole('button', { name: 'Buka Undangan' })).toBeVisible({ timeout: 10_000 })
  // Measured by the browser from navigation start, without the test runner's overhead.
  const shownAt = await page.evaluate(() => performance.now())
  expect(shownAt).toBeLessThan(3_000)
})
