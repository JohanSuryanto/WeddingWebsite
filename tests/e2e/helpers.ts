import { readFileSync } from 'node:fs'
import type { APIRequestContext, Page } from '@playwright/test'

export async function openInvitation(page: Page, path = '/anisa-raka') {
  await page.goto(path)
  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await page.locator('#beranda').waitFor({ state: 'visible' })
  // Wait for the cover exit transition to finish.
  await page.getByRole('dialog').waitFor({ state: 'detached' })
}

/** Scrolls through the whole page so every lazy image / reveal is triggered. */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 30))
    }
  })
}

/** The seeded Anisa & Raka passcode (written by `npm run db:seed -- --passcode-file`). */
export function seededPasscode(): string {
  return readFileSync('.data/e2e-passcode.txt', 'utf8').trim()
}

/** Opens /<slug>/send-invitation and enters the passcode on the passcode screen. */
export async function openSendInvitation(page: Page, slug = 'anisa-raka', passcode = seededPasscode()) {
  await page.goto(`/${slug}/send-invitation`)
  await page.getByLabel('Digit 1').waitFor()
  await page.getByLabel('Digit 1').pressSequentially(passcode)
  await page.getByRole('heading', { name: 'Buat Link Undangan' }).waitFor()
}

const ADMIN_ORIGIN = 'http://admin.localhost:4817'

/**
 * An API client logged in as the admin (for setting up test data). Node can't
 * resolve admin.localhost like browsers do, so it calls localhost with the admin Host.
 */
export async function adminApi(playwright: { request: { newContext: (o: object) => Promise<APIRequestContext> } }) {
  const api = await playwright.request.newContext({
    baseURL: 'http://localhost:4817',
    extraHTTPHeaders: { origin: ADMIN_ORIGIN, host: 'admin.localhost:4817' },
  })
  const res = await api.post('/api/admin/login', { data: { email: 'admin@test.local', password: 'rahasia123' } })
  if (!res.ok()) throw new Error(`admin login failed: ${res.status()}`)
  return api
}

/** A fresh draft copy of the sample couple (photos included), with its own address and passcode. */
export async function duplicateSample(api: APIRequestContext): Promise<{ id: string; slug: string; passcode: string }> {
  const { couple } = await (await api.get('/api/admin/couples/by-slug/anisa-raka')).json()
  const res = await api.post(`/api/admin/couples/${couple.id}/duplicate`)
  return (await res.json()).couple
}
