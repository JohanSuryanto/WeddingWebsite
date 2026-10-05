import { expect, test } from '@playwright/test'
import { login, PUBLIC_URL } from './helpers'

test('a full backup brings a deleted couple back with photos and responses (US7, SC-005)', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000)
  // The backup holds every couple in the shared e2e database; two viewports
  // deleting and restoring at once would act on each other's couples.
  test.skip(test.info().project.name !== 'admin-1366', 'one viewport is enough for a round trip')
  await login(page)
  await page.getByLabel('Cari pasangan').fill('anisa-raka')
  const [duplicated] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/duplicate') && r.request().method() === 'POST'),
    page.locator('[data-testid=couple-card][data-slug=anisa-raka]').getByRole('button', { name: 'Duplikat' }).click(),
  ])
  const { id, slug, passcode } = (await duplicated.json()).couple
  await page.getByLabel('Cari pasangan').fill(slug)
  await page.locator(`[data-testid=couple-card][data-slug=${slug}]`).getByRole('button', { name: 'Terbitkan' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Undangan diterbitkan' })).toBeVisible()

  // A guest answers.
  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto(`${PUBLIC_URL}/${slug}?inv=Pak+Andi`)
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  await guest.locator('#rsvp').getByText('Hadir', { exact: true }).click()
  await guest.locator('#rsvp').getByRole('button', { name: 'Kirim Konfirmasi' }).click()
  await expect(guest.locator('#rsvp').getByText('Terima kasih atas konfirmasinya')).toBeVisible()
  const message = `Doa untuk cadangan ${Date.now()}`
  await guest.locator('#ucapan').getByLabel('Ucapan & Doa').fill(message)
  await guest.locator('#ucapan').getByRole('button', { name: 'Kirim Ucapan' }).click()
  await expect(guest.getByTestId('wish-list')).toContainText(message)

  // Download the full backup.
  await page.goto('/backup')
  const downloading = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'Unduh Cadangan' }).click()
  // An export error shows as an alert; fail with its text instead of a bare timeout.
  const alert = page.getByRole('alert')
  const failed = alert.waitFor({ timeout: 120_000 }).then(async () => {
    throw new Error(`Export failed: ${await alert.innerText()}`)
  })
  // The loser of the race rejects when the page closes; don't report that.
  for (const p of [downloading, failed]) p.catch(() => {})
  const download = await Promise.race([downloading, failed])
  expect(download.suggestedFilename()).toMatch(/^undangan-backup-\d{8}-\d{4}\.json$/)
  const file = await download.path()

  // Delete the couple, then restore the file: only this couple is new, so only it comes back.
  await page.goto('/')
  await page.getByLabel('Cari pasangan').fill(slug)
  const card = page.locator(`[data-testid=couple-card][data-slug=${slug}]`)
  await card.getByRole('button', { name: 'Hapus' }).click()
  await page.getByRole('dialog').getByRole('textbox').fill(slug)
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus permanen' }).click()
  await expect(card).toHaveCount(0)

  await page.goto('/backup')
  await page.locator('#restore-file').setInputFiles(file)
  await expect(page.getByTestId('restore-summary')).toBeVisible()
  await page.getByRole('button', { name: 'Pulihkan' }).click()
  const results = page.getByTestId('restore-results')
  await expect(results).toBeVisible({ timeout: 90_000 })
  await expect(results).not.toContainText('Gagal')

  // Same couple, same passcode, photos and responses.
  await page.goto(`/couples/${id}/respons`)
  await expect(page.getByTestId('rsvp-list')).toContainText('Pak Andi')
  await expect(page.getByTestId('admin-wish-list')).toContainText(message)
  await guest.goto(`${PUBLIC_URL}/${slug}`)
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  const img = guest.locator('#galeri img').first()
  await img.scrollIntoViewIfNeeded()
  // Gallery photos load lazily: wait until this one has.
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0)
  await guest.goto(`${PUBLIC_URL}/${slug}/send-invitation`)
  await guest.getByLabel('Digit 1').pressSequentially(passcode)
  await expect(guest.getByRole('heading', { name: 'Buat Link Undangan' })).toBeVisible()
  await guestContext.close()
})
