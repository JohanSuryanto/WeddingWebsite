import { expect, test } from '@playwright/test'
import { ADMIN, createCouple, fillRequired, login, save } from './helpers'

test('when the session ends mid-edit, logging in again saves the edits (US2-4)', async ({ page, context }) => {
  await login(page)
  const editorUrl = await createCouple(page)
  // Saving needs complete content (the editor checks before calling the server).
  await fillRequired(page)
  await save(page)
  await page.goto(editorUrl)
  await expect(page.locator('#f-content-couple-bride-nickname')).toBeVisible()

  // The server-side session goes away (expired or logged out elsewhere).
  await context.clearCookies({ name: 'ws_admin' })

  await page.locator('#f-content-couple-bride-nickname').fill('Sarinah')
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Sesi berakhir, silakan masuk lagi' })
  await expect(dialog).toBeVisible()
  // Still on the editor with the edit in place, not redirected to /login.
  await expect(page).toHaveURL(editorUrl)
  await dialog.getByLabel('Kata sandi').fill(ADMIN.password)
  await dialog.getByRole('button', { name: 'Masuk' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Tersimpan' })).toBeVisible()
  await page.reload()
  await expect(page.locator('#f-content-couple-bride-nickname')).toHaveValue('Sarinah')
})
