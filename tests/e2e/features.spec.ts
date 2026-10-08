import { expect, test } from '../fixtures'
import { openInvitation } from './helpers'

test('music stays silent until "Buka Undangan" is clicked', async ({ page }) => {
  await page.goto('/anisa-raka')
  await page.waitForTimeout(1500)
  const audio = page.locator('audio')
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused && a.currentTime === 0)).toBe(true)
  await expect(page.getByRole('button', { name: /musik/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Buka Undangan' }).click()
  await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => !a.paused)).toBe(true)
})

test('music starts on open and the toggle pauses/resumes it', async ({ page }) => {
  await openInvitation(page)
  const toggle = page.getByRole('button', { name: /musik/ })
  await expect(toggle).toHaveAttribute('aria-label', 'Jeda musik')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-label', 'Putar musik')
  expect(await page.locator('audio').evaluate((a: HTMLAudioElement) => a.paused)).toBe(true)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-label', 'Jeda musik')
})

/** Simulates the guest switching to another tab/app (hidden=true) and back. */
async function setPageHidden(page: import('@playwright/test').Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (h ? 'hidden' : 'visible'),
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

test('music pauses while the page is hidden and resumes on return', async ({ page }) => {
  await openInvitation(page)
  const audio = page.locator('audio')
  const isPaused = () => audio.evaluate((a: HTMLAudioElement) => a.paused)
  await expect.poll(isPaused).toBe(false)

  await setPageHidden(page, true)
  await expect.poll(isPaused).toBe(true)

  await setPageHidden(page, false)
  await expect.poll(isPaused).toBe(false)
  await expect(page.getByRole('button', { name: 'Jeda musik' })).toBeVisible()
})

test('music the guest paused stays paused after returning', async ({ page }) => {
  await openInvitation(page)
  const audio = page.locator('audio')
  const isPaused = () => audio.evaluate((a: HTMLAudioElement) => a.paused)
  await page.getByRole('button', { name: 'Jeda musik' }).click()
  await expect.poll(isPaused).toBe(true)

  await setPageHidden(page, true)
  await setPageHidden(page, false)
  await page.waitForTimeout(300)
  expect(await isPaused()).toBe(true)
  await expect(page.getByRole('button', { name: 'Putar musik' })).toBeVisible()
})

test('event cards show Indonesian dates, times and map links', async ({ page }) => {
  await openInvitation(page)
  const acara = page.locator('#acara')
  await expect(acara.getByText('Minggu, 14 Februari 2027').first()).toBeVisible()
  await expect(acara.getByText('08.00 – 10.00 WIB')).toBeVisible()
  const maps = acara.getByRole('link', { name: 'Lihat Lokasi' })
  await expect(maps).toHaveCount(2)
  await expect(maps.first()).toHaveAttribute('target', '_blank')
  await expect(acara.getByText('Hari', { exact: true })).toBeVisible()
})

test('Save the Date offers Google Calendar and an .ics download', async ({ page }) => {
  await openInvitation(page)
  await page.getByRole('button', { name: 'Simpan Tanggal' }).click()
  const google = page.getByRole('link', { name: 'Google Calendar' })
  await expect(google).toHaveAttribute('href', /calendar\.google\.com.*dates=20270214T010000Z/)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /\.ics/ }).click(),
  ])
  expect(download.suggestedFilename()).toBe('undangan-pernikahan.ics')
})

test('gallery opens a full-screen viewer with next/prev and close', async ({ page }) => {
  await openInvitation(page)
  await page.locator('#galeri').getByRole('button').first().click()
  const next = page.getByRole('button', { name: 'Berikutnya' })
  await expect(next).toBeVisible()
  await next.click()
  await page.getByRole('button', { name: 'Tutup' }).click()
  await expect(next).toHaveCount(0)
})
