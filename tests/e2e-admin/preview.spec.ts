import { expect, test } from '@playwright/test'
import { createCouple, login } from './helpers'

test('live preview follows unsaved edits and switches themes without saving', async ({
  page,
  isMobile,
}) => {
  await login(page)
  await createCouple(page)

  if (isMobile) await page.getByRole('button', { name: 'Lihat Tampilan' }).click()
  const frame = page.frameLocator('[data-testid=live-preview]')
  await expect(frame.getByRole('heading', { level: 1 })).toContainText('Sari')

  if (isMobile) await page.getByRole('button', { name: 'Tutup' }).click()
  await page.locator('#f-content-couple-bride-nickname').fill('Ayu')
  if (isMobile) await page.getByRole('button', { name: 'Lihat Tampilan' }).click()
  await expect(frame.getByRole('heading', { level: 1 })).toContainText('Ayu', { timeout: 1000 })

  await page.getByRole('button', { name: 'Tema 2' }).click()
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'elegant-classic')

  await page.locator('#preview-guest').fill('Johan & Partner')
  await expect(frame.getByTestId('guest-name')).toHaveText('Johan & Partner')

  // Nothing was saved: the stored default theme is unchanged.
  if (isMobile) await page.getByRole('button', { name: 'Tutup' }).click()
  await page.getByRole('link', { name: 'Pengaturan' }).click()
  await expect(page.getByRole('radio', { name: /1\. Romantic Floral/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeEnabled()
})

test('after opening the invitation inside a preview, "Sampul" goes back to the cover', async ({
  page,
  isMobile,
}) => {
  await login(page)
  await createCouple(page)

  // Live preview: open it inside the frame, then press Sampul (already selected).
  if (isMobile) await page.getByRole('button', { name: 'Lihat Tampilan' }).click()
  const live = page.frameLocator('[data-testid=live-preview]')
  await live.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect(live.getByRole('button', { name: 'Buka Undangan' })).toHaveCount(0)
  await page
    .getByRole('group', { name: 'Bagian pratinjau' })
    .getByRole('button', { name: 'Sampul' })
    .click()
  await expect(live.getByRole('button', { name: 'Buka Undangan' })).toBeVisible()

  // Full preview: same, with its own Sampul button.
  const id = page.url().split('/').at(-2)
  await page.goto(`/couples/${id}/preview`)
  const full = page.frameLocator('[data-testid=full-preview]')
  await full.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect(full.getByRole('button', { name: 'Buka Undangan' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sampul', exact: true }).click()
  await expect(full.getByRole('button', { name: 'Buka Undangan' })).toBeVisible()
})
