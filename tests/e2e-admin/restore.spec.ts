import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '../fixtures'
import { login, PUBLIC_URL } from './helpers'

type Media = { id: string; coupleId: string; kind: string; mime: string; size: number; createdAt: string; data: string }

/**
 * A backup in the 002 (v1) format, as the old browser-only dashboard wrote it:
 * copies of the sample couple with their photos inlined, and no passcodes.
 */
async function v1Backup(request: APIRequestContext, slugs: string[]) {
  const { couple } = await (await request.get(`${PUBLIC_URL}/api/public/couples/anisa-raka`)).json()
  const files = new Map<string, { bytes: Buffer; mime: string }>()
  const collect = (src: string) => src && src.startsWith('/api/') && files.set(src, { bytes: Buffer.alloc(0), mime: '' })
  JSON.stringify(couple.content, (_k, v) => {
    if (typeof v === 'string') collect(v)
    return v
  })
  for (const url of files.keys()) {
    const res = await request.get(`${PUBLIC_URL}${url}`)
    files.set(url, { bytes: Buffer.from(await res.body()), mime: res.headers()['content-type'] })
  }
  const couples = []
  const media: Media[] = []
  for (const slug of slugs) {
    const id = randomUUID()
    const ids = new Map([...files.keys()].map((url) => [url, randomUUID()]))
    const content = JSON.parse(JSON.stringify(couple.content), (_k, v) =>
      typeof v === 'string' && ids.has(v) ? `media:${ids.get(v)}` : v,
    )
    couples.push({
      id,
      slug,
      status: 'active',
      defaultTheme: 'rustic-garden',
      content,
      version: 2,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    })
    for (const [url, mediaId] of ids) {
      const f = files.get(url)!
      media.push({
        id: mediaId,
        coupleId: id,
        kind: f.mime.startsWith('audio') ? 'audio' : 'image',
        mime: f.mime,
        size: f.bytes.length,
        createdAt: '2026-10-01T00:00:00.000Z',
        data: f.bytes.toString('base64'),
      })
    }
  }
  const doc = { format: 'wedding-admin-backup', formatVersion: 1, createdAt: '2026-10-01T00:00:00.000Z', couples, media }
  return { name: 'undangan-backup-lama.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) }
}

async function restore(page: Page, file: Awaited<ReturnType<typeof v1Backup>>) {
  await page.goto('/backup')
  await page.locator('#restore-file').setInputFiles(file)
  await expect(page.getByTestId('restore-summary')).toBeVisible()
  await page.getByRole('button', { name: 'Pulihkan' }).click()
  await expect(page.getByTestId('restore-results')).toBeVisible({ timeout: 60_000 })
  return page.getByTestId('restore-results')
}

test('a 002 backup restores online, can be re-run, and resumes after a failure (US6, FR-021)', async ({
  page,
  request,
}) => {
  test.setTimeout(150_000)
  const tag = Math.random().toString(36).slice(2, 7)
  const [one, two] = [`lama-satu-${tag}`, `lama-dua-${tag}`]
  const file = await v1Backup(request, [one, two])
  await login(page)

  const results = await restore(page, file)
  await expect(results.locator('li')).toHaveCount(2)
  await expect(results.getByText('Gagal', { exact: true })).toHaveCount(0)
  await expect(results.getByText('Dipulihkan', { exact: true })).toHaveCount(2)

  // Live with photos, and each got a passcode.
  await page.goto('/')
  await page.getByLabel('Cari pasangan').fill(tag)
  await expect(page.getByTestId('couple-card')).toHaveCount(2)
  await expect(page.locator(`[data-testid=couple-card][data-slug=${one}] [data-testid=status-badge]`)).toHaveText('Aktif')
  const guest = await (await page.context().browser()!.newContext()).newPage()
  await guest.goto(`${PUBLIC_URL}/${one}`)
  await guest.getByRole('button', { name: 'Buka Undangan' }).click()
  const img = guest.locator('#galeri img').first()
  await img.scrollIntoViewIfNeeded()
  // Gallery photos load lazily: wait until this one has.
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0)

  // Same file again: both already exist → "Lewati" by default, nothing duplicated.
  await page.goto('/backup')
  await page.locator('#restore-file').setInputFiles(file)
  await expect(page.getByTestId('restore-row').getByText('Sudah ada')).toHaveCount(2)
  await page.getByRole('button', { name: 'Pulihkan' }).click()
  await expect(page.getByTestId('restore-results').getByText('Dilewati', { exact: true })).toHaveCount(2)
  await page.goto('/')
  await page.getByLabel('Cari pasangan').fill(tag)
  await expect(page.getByTestId('couple-card')).toHaveCount(2)

  // A run interrupted for one couple: "Gagal", flagged, then finished by running again.
  const [three, four] = [`lama-tiga-${tag}`, `lama-empat-${tag}`]
  const file2 = await v1Backup(request, [three, four])
  const fourId = JSON.parse(file2.buffer.toString()).couples[1].id as string
  await page.route('**/api/dev/media/upload/**', (route) =>
    route.request().url().includes(fourId) ? route.abort() : route.continue(),
  )
  const broken = await restore(page, file2)
  await expect(broken.getByText('Dipulihkan', { exact: true })).toHaveCount(1)
  await expect(broken.getByText('Gagal', { exact: true })).toHaveCount(1)
  await page.goto('/')
  await page.getByLabel('Cari pasangan').fill(four)
  await expect(page.getByText('Pemulihan belum selesai')).toBeVisible()

  await page.unroute('**/api/dev/media/upload/**')
  const resumed = await restore(page, file2)
  await expect(resumed.locator('li').filter({ hasText: 'Dipulihkan' })).toHaveCount(1)
  await expect(resumed.locator('li').filter({ hasText: 'Dilewati' })).toHaveCount(1)
  await page.goto('/')
  await page.getByLabel('Cari pasangan').fill(four)
  await expect(page.getByText('Pemulihan belum selesai')).toHaveCount(0)
  await expect(page.locator(`[data-testid=couple-card][data-slug=${four}] [data-testid=status-badge]`)).toHaveText('Aktif')
})
