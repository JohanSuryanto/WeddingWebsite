import { expect, test } from '../fixtures'
import { adminApi, duplicateSample, openInvitation, openSendInvitation, scrollThrough } from './helpers'

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

test('cover has no horizontal overflow, even with a 60-character name', async ({ page }) => {
  const name = 'Keluarga Besar Bapak H. Muhammad Abdullah Syarifuddin dan Ibu'
  await page.goto(`/anisa-raka?inv=${encodeURIComponent(name)}`)
  const box = await page.getByTestId('guest-name').boundingBox()
  const width = page.viewportSize()!.width
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(width)
  await assertNoHorizontalOverflow(page)
})

test('invitation has no horizontal overflow at this viewport', async ({ page }) => {
  await openInvitation(page)
  await scrollThrough(page)
  await assertNoHorizontalOverflow(page)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('disables petals and shows all content immediately', async ({ page }) => {
    await openInvitation(page)
    await expect(page.getByTestId('ambient-effect')).toHaveCount(0)
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll('.reveal')].filter(
          (el) => getComputedStyle(el).opacity === '0',
        ).length,
    )
    expect(hidden).toBe(0)
  })
})

test('gift copy, RSVP validation; RSVPs and wishes are saved', async ({
  page,
  context,
  browserName,
  playwright,
}) => {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }
  // Its own copy of the sample: every viewport (and every retry) answering the shared
  // couple from one IP would run into the per-IP limit (30 per 10 minutes).
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await api.post(`/api/admin/couples/${couple.id}/status`, { data: { status: 'active' } })
  await api.dispose()
  await openInvitation(page, `/${couple.slug}?inv=Budi+Santoso`)

  await page.locator('#hadiah').getByRole('button', { name: 'Salin', exact: true }).first().click()
  await expect(page.getByRole('status').filter({ hasText: 'Tersalin!' })).toBeVisible()
  if (browserName === 'chromium') {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('1234567890')
  }

  const rsvp = page.locator('#rsvp')
  await rsvp.getByLabel('Nama').fill('')
  await rsvp.getByRole('button', { name: 'Kirim Konfirmasi' }).click()
  await expect(rsvp.getByText('Nama wajib diisi')).toBeVisible()
  await expect(rsvp.getByText('Silakan pilih konfirmasi kehadiran')).toBeVisible()
  await rsvp.getByLabel('Nama').fill('Budi Santoso')
  await rsvp.getByText('Hadir', { exact: true }).click()
  await rsvp.getByRole('button', { name: 'Kirim Konfirmasi' }).click()
  await expect(rsvp.getByText('Terima kasih atas konfirmasinya')).toBeVisible()

  const wishes = page.locator('#ucapan')
  await expect(wishes.getByLabel('Nama')).toHaveValue('Budi Santoso')
  const text = `Selamat menempuh hidup baru! ${test.info().project.name} ${Date.now()}`
  await wishes.getByLabel('Ucapan & Doa').fill(text)
  await wishes.getByRole('button', { name: 'Kirim Ucapan' }).click()
  const list = page.getByTestId('wish-list')
  await expect(list.locator('li').first()).toContainText(text)

  // Saved now (US5): still there after a refresh, and the RSVP is remembered.
  await page.reload()
  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect(page.getByTestId('wish-list')).toContainText(text)
  await expect(page.locator('#rsvp')).toContainText('Respons Anda sudah kami terima')
})

test('passcode screen and guest responses have no horizontal overflow (US4, US5)', async ({ page }) => {
  await page.goto('/anisa-raka/send-invitation')
  await expect(page.getByRole('heading', { name: 'Masukkan kode akses' })).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await openSendInvitation(page)
  await expect(page.getByTestId('guest-responses')).toBeVisible()
  await assertNoHorizontalOverflow(page)
})
