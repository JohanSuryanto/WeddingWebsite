import { expect, test } from '../fixtures'
import { createCouple, fillRequired, login, save } from './helpers'

test('editor validates events, saves, and keeps data after reload', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await fillRequired(page)

  // Add a second event.
  await page.getByRole('link', { name: 'Acara' }).click()
  await page.getByRole('button', { name: '+ Tambah Acara' }).click()
  await page.locator('#f-content-events-1-name').fill('Resepsi')
  await page.locator('#f-content-events-1-start').fill('2027-05-01T11:00')
  await page.locator('#f-content-events-1-venueName').fill('Gedung Sate')
  await page.locator('#f-content-events-1-address').fill('Jl. Diponegoro No. 22, Bandung')

  // End before start → blocked with the exact message.
  await page.locator('#f-content-events-0-end').fill('2027-05-01T07:00')
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Jam selesai harus setelah jam mulai')).toBeVisible()
  await page.locator('#f-content-events-0-end').fill('2027-05-01T10:00')

  // Make the second event the main one, then save.
  await page
    .getByRole('radio', { name: /Acara utama/ })
    .nth(1)
    .check()
  await save(page)

  await page.reload()
  await page.getByRole('link', { name: 'Acara' }).click()
  await expect(page.locator('#f-content-events-1-name')).toHaveValue('Resepsi')
  await expect(page.getByRole('radio', { name: /Acara utama/ }).nth(1)).toBeChecked()
  await page.getByRole('link', { name: 'Mempelai' }).click()
  await expect(page.locator('#f-content-couple-bride-fullName')).toHaveValue(
    'Sari Wulandari, S.Pd.',
  )

  // The full preview shows the saved event with its time.
  const id = page.url().split('/').at(-2)
  await page.goto(`/couples/${id}/preview`)
  const frame = page.frameLocator('[data-testid=full-preview]')
  await frame.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect(frame.getByText('08.00 – 10.00 WIB')).toBeVisible()
  await expect(frame.getByRole('heading', { name: 'Resepsi' })).toBeVisible()
})

test('a main event is required before saving', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await fillRequired(page)
  await page.getByRole('link', { name: 'Acara' }).click()
  // Removing the only main event is impossible (one must stay); add a second
  // event, make it main, then delete it: no main event is left.
  await page.getByRole('button', { name: '+ Tambah Acara' }).click()
  await page
    .getByRole('radio', { name: /Acara utama/ })
    .nth(1)
    .check()
  await page.getByRole('button', { name: 'Hapus acara 2' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Pilih tepat satu acara utama')).toBeVisible()
})

test('leaving with unsaved changes asks first', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await page.locator('#f-content-couple-bride-fullName').fill('Perubahan')
  // Switching tabs keeps edits without asking.
  await page.getByRole('link', { name: 'Acara' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Leaving the couple asks.
  await page.getByRole('link', { name: '← Daftar' }).click()
  await expect(page.getByRole('dialog')).toContainText('Perubahan belum disimpan')
  await page.getByRole('button', { name: 'Tetap di sini' }).click()
  await expect(page).toHaveURL(/\/acara$/)
})
