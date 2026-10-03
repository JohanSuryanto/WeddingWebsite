import { expect, test } from '@playwright/test'
import { createCouple, FIXTURES, login } from './helpers'

test('every upload opens a picker: sample photos or music, or a file from this device', async ({ page }) => {
  await login(page)
  await createCouple(page)
  await page.getByRole('link', { name: 'Foto' }).click()

  // Cover: clicking the photo area opens the picker; a sample is uploaded like a file.
  const cover = page.getByTestId('cover-field')
  await cover.getByRole('button', { name: 'Buka pilihan foto Latar sampul' }).click()
  const dialog = page.getByRole('dialog', { name: 'Pilih foto: Latar sampul' })
  await expect(dialog.getByTestId('sample-photos').getByRole('button')).toHaveCount(6)
  await dialog.getByRole('button', { name: /Cincin pernikahan/ }).click()
  await expect(dialog).toBeHidden()
  await expect(cover.getByTestId('stored-size')).toBeVisible()
  await expect(cover.getByRole('img', { name: 'Pratinjau Latar sampul' })).toBeVisible()

  // Bride photo: "Unggah dari perangkat" opens the normal file chooser.
  const bride = page.getByTestId('bride-photo-field')
  await bride.getByRole('button', { name: 'Pilih Foto', exact: true }).click()
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('dialog').getByRole('button', { name: 'Unggah dari perangkat' }).click(),
  ])
  await chooser.setFiles(`${FIXTURES}/photo-2.jpg`)
  await expect(bride.getByTestId('stored-size')).toBeVisible()

  // Gallery: several samples at once, each starting with its label as the description.
  await page.getByRole('button', { name: '+ Tambah Foto' }).click()
  const gallery = page.getByRole('dialog', { name: 'Tambah foto galeri' })
  await gallery.getByRole('button', { name: /Mawar merah muda/ }).click()
  await gallery.getByRole('button', { name: /Cahaya lilin/ }).click()
  await expect(gallery.getByRole('button', { name: /Cahaya lilin/ })).toHaveAttribute('aria-pressed', 'true')
  await gallery.getByRole('button', { name: 'Tambahkan 2 contoh' }).click()
  await expect(page.getByTestId('gallery-item')).toHaveCount(2)
  await expect(page.locator('#gallery-alt-0')).toHaveValue('Mawar merah muda')
  await expect(page.locator('#gallery-alt-1')).toHaveValue('Cahaya lilin')

  // Music: 3 samples to preview and pick.
  await page.getByRole('link', { name: 'Musik' }).click()
  await page.getByRole('button', { name: 'Pilih Musik', exact: true }).click()
  const music = page.getByRole('dialog', { name: 'Pilih musik' })
  await expect(music.getByTestId('sample-music').locator('li')).toHaveCount(3)
  await music.getByRole('button', { name: 'Pilih Waltz romantis' }).click()
  await expect(page.getByTestId('music-player')).toBeVisible()
  await expect(page.getByLabel('Judul (opsional)')).toHaveValue('Waltz romantis')
})
