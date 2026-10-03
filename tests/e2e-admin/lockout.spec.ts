import { expect, test } from '@playwright/test'
import { ADMIN, login } from './helpers'

// Runs alone in the admin-lockout project (see playwright.config.ts): the lockout is
// enforced by the server for everyone, not per browser (FR-009).
test('five wrong attempts pause login on every browser, then it recovers', async ({ page, browser }) => {
  test.setTimeout(120_000)
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  for (let i = 0; i < 5; i++) {
    await page.getByLabel('Kata sandi').fill(`salah-${i}`)
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  }
  await expect(page.getByRole('alert')).toContainText('Terlalu banyak percobaan. Coba lagi dalam')
  await expect(page.getByRole('button', { name: 'Masuk' })).toBeDisabled()

  // A different browser can't get around it, even with the right password.
  const other = await browser.newContext({ baseURL: 'http://admin.localhost:4817' })
  const otherPage = await other.newPage()
  await otherPage.goto('/login')
  await otherPage.getByLabel('Email').fill(ADMIN.email)
  await otherPage.getByLabel('Kata sandi').fill(ADMIN.password)
  await otherPage.getByRole('button', { name: 'Masuk' }).click()
  await expect(otherPage.getByRole('alert')).toContainText('Terlalu banyak percobaan')
  await other.close()

  // After the pause the right password works again.
  await page.waitForTimeout(61_000)
  await login(page)
})
