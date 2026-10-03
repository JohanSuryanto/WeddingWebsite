import { expect, test } from '@playwright/test'
import { createCouple, fillRequired, login, PUBLIC_URL, save, uniqueSlug } from './helpers'

test('the admin sets, copies and changes the passcode; changing it locks the couple out (US4-1, US4-6)', async ({
  page,
  context,
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await login(page)
  const slug = uniqueSlug('kode')
  await createCouple(page, 'Sari', 'Budi', slug)
  await fillRequired(page)

  await page.getByRole('link', { name: 'Pengaturan' }).click()
  const field = page.getByLabel('Kode akses')
  await expect(field).toHaveValue(/^\d{4}$/)
  await field.fill('12')
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Kode akses harus 4 angka')).toBeVisible()
  await field.fill('4821')
  await save(page)

  await page.getByRole('button', { name: 'Salin pesan' }).click()
  const message = await page.evaluate(() => navigator.clipboard.readText())
  expect(message).toContain(`${PUBLIC_URL}/${slug}/send-invitation`)
  expect(message).toContain('Kode akses: 4821')
  expect(message).toContain('Sari & Budi')

  // The couple unlocks their page in their own browser.
  const coupleContext = await browser.newContext()
  const couplePage = await coupleContext.newPage()
  await couplePage.goto(`${PUBLIC_URL}/${slug}/send-invitation`)
  await couplePage.getByLabel('Digit 1').pressSequentially('4821')
  await expect(couplePage.getByRole('heading', { name: 'Buat Link Undangan' })).toBeVisible()

  // "Acak" picks a new code; after saving, the old unlock no longer works.
  await page.getByRole('button', { name: 'Acak' }).click()
  await expect(field).not.toHaveValue('4821')
  await save(page)
  await couplePage.reload()
  await expect(couplePage.getByRole('heading', { name: 'Masukkan kode akses' })).toBeVisible()
  await coupleContext.close()
})
