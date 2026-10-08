import { expect, test } from '../fixtures'

test.describe('cover', () => {
  test('shows the personalized guest name', async ({ page }) => {
    await page.goto('/anisa-raka?inv=Budi+Santoso')
    await expect(page.getByTestId('guest-name')).toHaveText('Budi Santoso')
    await expect(page.getByText('Kepada Yth.')).toBeVisible()
  })

  test('keeps "&" in the name, typed raw or encoded, and still reads ?t=', async ({ page }) => {
    await page.goto('/anisa-raka?inv=Johan & Partner&t=2')
    await expect(page.getByTestId('guest-name')).toHaveText('Johan & Partner')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'elegant-classic')

    await page.goto('/anisa-raka?inv=Johan%20%26%20Partner')
    await expect(page.getByTestId('guest-name')).toHaveText('Johan & Partner')
  })

  test('falls back to a generic greeting', async ({ page }) => {
    await page.goto('/anisa-raka')
    await expect(page.getByTestId('guest-name')).toHaveText('Bapak/Ibu/Saudara/i')
  })

  test('renders markup in the name as plain text', async ({ page }) => {
    await page.goto('/anisa-raka?inv=%3Cb%3EHi%3C%2Fb%3E')
    await expect(page.getByTestId('guest-name')).toHaveText('<b>Hi</b>')
    await expect(page.getByTestId('guest-name').locator('b')).toHaveCount(0)
  })

  test('hides the invitation until "Buka Undangan" is pressed', async ({ page }) => {
    await page.goto('/anisa-raka')
    await expect(page.locator('#beranda')).toHaveCount(0)
    await page.getByRole('button', { name: 'Buka Undangan' }).click()
    await expect(page.locator('#beranda')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('jumps to the anchor from the link after opening', async ({ page }) => {
    await page.goto('/anisa-raka#acara')
    await page.getByRole('button', { name: 'Buka Undangan' }).click()
    await expect(page.locator('#acara')).toBeInViewport()
  })
})
