import { expect, type Page } from '@playwright/test'

export const ADMIN = { email: 'admin@test.local', password: 'rahasia123' }
export const PUBLIC_URL = 'http://localhost:4817'

export async function login(page: Page, path = '/') {
  await page.goto(path)
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Kata sandi').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

/**
 * A fresh address name. All specs and both admin viewports share one database,
 * so every couple a test creates needs its own.
 */
export function uniqueSlug(base = 'sari-budi') {
  return `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Creates a couple from the dashboard and returns its editor URL. */
export async function createCouple(page: Page, bride = 'Sari', groom = 'Budi', slug = uniqueSlug()) {
  await page.goto('/couples/new')
  await page.getByLabel('Nama panggilan mempelai wanita').fill(bride)
  await page.getByLabel('Nama panggilan mempelai pria').fill(groom)
  await page.getByLabel('Alamat undangan').fill(slug)
  await page.getByRole('button', { name: /Buat/ }).click()
  await expect(page).toHaveURL(/\/couples\/[^/]+\/mempelai$/)
  return page.url()
}

export async function noHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

export const FIXTURES = 'tests/e2e-admin/fixtures'

/** Fills every required field of a freshly created couple (photos included). */
export async function fillRequired(page: Page) {
  const base = page.url().replace(/\/[^/]+$/, '')
  await page.goto(`${base}/mempelai`)
  const fields: [string, string][] = [
    ['f-content-couple-bride-fullName', 'Sari Wulandari, S.Pd.'],
    ['f-content-couple-bride-father', 'Bapak Ahmad'],
    ['f-content-couple-bride-mother', 'Ibu Siti'],
    ['f-content-couple-groom-fullName', 'Budi Hartono, S.T.'],
    ['f-content-couple-groom-father', 'Bapak Joko'],
    ['f-content-couple-groom-mother', 'Ibu Rina'],
  ]
  for (const [id, value] of fields) await page.locator(`#${id}`).fill(value)

  await page.getByRole('link', { name: 'Acara' }).click()
  await page.locator('#f-content-events-0-start').fill('2027-05-01T08:00')
  await page.locator('#f-content-events-0-end').fill('2027-05-01T10:00')
  await page.locator('#f-content-events-0-venueName').fill('Masjid Raya')
  await page.locator('#f-content-events-0-address').fill('Jl. Merdeka No. 1, Bandung')

  await page.getByRole('link', { name: 'Foto' }).click()
  for (const [testId, file] of [
    ['cover-field', 'photo-1.jpg'],
    ['bride-photo-field', 'photo-2.jpg'],
    ['groom-photo-field', 'photo-3.jpg'],
  ]) {
    await page
      .locator(`[data-testid=${testId}] input[type=file]`)
      .setInputFiles(`${FIXTURES}/${file}`)
    await expect(page.locator(`[data-testid=${testId}] [data-testid=stored-size]`)).toBeVisible()
  }
}

export async function save(page: Page) {
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Tersimpan' })).toBeVisible()
}
