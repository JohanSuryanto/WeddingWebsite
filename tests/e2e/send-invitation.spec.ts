import { expect, test } from '@playwright/test'
import { adminApi, duplicateSample, openSendInvitation } from './helpers'

test('/<slug>/send-invitation builds per-guest links that open the right invitation', async ({
  page,
  context,
  browserName,
  playwright,
}) => {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }
  // Its own published copy: the guest list is saved per couple, so the shared
  // sample would start with names another viewport typed.
  const api = await adminApi(playwright)
  const { id, slug, passcode } = await duplicateSample(api)
  await api.post(`/api/admin/couples/${id}/status`, { data: { status: 'active' } })
  await api.dispose()
  await openSendInvitation(page, slug, passcode)
  await expect(page.getByRole('heading', { name: 'Buat Link Undangan' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  // Without names there is one general link.
  const links = page.getByTestId('invite-link')
  await expect(links).toHaveCount(1)
  await expect(links.first()).toHaveText(new RegExp(`^http://localhost:4817/${slug}\\?t=\\d$`))

  await page.getByRole('radio', { name: /2\. Elegant Classic/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'elegant-classic')

  await page.getByLabel('Satu nama per baris').fill('Budi Santoso\n\n  Johan & Partner  \n')
  await expect(links).toHaveCount(2)
  await expect(links.nth(0)).toHaveText(`http://localhost:4817/${slug}?inv=Budi+Santoso&t=2`)
  await expect(links.nth(1)).toHaveText(`http://localhost:4817/${slug}?inv=Johan+%26+Partner&t=2`)

  // Live preview is the real invitation page, following the selected guest and theme.
  const preview = page.frameLocator('[data-testid="cover-preview"]')
  await expect(preview.getByTestId('guest-name')).toHaveText('Budi Santoso')
  await expect(preview.locator('html')).toHaveAttribute('data-theme', 'elegant-classic')
  await page.getByRole('button', { name: 'Lihat tampilan' }).click()
  await expect(preview.getByTestId('guest-name')).toHaveText('Johan & Partner')

  // WhatsApp gets the filled-in message with the guest's link.
  const wa = page.getByRole('link', { name: 'WhatsApp' }).nth(1)
  const text = new URL((await wa.getAttribute('href'))!).searchParams.get('text')!
  expect(text).toContain('Johan & Partner')
  expect(text).toContain(`/${slug}?inv=Johan+%26+Partner&t=2`)
  expect(text).not.toMatch(/\{(nama|link|mempelai|tanggal)\}/)

  // Copy the link and open it like a guest would.
  const row = page.getByTestId('invite-rows').locator('li').nth(1)
  await row.getByRole('button', { name: 'Salin Link' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Link tersalin!' })).toBeVisible()
  const link = (await links.nth(1).textContent())!
  if (browserName === 'chromium') {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link)
  }

  await page.goto(link)
  await expect(page.getByTestId('guest-name')).toHaveText('Johan & Partner')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'elegant-classic')
})

test('/anisa-raka/send-invitation has no horizontal overflow', async ({ page }) => {
  await openSendInvitation(page)
  await page
    .getByLabel('Satu nama per baris')
    .fill('Keluarga Besar Bapak H. Muhammad Abdullah Syarifuddin dan Ibu Hj. Siti Aminah\nBudi')
  await expect(page.getByText(/akan dipotong/)).toBeVisible()
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

test('old single-couple addresses now show "Undangan tidak ditemukan"', async ({ page }) => {
  for (const path of [
    '/send-invitation',
    '/register',
    '/tidak-ada',
    '/tidak-ada/send-invitation',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Undangan tidak ditemukan' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Buat Link Undangan' })).toHaveCount(0)
  }
})
