import { expect, test } from '@playwright/test'
import { createCouple, login } from './helpers'

test('search, publish, duplicate and delete couples', async ({ page }) => {
  await login(page)
  await createCouple(page, 'Sari', 'Budi')
  await page.goto('/')

  const cards = page.getByTestId('couple-card')
  await expect(cards).toHaveCount(2)
  await page.getByLabel('Cari pasangan').fill('budi')
  await expect(cards).toHaveCount(1)
  await page.getByLabel('Cari pasangan').fill('ánísa')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toHaveAttribute('data-slug', 'anisa-raka')
  await page.getByLabel('Cari pasangan').fill('')

  const sari = page.locator('[data-testid=couple-card][data-slug=sari-budi]')
  await sari.getByRole('button', { name: 'Terbitkan' }).click()
  await expect(sari.getByTestId('status-badge')).toHaveText('Aktif')
  await page.getByLabel('Status').selectOption('draft')
  await expect(cards).toHaveCount(0)
  await page.getByLabel('Status').selectOption('all')

  await sari.getByRole('button', { name: 'Duplikat' }).click()
  const copy = page.locator('[data-testid=couple-card][data-slug=sari-budi-salinan]')
  await expect(copy).toBeVisible()
  await expect(copy.getByTestId('status-badge')).toHaveText('Draf')

  const usedBefore = await page.getByTestId('storage-used').textContent()
  await copy.getByRole('button', { name: 'Hapus' }).click()
  const dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', { name: 'Hapus permanen' })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill('salah')
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill('sari-budi-salinan')
  await confirm.click()
  await expect(copy).toHaveCount(0)
  await expect(cards).toHaveCount(2)
  expect(usedBefore).toBeTruthy()
})

test('backup restores every couple into an empty browser', async ({ page, browser }) => {
  await login(page)
  await createCouple(page, 'Sari', 'Budi')
  await page.goto('/backup')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Unduh Cadangan' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^undangan-backup-\d{8}-\d{4}\.json$/)
  const file = await download.path()

  // A brand-new browser profile: only the seeded sample exists.
  const fresh = await browser.newContext({ baseURL: 'http://admin.localhost:4817' })
  const other = await fresh.newPage()
  await login(other, '/backup')
  await other.locator('#restore-file').setInputFiles(file)
  await expect(other.getByTestId('restore-summary')).toContainText('2 pasangan')
  await other.getByLabel('Ganti semua').check()
  await other.getByRole('button', { name: 'Pulihkan' }).click()
  await other.getByRole('dialog').getByRole('button', { name: 'Ganti semua' }).click()
  await expect(other.getByRole('status').filter({ hasText: '2 pasangan dipulihkan' })).toBeVisible()

  await other.goto('/')
  await expect(other.locator('[data-testid=couple-card][data-slug=sari-budi]')).toBeVisible()
  await expect(other.locator('[data-testid=couple-card][data-slug=anisa-raka]')).toBeVisible()
  // Photos came back too (the sample's cover thumbnail renders).
  await expect(
    other.locator('[data-testid=couple-card][data-slug=anisa-raka] img').first(),
  ).toHaveJSProperty('complete', true)
  await fresh.close()
})
