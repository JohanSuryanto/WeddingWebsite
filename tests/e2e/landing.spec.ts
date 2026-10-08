import { expect, test } from '../fixtures'

test('landing page presents the service, theme examples and WhatsApp contact', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const examples = page
    .getByTestId('theme-examples')
    .getByRole('link', { name: /Lihat contoh tema/ })
  await expect(examples).toHaveCount(4)
  for (const [i, code] of ['1', '2', '3', '4'].entries()) {
    await expect(examples.nth(i)).toHaveAttribute('href', `/anisa-raka?t=${code}`)
  }

  const contact = page.getByRole('link', { name: /Pesan Sekarang/ })
  await expect(contact).toHaveAttribute('href', /^https:\/\/wa\.me\/6281234567890\?text=/)

  // No way into the admin from the public site.
  const hrefs = await page
    .locator('a')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))
  expect(hrefs.some((h) => /admin|login|dashboard/i.test(h))).toBe(false)

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('a theme example opens the sample invitation in that theme', async ({ page }) => {
  await page.goto('/anisa-raka?t=3')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rustic-garden')
  await expect(page.getByRole('button', { name: 'Buka Undangan' })).toBeVisible()
  await page.goto('/anisa-raka?t=4')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'javanese-heritage')
})
