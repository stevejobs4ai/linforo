import { test, expect, Page } from '@playwright/test'

// Helper: skip onboarding + interests for all tests
async function skipOnboarding(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linforo-onboarding-done', 'true')
    localStorage.setItem('linforo-interests-seen', '1')
  })
  await page.reload()
}

test('community page renders heading', async ({ page }) => {
  await page.goto('/community')
  await expect(page.getByText('Community')).toBeVisible()
  // Should show empty state or feed
  await page.waitForTimeout(500)
  const body = await page.textContent('main')
  expect(body).toBeTruthy()
})

test('pricing page renders free and premium plans', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByText('Free')).toBeVisible()
  await expect(page.getByText('Premium')).toBeVisible()
  await expect(page.getByText('$9.99')).toBeVisible()
})

test('pricing page billing toggle switches to yearly', async ({ page }) => {
  await page.goto('/pricing')
  await page.getByText('Yearly').click()
  await expect(page.getByText('$79.99')).toBeVisible()
})

test('profile page renders when user is not signed in', async ({ page }) => {
  await page.goto('/profile')
  // Should render without crashing — profile page handles unauthenticated state
  await page.waitForTimeout(800)
  const main = page.locator('main')
  await expect(main).toBeVisible()
})

test('home page has community and profile nav buttons', async ({ page }) => {
  await skipOnboarding(page)
  await expect(page.getByRole('button', { name: 'Community' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible()
})

test('community button navigates to /community', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByRole('button', { name: 'Community' }).click()
  await expect(page).toHaveURL('/community')
})

test('profile button navigates to /profile', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByRole('button', { name: 'Profile' }).click()
  await expect(page).toHaveURL('/profile')
})

test('referral redirect page stores code and redirects', async ({ page }) => {
  await page.goto('/r/TESTCODE')
  // Should redirect to home
  await page.waitForURL('/')
  const stored = await page.evaluate(() => localStorage.getItem('linforo-referral-code'))
  expect(stored).toBe('TESTCODE')
})
