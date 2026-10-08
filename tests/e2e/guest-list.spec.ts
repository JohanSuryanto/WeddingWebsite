import { expect, test } from '../fixtures'
import { adminApi, duplicateSample, openSendInvitation } from './helpers'

test('the guest list is saved, marks who was sent a link, and is shared with the admin', async ({
  page,
  playwright,
}) => {
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await openSendInvitation(page, couple.slug, couple.passcode)

  const status = page.getByTestId('guest-list-status')
  await expect(status).toHaveText('Daftar tamu tersimpan otomatis.')
  await page.getByLabel('Satu nama per baris').fill('Budi Santoso\nBu Rina')
  await expect(status).toHaveText('Daftar tamu tersimpan otomatis.')
  await expect(page.getByTestId('sent-count')).toHaveText('0 dari 2 tamu sudah dikirim')

  // Copying a guest's message marks them sent.
  const rows = page.getByTestId('invite-rows').locator('li')
  await rows.nth(0).getByRole('button', { name: 'Salin Pesan' }).click()
  await expect(rows.nth(0).getByTestId('sent-badge')).toBeVisible()
  await expect(page.getByTestId('sent-count')).toHaveText('1 dari 2 tamu sudah dikirim')

  // Still there after a reload; the filter hides who was already sent.
  await page.reload()
  await expect(page.getByLabel('Satu nama per baris')).toHaveValue('Budi Santoso\nBu Rina')
  await expect(page.getByTestId('sent-count')).toHaveText('1 dari 2 tamu sudah dikirim')
  await page.getByLabel('Tampilkan').selectOption({ label: 'Belum dikirim' })
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Bu Rina')
  await page.getByLabel('Tampilkan').selectOption({ label: 'Semua tamu' })

  // Undo the mark.
  await page.getByRole('button', { name: 'Tandai belum dikirim: Budi Santoso' }).click()
  await expect(page.getByTestId('sent-count')).toHaveText('0 dari 2 tamu sudah dikirim')

  // The admin sees the same list.
  const { guests } = await (await api.get(`/api/admin/couples/${couple.id}/guests`)).json()
  expect(guests.map((g: { name: string }) => g.name)).toEqual(['Budi Santoso', 'Bu Rina'])
  await api.dispose()
})

test("a guest's reply through their own link shows on the couple's list", async ({ page, browser, playwright }) => {
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await api.post(`/api/admin/couples/${couple.id}/status`, { data: { status: 'active' } })
  await api.dispose()
  await openSendInvitation(page, couple.slug, couple.passcode)
  await page.getByLabel('Satu nama per baris').fill('Budi Santoso\nBu Rina')
  await expect(page.getByTestId('guest-list-status')).toHaveText('Daftar tamu tersimpan otomatis.')

  // Each saved guest's link carries their code.
  const rows = page.getByTestId('invite-rows').locator('li')
  const link = (await rows.nth(0).getByTestId('invite-link').textContent())!
  expect(link).toMatch(/[?&]g=[0-9a-f]{8}$/)

  // Budi opens his link and answers.
  const guest = await (await browser.newContext()).newPage()
  await guest.goto(link)
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  const rsvp = guest.locator('#rsvp')
  await rsvp.getByText('Hadir', { exact: true }).click()
  await rsvp.getByLabel('Jumlah Tamu').selectOption('2')
  await rsvp.getByRole('button', { name: 'Kirim Konfirmasi' }).click()
  await expect(rsvp.getByText('Terima kasih atas konfirmasinya')).toBeVisible()

  // The couple sees who replied, and can list who hasn't.
  await page.reload()
  await expect(rows.nth(0).getByTestId('reply-badge')).toHaveText('Hadir · 2 orang')
  await expect(page.getByTestId('reply-count')).toHaveText('1 sudah menjawab')
  await page.getByLabel('Tampilkan').selectOption({ label: 'Belum menjawab' })
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Bu Rina')
})
