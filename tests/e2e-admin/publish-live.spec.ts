import { expect, test } from '../fixtures'
import { login, PUBLIC_URL } from './helpers'

test('a couple published in the admin is live on the public site for any browser (US1, SC-001)', async ({
  page,
  browser,
}) => {
  await login(page)
  await page.getByLabel('Cari pasangan').fill('anisa-raka')
  const [duplicated] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/duplicate') && r.request().method() === 'POST'),
    page
      .locator('[data-testid=couple-card][data-slug=anisa-raka]')
      .getByRole('button', { name: 'Duplikat' })
      .click(),
  ])
  const slug: string = (await duplicated.json()).couple.slug
  await page.getByLabel('Cari pasangan').fill(slug)
  const card = page.locator(`[data-testid=couple-card][data-slug=${slug}]`)

  // Draft: guests see "belum tersedia".
  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto(`${PUBLIC_URL}/${slug}`)
  await expect(guest.getByRole('heading', { name: 'Undangan belum tersedia' })).toBeVisible()

  // Publish: the same address now shows the invitation, with no redeploy.
  const published = Date.now()
  await card.getByRole('button', { name: 'Terbitkan' }).click()
  await expect(card.getByTestId('status-badge')).toHaveText('Aktif')
  await guest.reload()
  await expect(guest.getByRole('button', { name: 'Buka Undangan' })).toBeVisible()
  await expect(guest.locator('body')).toContainText('Anisa')
  expect(Date.now() - published).toBeLessThan(10_000)

  // Photos copied with the duplicate load on the public site.
  const cover = guest.locator('img').first()
  await expect(cover).toHaveJSProperty('complete', true)

  // Back to draft: hidden again.
  await card.getByRole('button', { name: 'Jadikan Draf' }).click()
  await expect(card.getByTestId('status-badge')).toHaveText('Draf')
  await guest.reload()
  await expect(guest.getByRole('heading', { name: 'Undangan belum tersedia' })).toBeVisible()
  await guestContext.close()
})
