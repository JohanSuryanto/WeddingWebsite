import { expect, test } from '@playwright/test'
import { createCouple, login, PUBLIC_URL } from './helpers'

test('creating a couple suggests the address and rejects taken or reserved names', async ({
  page,
}) => {
  await login(page, '/couples/new')
  await page.getByLabel('Nama panggilan mempelai wanita').fill('Sari')
  await page.getByLabel('Nama panggilan mempelai pria').fill('Budi')
  const slug = page.getByLabel('Alamat undangan')
  await expect(slug).toHaveValue('sari-budi')
  await expect(page.getByText(`${PUBLIC_URL}/sari-budi`)).toBeVisible()

  await slug.fill('login')
  await page.getByRole('button', { name: /Buat/ }).click()
  await expect(page.getByText('Nama alamat ini dipakai oleh sistem')).toBeVisible()

  await slug.fill('anisa-raka')
  await page.getByRole('button', { name: /Buat/ }).click()
  await expect(page.getByText('Nama alamat sudah dipakai pasangan lain')).toBeVisible()

  await slug.fill('budi-sari')
  await page.getByRole('button', { name: /Buat/ }).click()
  await expect(page).toHaveURL(/\/couples\/[^/]+\/mempelai$/)
})

test('the list shows both addresses with copy buttons; preview and links use the couple', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await login(page)
  const editorUrl = await createCouple(page, 'Sari', 'Budi')
  const id = editorUrl.split('/').at(-2)!

  await page.goto('/')
  const card = page.locator('[data-testid=couple-card][data-slug=sari-budi]')
  await expect(card).toContainText('Sari & Budi')
  await expect(card.getByTestId('status-badge')).toHaveText('Draf')
  await expect(card.getByTestId('invitation-url')).toHaveText(`${PUBLIC_URL}/sari-budi`)
  await expect(card.getByTestId('send-url')).toHaveText(`${PUBLIC_URL}/sari-budi/send-invitation`)
  await card.getByRole('button', { name: 'Salin Undangan' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${PUBLIC_URL}/sari-budi`)

  // Full-page preview shows this couple (any status).
  await page.goto(`/couples/${id}/preview`)
  const frame = page.frameLocator('[data-testid=full-preview]')
  await expect(frame.getByRole('heading', { level: 1 })).toContainText('Sari')
  await expect(frame.getByRole('heading', { level: 1 })).toContainText('Budi')

  // Send-invitation inside the admin builds links for the PUBLIC address.
  await page.goto(`/couples/${id}/send-invitation`)
  await page.getByLabel('Satu nama per baris').fill('Johan & Partner')
  await expect(page.getByTestId('invite-link').first()).toHaveText(
    `${PUBLIC_URL}/sari-budi?inv=Johan+%26+Partner&t=1`,
  )
  const preview = page.frameLocator('[data-testid=cover-preview]')
  await expect(preview.getByTestId('guest-name')).toHaveText('Johan & Partner')
})
