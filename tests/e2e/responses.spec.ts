import { expect, test, type Page } from '@playwright/test'
import { adminApi, duplicateSample, openInvitation } from './helpers'

async function rsvp(page: Page, name: string, count: number) {
  const section = page.locator('#rsvp')
  await section.getByLabel('Nama').fill(name)
  await section.getByText('Hadir', { exact: true }).click()
  await section.getByLabel('Jumlah Tamu').selectOption(String(count))
  await section.getByRole('button', { name: 'Kirim Konfirmasi' }).click()
  await expect(section.getByText('Terima kasih atas konfirmasinya')).toBeVisible()
}

async function wish(page: Page, name: string, message: string) {
  const section = page.locator('#ucapan')
  await section.getByLabel('Nama').fill(name)
  await section.getByLabel('Ucapan & Doa').fill(message)
  await section.getByRole('button', { name: 'Kirim Ucapan' }).click()
}

test('RSVPs and wishes are saved and shared between guests (US5)', async ({ browser, playwright }) => {
  test.setTimeout(90_000)
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await api.post(`/api/admin/couples/${couple.id}/status`, { data: { status: 'active' } })
  await api.dispose()
  const tag = Math.random().toString(36).slice(2, 7)

  const a = await (await browser.newContext()).newPage()
  const b = await (await browser.newContext()).newPage()
  await openInvitation(a, `/${couple.slug}`)
  await openInvitation(b, `/${couple.slug}`)

  await rsvp(a, 'Pak Andi', 2)
  await wish(a, 'Pak Andi', `Selamat dari Andi ${tag}`)
  await rsvp(b, 'Bu Rina', 1)
  await wish(b, 'Bu Rina', `Bahagia selalu dari Rina ${tag}`)

  // A changes their answer: it replaces the first one (FR-017).
  await a.locator('#rsvp').getByRole('button', { name: 'Ubah jawaban' }).click()
  await rsvp(a, 'Pak Andi', 3)

  // After a refresh, both guests see both wishes, and A sees their saved answer.
  for (const page of [a, b]) {
    await page.reload()
    await page.getByRole('button', { name: 'Buka Undangan' }).click()
    const list = page.getByTestId('wish-list')
    await expect(list).toContainText(`Selamat dari Andi ${tag}`)
    await expect(list).toContainText(`Bahagia selalu dari Rina ${tag}`)
  }
  await expect(a.locator('#rsvp')).toContainText('Respons Anda sudah kami terima')

  // The couple sees the totals on their unlocked page.
  const c = await (await browser.newContext()).newPage()
  await c.goto(`/${couple.slug}/send-invitation`)
  await c.getByLabel('Digit 1').pressSequentially(couple.passcode)
  const panel = c.getByTestId('guest-responses')
  await expect(panel.getByTestId('total-Hadir')).toHaveText('2')
  await expect(panel.getByTestId('total-Total tamu')).toHaveText('4')
  await expect(panel).toContainText(`Bahagia selalu dari Rina ${tag}`)

  // A 6th wish within 10 minutes from one browser is refused (FR-020).
  for (let i = 2; i <= 5; i++) {
    await wish(a, 'Pak Andi', `Ucapan ${i} ${tag}`)
    await expect(a.getByTestId('wish-list')).toContainText(`Ucapan ${i} ${tag}`)
  }
  await wish(a, 'Pak Andi', `Ucapan 6 ${tag}`)
  await expect(a.locator('#ucapan')).toContainText('Terlalu banyak pesan, coba lagi nanti')
})
