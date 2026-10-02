import { expect, test } from '@playwright/test'
import { createCouple, FIXTURES, fillRequired, login, save } from './helpers'

function kb(text: string | null) {
  const m = /([\d.]+)\s*(KB|MB)/.exec(text ?? '')
  if (!m) return Infinity
  return m[2] === 'MB' ? Number(m[1]) * 1024 : Number(m[1])
}

test('large photos are compressed; wrong or oversized files are rejected', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await page.getByRole('link', { name: 'Foto' }).click()
  const cover = page.getByTestId('cover-field')

  await cover.locator('input[type=file]').setInputFiles(`${FIXTURES}/notes.txt`)
  await expect(cover.getByRole('alert')).toHaveText('File harus berupa gambar')

  await cover.locator('input[type=file]').setInputFiles(`${FIXTURES}/too-big.jpg`)
  await expect(cover.getByRole('alert')).toHaveText('Ukuran maksimal 10 MB')

  // A ~7 MB phone photo is stored at under 500 KB (SC-005).
  await cover.locator('input[type=file]').setInputFiles(`${FIXTURES}/large-photo.jpg`)
  const size = cover.getByTestId('stored-size')
  await expect(size).toBeVisible({ timeout: 20_000 })
  expect(kb(await size.textContent())).toBeLessThan(500)
})

test('gallery: upload, reorder, remove, required descriptions, saved order shows in preview', async ({
  page,
}) => {
  await login(page)
  await createCouple(page)
  await fillRequired(page)

  await page
    .locator('input[aria-label="Pilih foto galeri"]')
    .setInputFiles([1, 2, 3].map((i) => `${FIXTURES}/photo-${i}.jpg`))
  const items = page.getByTestId('gallery-item')
  await expect(items).toHaveCount(3)

  // Empty descriptions block saving.
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Deskripsi foto wajib diisi').first()).toBeVisible()

  for (let i = 0; i < 3; i++)
    await page.locator(`#gallery-alt-${i}`).fill(`Foto ${['satu', 'dua', 'tiga'][i]}`)
  // Move "tiga" to the top, then remove "dua".
  await page.getByRole('button', { name: 'Pindahkan foto 3 ke atas' }).click()
  await page.getByRole('button', { name: 'Pindahkan foto 2 ke atas' }).click()
  await expect(page.locator('#gallery-alt-0')).toHaveValue('Foto tiga')
  await expect(page.locator('#gallery-alt-2')).toHaveValue('Foto dua')
  await page.getByRole('button', { name: 'Hapus foto 3' }).click()
  await expect(items).toHaveCount(2)
  await save(page)

  await page.reload()
  await expect(page.locator('#gallery-alt-0')).toHaveValue('Foto tiga')
  await expect(page.locator('#gallery-alt-1')).toHaveValue('Foto satu')

  const id = page.url().split('/').at(-2)
  await page.goto(`/couples/${id}/preview`)
  const frame = page.frameLocator('[data-testid=full-preview]')
  await frame.getByRole('button', { name: 'Buka Undangan' }).click()
  const thumbs = frame.locator('#galeri button[aria-label^="Lihat foto"]')
  await expect(thumbs).toHaveCount(2)
  await expect(thumbs.nth(0)).toHaveAttribute('aria-label', 'Lihat foto: Foto tiga')
  await expect(thumbs.nth(1)).toHaveAttribute('aria-label', 'Lihat foto: Foto satu')
})

test('music can be uploaded and played in the dashboard', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await page.getByRole('link', { name: 'Musik' }).click()
  await page.locator('input[aria-label="Pilih file musik"]').setInputFiles(`${FIXTURES}/song.wav`)
  await expect(page.getByTestId('music-player')).toBeVisible()
})
