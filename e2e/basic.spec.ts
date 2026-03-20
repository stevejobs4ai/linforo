import { test, expect } from '@playwright/test'

test('page loads and shows scenario picker', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Linforo/)
  await expect(page.getByText('Freestyle')).toBeVisible()
})

test('scenario picker shows all scenarios', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Restaurant')).toBeVisible()
  await expect(page.getByText('Directions')).toBeVisible()
  await expect(page.getByText('Greetings')).toBeVisible()
})

test('clicking a scenario navigates to voice page with mic button', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Freestyle').click()
  await page.waitForURL('**/voice**')
  // Mic button should be visible
  const micButton = page.locator('[aria-label="Start recording"]')
  await expect(micButton).toBeVisible()
})
