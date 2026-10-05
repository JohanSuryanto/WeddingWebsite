import { expect, test } from '@playwright/test'
import { adminApi, duplicateSample } from './helpers'

test('the send-invitation page stays locked until the right passcode (US4, SC-009, SC-010)', async ({
  page,
  browser,
  playwright,
}) => {
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await api.dispose()
  const wrong = couple.passcode === '0000' ? '1111' : '0000'

  // Nothing but the names is loaded before unlocking.
  const coupleCalls: string[] = []
  page.on('response', (r) => {
    if (r.url().includes('/api/couple/') && r.ok()) coupleCalls.push(r.url())
  })
  await page.goto(`/${couple.slug}/send-invitation`)
  await expect(page.getByRole('heading', { name: 'Masukkan kode akses' })).toBeVisible()
  await expect(page.getByText('Anisa & Raka')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Buat Link Undangan' })).toHaveCount(0)
  await expect(page.getByLabel('Satu nama per baris')).toHaveCount(0)

  await page.getByLabel('Digit 1').pressSequentially(wrong)
  await expect(page.getByRole('alert')).toHaveText('Kode akses salah')
  await expect(page.getByLabel('Digit 1')).toHaveValue('')
  expect(coupleCalls).toEqual([])

  const started = Date.now()
  await page.getByLabel('Digit 1').pressSequentially(couple.passcode)
  await expect(page.getByRole('heading', { name: 'Buat Link Undangan' })).toBeVisible()
  // A draft can be prepared, with a notice (US4-8).
  await expect(page.getByRole('note')).toContainText('Undangan belum aktif')
  await expect(page.getByTestId('qr-code')).toBeVisible()

  await page.getByLabel('Satu nama per baris').fill('Pak Andi')
  const link = (await page.getByTestId('invite-link').first().textContent())!
  expect(Date.now() - started).toBeLessThan(60_000)
  expect(link).toContain(`/${couple.slug}?inv=Pak+Andi`)
  expect(link).not.toContain(couple.passcode)

  // "Keluar" locks the page again.
  await page.getByRole('button', { name: 'Keluar' }).click()
  await expect(page.getByRole('heading', { name: 'Masukkan kode akses' })).toBeVisible()

  // Guests never need the passcode (FR-010e): publish, then open the guest link elsewhere.
  const admin = await adminApi(playwright)
  await admin.post(`/api/admin/couples/${couple.id}/status`, { data: { status: 'active' } })
  await admin.dispose()
  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto(link)
  await expect(guest.getByTestId('guest-name')).toHaveText('Pak Andi')
  await expect(guest.getByRole('heading', { name: 'Masukkan kode akses' })).toHaveCount(0)
  await guestContext.close()
})

test('pasting the 4 digits unlocks too', async ({ page, playwright }) => {
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await api.dispose()
  await page.goto(`/${couple.slug}/send-invitation`)
  await page.getByLabel('Digit 1').focus()
  await page.evaluate((code) => {
    const data = new DataTransfer()
    data.setData('text', code)
    document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  }, couple.passcode)
  await expect(page.getByRole('heading', { name: 'Buat Link Undangan' })).toBeVisible()
})
