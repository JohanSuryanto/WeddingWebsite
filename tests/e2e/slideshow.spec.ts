import { expect, test } from '../fixtures'
import { adminApi, duplicateSample } from './helpers'

const PUBLIC = 'http://localhost:4817'

test('the venue slideshow shows wishes, picks up new ones next, and drops hidden ones', async ({
  page,
  playwright,
}) => {
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api) // a copy has no wishes yet
  await api.post(`/api/admin/couples/${couple.id}/status`, { data: { status: 'active' } })
  const guests = await playwright.request.newContext({ baseURL: PUBLIC, extraHTTPHeaders: { origin: PUBLIC } })
  const wish = async (name: string, message: string) =>
    (await (await guests.post(`/api/public/couples/${couple.slug}/wishes`, { data: { name, message } })).json())
      .wish as { id: string }

  await wish('Pak Andi', 'Selamat menempuh hidup baru')
  // Fake timers: slides change every 8 s and the list refreshes every 15 s.
  await page.clock.install()
  await page.goto(`/${couple.slug}/ucapan`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Anisa')
  await expect(page.getByTestId('slideshow-wish')).toContainText('Selamat menempuh hidup baru')
  await expect(page.getByTestId('slideshow-wish')).toContainText('Pak Andi')
  await expect(page.getByTestId('slideshow-count')).toHaveText('1 ucapan')

  // A new wish arrives: the next refresh picks it up, and it's shown next.
  const second = await wish('Bu Rina', 'Bahagia selalu')
  await page.clock.runFor(16_000)
  await expect(page.getByTestId('slideshow-count')).toHaveText('2 ucapan')
  await page.clock.runFor(8_000)
  await expect(page.getByTestId('slideshow-wish')).toContainText('Bahagia selalu')

  // The admin hides it: it leaves the slideshow at the next refresh.
  await api.patch(`/api/admin/wishes/${second.id}`, { data: { hidden: true } })
  await page.clock.runFor(16_000)
  await expect(page.getByTestId('slideshow-count')).toHaveText('1 ucapan')
  await expect(page.getByTestId('slideshow-wish')).toContainText('Selamat menempuh hidup baru')

  await api.dispose()
  await guests.dispose()
})

test('a draft couple has no slideshow', async ({ page, playwright }) => {
  const api = await adminApi(playwright)
  const couple = await duplicateSample(api)
  await api.dispose()
  await page.goto(`/${couple.slug}/ucapan`)
  await expect(page.getByTestId('slideshow-wish')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Undangan belum tersedia' })).toBeVisible()
})
