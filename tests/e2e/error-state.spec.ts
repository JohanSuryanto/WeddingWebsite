import { expect, test } from '@playwright/test'

test('a server outage shows a retry message, and retry loads the invitation (FR-024)', async ({ page }) => {
  await page.route('**/api/public/couples/**', (route) => route.abort())
  await page.goto('/anisa-raka')
  await expect(page.getByRole('heading', { name: 'Undangan sedang tidak dapat dimuat, coba lagi' })).toBeVisible()

  await page.unroute('**/api/public/couples/**')
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.getByRole('button', { name: 'Buka Undangan' })).toBeVisible()
})

test('unknown addresses show "Undangan tidak ditemukan"', async ({ page }) => {
  await page.goto('/tidak-ada-pasangan-ini')
  await expect(page.getByRole('heading', { name: 'Undangan tidak ditemukan' })).toBeVisible()
})
