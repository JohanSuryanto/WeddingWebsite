import { readFileSync } from 'node:fs'
import { expect, test } from '../fixtures'
import { login, PUBLIC_URL } from './helpers'

test('the Respons tab shows guest responses; hiding a wish hides it publicly; CSV downloads (FR-019)', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000)
  await login(page)
  // A complete, published couple: a copy of the sample.
  await page.getByLabel('Cari pasangan').fill('anisa-raka')
  const [duplicated] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/duplicate') && r.request().method() === 'POST'),
    page.locator('[data-testid=couple-card][data-slug=anisa-raka]').getByRole('button', { name: 'Duplikat' }).click(),
  ])
  const { id, slug } = (await duplicated.json()).couple
  await page.getByLabel('Cari pasangan').fill(slug)
  await page.locator(`[data-testid=couple-card][data-slug=${slug}]`).getByRole('button', { name: 'Terbitkan' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Undangan diterbitkan' })).toBeVisible()

  // A guest answers.
  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto(`${PUBLIC_URL}/${slug}?inv=Pak+Andi`)
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  const rsvp = guest.locator('#rsvp')
  await rsvp.getByText('Hadir', { exact: true }).click()
  await rsvp.getByLabel('Jumlah Tamu').selectOption('2')
  await rsvp.getByRole('button', { name: 'Kirim Konfirmasi' }).click()
  await expect(rsvp.getByText('Terima kasih atas konfirmasinya')).toBeVisible()
  const message = `Ucapan untuk disembunyikan ${Date.now()}`
  await guest.locator('#ucapan').getByLabel('Ucapan & Doa').fill(message)
  await guest.locator('#ucapan').getByRole('button', { name: 'Kirim Ucapan' }).click()
  await expect(guest.getByTestId('wish-list')).toContainText(message)

  // The admin sees it, hides the wish.
  await page.goto(`/couples/${id}/respons`)
  await expect(page.getByTestId('total-Hadir')).toHaveText('1')
  await expect(page.getByTestId('total-Total tamu')).toHaveText('2')
  await expect(page.getByTestId('rsvp-list')).toContainText('Pak Andi')
  const item = page.getByTestId('admin-wish-list').locator('li').filter({ hasText: message })
  await item.getByRole('button', { name: 'Sembunyikan' }).click()
  await expect(item.getByText('Disembunyikan', { exact: true })).toBeVisible()

  await guest.reload()
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect(guest.getByTestId('wish-list')).not.toContainText(message)
  await guestContext.close()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Unduh CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(new RegExp(`^rsvp-${slug}-\\d{8}\\.csv$`))
  const csv = readFileSync(await download.path(), 'utf8')
  expect(csv.replace(String.fromCharCode(0xfeff), '').split('\r\n')[0]).toBe('Nama,Kehadiran,Jumlah Tamu,Waktu (WIB)')
  expect(csv).toContain('Pak Andi,Hadir,2,')
})
