import { expect, test } from '@playwright/test'
import { createCouple, FIXTURES, fillRequired, login, PUBLIC_URL, save, uniqueSlug } from './helpers'

test('a failed upload is retried on its own; saving waits for it (US3-3, FR-015)', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await page.getByRole('link', { name: 'Foto' }).click()

  // The first gallery file's upload to the media host fails; the others go through.
  let failed = false
  await page.route('**/api/dev/media/upload/**', (route) => {
    if (failed) return route.continue()
    failed = true
    return route.abort()
  })
  await page
    .locator('input[aria-label="Pilih foto galeri"]')
    .setInputFiles([1, 2, 3].map((i) => `${FIXTURES}/photo-${i}.jpg`))

  const uploads = page.getByTestId('gallery-upload')
  await expect(page.getByTestId('gallery-item')).toHaveCount(2)
  await expect(uploads).toHaveCount(1)
  await expect(uploads.first()).toContainText('Gagal mengunggah — Coba lagi')
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled()
  await expect(page.getByText('Tunggu unggahan selesai atau hapus file yang gagal')).toBeVisible()

  await page.unroute('**/api/dev/media/upload/**')
  await uploads.first().getByRole('button', { name: 'Coba lagi' }).click()
  await expect(uploads).toHaveCount(0)
  await expect(page.getByTestId('gallery-item')).toHaveCount(3)
  await expect(page.getByText('Tunggu unggahan selesai')).toHaveCount(0)
})

test('photos and music load on the public site; removed photos are deleted (US3-1, US3-4)', async ({
  page,
  browser,
}) => {
  await login(page)
  const slug = uniqueSlug('foto-musik')
  await createCouple(page, 'Sari', 'Budi', slug)
  await fillRequired(page)

  await page
    .locator('input[aria-label="Pilih foto galeri"]')
    .setInputFiles([1, 2, 3, 1, 2].map((i) => `${FIXTURES}/photo-${i}.jpg`))
  await expect(page.getByTestId('gallery-item')).toHaveCount(5)
  for (let i = 0; i < 5; i++) await page.locator(`#gallery-alt-${i}`).fill(`Foto ${i + 1}`)
  await page.getByRole('link', { name: 'Musik' }).click()
  await page.locator('input[aria-label="Pilih file musik"]').setInputFiles(`${FIXTURES}/song.wav`)
  await expect(page.getByTestId('music-player')).toBeVisible()
  await save(page)
  await page.getByRole('link', { name: 'Pengaturan' }).click()
  await page.getByRole('button', { name: 'Terbitkan' }).click()
  await expect(page.getByTestId('editor-status')).toHaveText('Aktif')

  // A different browser that never opened the admin.
  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto(`${PUBLIC_URL}/${slug}`)
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  const images = guest.locator('#galeri img')
  await expect(images).toHaveCount(5)
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded()
    await expect(img).toHaveJSProperty('complete', true)
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  }
  const musicSrc = await guest.locator('audio').getAttribute('src')
  expect(musicSrc).toMatch(/\/api\/dev\/media\//)
  expect((await guest.request.get(new URL(musicSrc!, PUBLIC_URL).toString())).status()).toBe(200)

  // Remove one gallery photo in the admin: its file is deleted.
  const firstSrc = await images.first().getAttribute('src')
  await page.getByRole('link', { name: 'Foto' }).click()
  await page.getByRole('button', { name: 'Hapus foto 1' }).click()
  await save(page)
  expect((await guest.request.get(new URL(firstSrc!, PUBLIC_URL).toString())).status()).toBe(404)
  await guestContext.close()
})
