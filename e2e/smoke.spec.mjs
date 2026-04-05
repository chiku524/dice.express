import { test, expect } from '@playwright/test'

test.describe('App shell', () => {
  test('home loads and shows prediction markets branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/dice\.express|Prediction Markets/i)
    await expect(page.locator('body')).toBeVisible()
  })
})
