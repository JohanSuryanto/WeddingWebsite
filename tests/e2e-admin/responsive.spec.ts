import { test } from '@playwright/test'
import { createCouple, login, noHorizontalOverflow } from './helpers'

const TABS = [
  'mempelai',
  'acara',
  'foto',
  'cerita',
  'hadiah',
  'musik',
  'penutup',
  'pesan',
  'pengaturan',
  'respons',
]
// SC-006: besides this project's own width, check the other required widths too.
const WIDTHS = [320, 768, 1920]

test('admin pages have no horizontal overflow at 320–1920 px', async ({ page }) => {
  test.setTimeout(180_000)
  const own = page.viewportSize()!
  await page.goto('/login')
  await noHorizontalOverflow(page)
  await login(page)
  const editor = await createCouple(page)
  const base = editor.replace(/\/[^/]+$/, '')
  const pages = ['/', '/couples/new', '/backup', ...TABS.map((t) => `${base}/${t}`)]

  for (const width of [own.width, ...WIDTHS]) {
    await page.setViewportSize({ width, height: own.height })
    for (const path of pages) {
      await page.goto(path)
      await page.locator('main h1, main h2').first().waitFor()
      await noHorizontalOverflow(page)
    }
  }
})
