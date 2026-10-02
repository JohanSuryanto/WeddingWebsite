import { expect, test } from '@playwright/test'
import { openInvitation, scrollThrough } from './helpers'

const THEMES = [
  ['1', 'romantic-floral'],
  ['2', 'elegant-classic'],
  ['3', 'rustic-garden'],
] as const

for (const [code, id] of THEMES) {
  test(`?t=${code} previews ${id} without layout breakage`, async ({ page }) => {
    await openInvitation(page, `/anisa-raka?inv=Budi&t=${code}`)
    await expect(page.locator('html')).toHaveAttribute('data-theme', id)
    await scrollThrough(page)
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
}

test('an unknown ?t= falls back to the configured theme', async ({ page }) => {
  await page.goto('/anisa-raka?t=9')
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    /^(romantic-floral|elegant-classic|rustic-garden)$/,
  )
})
