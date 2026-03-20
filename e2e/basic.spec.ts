import { test, expect } from '@playwright/test'

test('page loads and shows scenario picker (after onboarding)', async ({ page }) => {
  // Skip onboarding by pre-setting localStorage
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linforo-onboarding-done', 'true')
  })
  await page.reload()
  await expect(page).toHaveTitle(/Linforo/)
  await expect(page.getByText('Freestyle')).toBeVisible()
})

test('scenario picker shows all scenarios', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linforo-onboarding-done', 'true')
  })
  await page.reload()
  await expect(page.getByText('Restaurant')).toBeVisible()
  await expect(page.getByText('Directions')).toBeVisible()
  await expect(page.getByText('Greetings')).toBeVisible()
})

test('clicking a scenario navigates to voice page with mic button', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linforo-onboarding-done', 'true')
  })
  await page.reload()
  await page.getByText('Freestyle').click()
  await page.waitForURL('**/voice**')
  const micButton = page.locator('[aria-label="Start recording"]')
  await expect(micButton).toBeVisible()
})

test('onboarding flow shows three screens and completes', async ({ page }) => {
  await page.goto('/')
  // Onboarding should be visible (no localStorage set)
  await expect(page.getByText('What language?')).toBeVisible()

  // Screen 1: Italian is pre-selected, click Continue
  await page.getByRole('button', { name: 'Continue →' }).click()

  // Screen 2: pick a reason
  await expect(page.getByText('Why are you learning?')).toBeVisible()
  await page.getByRole('button', { name: 'Travel' }).click()
  await page.getByRole('button', { name: 'Continue →' }).click()

  // Screen 3: pick a voice
  await expect(page.getByText('Pick your tutor voice')).toBeVisible()
  await page.getByRole('button', { name: 'Start learning 🇮🇹' }).click()

  // Should now show scenario picker
  await expect(page.getByText('Choose a scenario to practice')).toBeVisible()
})

test('voice page has bookmark button and My Phrases link', async ({ page }) => {
  await page.goto('/voice?scenario=restaurant')
  // My Phrases button in header
  const phrasesBtn = page.locator('[aria-label="My saved phrases"]')
  await expect(phrasesBtn).toBeVisible()
  // Quick help button
  const helpBtn = page.locator('[aria-label="Quick help"]')
  await expect(helpBtn).toBeVisible()
})

test('My Phrases page loads and shows empty state', async ({ page }) => {
  await page.goto('/phrases')
  await expect(page.getByText('My Phrases')).toBeVisible()
  // Empty state when no bookmarks
  await expect(page.getByText('No saved phrases yet.')).toBeVisible()
})
