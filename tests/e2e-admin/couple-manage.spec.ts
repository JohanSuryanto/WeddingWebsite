import { expect, test } from '../fixtures'
import { createCouple, login, uniqueSlug } from './helpers'

test('search, publish, duplicate and delete couples', async ({ page }) => {
  await login(page)
  const slug = uniqueSlug('sari-budi')
  await createCouple(page, 'Sari', 'Budi', slug)
  await page.goto('/')

  const cards = page.getByTestId('couple-card')
  const mine = page.locator(`[data-testid=couple-card][data-slug=${slug}]`)
  await page.getByLabel('Cari pasangan').fill(slug)
  await expect(cards).toHaveCount(1)
  await expect(mine).toBeVisible()
  await page.getByLabel('Cari pasangan').fill('ánísa')
  await expect(page.locator('[data-testid=couple-card][data-slug=anisa-raka]')).toHaveCount(1)
  await page.getByLabel('Cari pasangan').fill(slug)

  // An unfinished draft can't be published; the reason is shown.
  await mine.getByRole('button', { name: 'Terbitkan' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Belum bisa diterbitkan' })).toBeVisible()
  await expect(mine.getByTestId('status-badge')).toHaveText('Draf')

  await page.getByLabel('Status').selectOption('active')
  await expect(mine).toHaveCount(0)
  await page.getByLabel('Status').selectOption('all')

  await mine.getByRole('button', { name: 'Duplikat' }).click()
  await page.getByLabel('Cari pasangan').fill(`${slug}-salinan`)
  const copy = page.locator(`[data-testid=couple-card][data-slug=${slug}-salinan]`)
  await expect(copy).toBeVisible()
  await expect(copy.getByTestId('status-badge')).toHaveText('Draf')

  await expect(page.getByTestId('storage-used')).not.toBeEmpty()
  await copy.getByRole('button', { name: 'Hapus' }).click()
  const dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', { name: 'Hapus permanen' })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill('salah')
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill(`${slug}-salinan`)
  await confirm.click()
  await expect(copy).toHaveCount(0)
})

test('a complete couple publishes from the list', async ({ page }) => {
  await login(page)
  // The seeded sample is complete: duplicate it (photos are copied), then publish the copy.
  await page.getByLabel('Cari pasangan').fill('anisa-raka')
  const [duplicated] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/duplicate') && r.request().method() === 'POST'),
    page
      .locator('[data-testid=couple-card][data-slug=anisa-raka]')
      .getByRole('button', { name: 'Duplikat' })
      .click(),
  ])
  const slug: string = (await duplicated.json()).couple.slug
  expect(slug).toMatch(/^anisa-raka-salinan/)
  await page.getByLabel('Cari pasangan').fill(slug)
  const copy = page.locator(`[data-testid=couple-card][data-slug=${slug}]`)
  await copy.getByRole('button', { name: 'Terbitkan' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Undangan diterbitkan' })).toBeVisible()
  await expect(copy.getByTestId('status-badge')).toHaveText('Aktif')
})
