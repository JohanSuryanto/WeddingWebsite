import { expect, test } from '@playwright/test'
import { ADMIN, login } from './helpers'

test('dashboard pages redirect to login and back after logging in', async ({ page }) => {
  for (const path of ['/', '/couples/new', '/backup', '/couples/abc/mempelai']) {
    await page.goto(path)
    await expect(page).toHaveURL(
      new RegExp(
        `/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      ),
    )
  }
  await page.goto('/couples/new')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Kata sandi').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page).toHaveURL(/\/couples\/new$/)
  await expect(page.getByRole('heading', { name: 'Tambah Pasangan' })).toBeVisible()
})

test('wrong credentials show an error and clear the password', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Kata sandi').fill('salah')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email atau kata sandi salah')
  await expect(page.getByLabel('Kata sandi')).toHaveValue('')
})

test('logout ends the session and the guard applies again', async ({ page, isMobile }) => {
  await login(page)
  // Phones keep "Keluar" in the menu. (Not isVisible(): right after login the
  // header may not be drawn yet, which sent desktop runs looking for a menu.)
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Keluar' }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login\?next=/)
})

test('opening /login while logged in goes to the dashboard', async ({ page }) => {
  await login(page)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Pasangan' })).toBeVisible()
})
