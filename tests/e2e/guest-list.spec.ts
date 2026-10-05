import { expect, test } from '@playwright/test'
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
  await page.getByLabel('Sembunyikan yang sudah dikirim').check()
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Bu Rina')
  await page.getByLabel('Sembunyikan yang sudah dikirim').uncheck()

  // Undo the mark.
  await page.getByRole('button', { name: 'Tandai belum dikirim: Budi Santoso' }).click()
  await expect(page.getByTestId('sent-count')).toHaveText('0 dari 2 tamu sudah dikirim')

  // The admin sees the same list.
  const { guests } = await (await api.get(`/api/admin/couples/${couple.id}/guests`)).json()
  expect(guests.map((g: { name: string }) => g.name)).toEqual(['Budi Santoso', 'Bu Rina'])
  await api.dispose()
})
