import type { Page } from '@playwright/test'

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
