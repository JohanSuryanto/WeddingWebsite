import { expect, test } from '@playwright/test'
import { openInvitation } from './helpers'

const SECTIONS = ['beranda', 'mempelai', 'acara', 'cerita', 'galeri', 'hadiah', 'rsvp', 'ucapan']

test('every section is reachable in one tap/click and gets highlighted', async ({ page }) => {
  await openInvitation(page)
  const nav = page.getByRole('navigation', { name: 'Navigasi bagian undangan' })
  for (const id of SECTIONS) {
    const link = nav.locator(`a[href="#${id}"]:visible`)
    await expect(link).toBeInViewport() // no scrolling of the nav needed
    await link.click()
    await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.1 })
    await expect(link).toHaveAttribute('aria-current', 'true')
  }
})
