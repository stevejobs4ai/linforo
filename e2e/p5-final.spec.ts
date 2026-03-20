import { test, expect, type Page } from '@playwright/test'

const skipOnboarding = async (page: Page) => {
  await page.evaluate(() => {
    localStorage.setItem('linforo-onboarding-done', 'true')
    localStorage.setItem('linforo-reminder-prompt-shown', 'true')
    localStorage.setItem('linforo-interests-seen', 'true')
  })
  await page.reload()
}

test('hands-free mode toggle is visible on voice page', async ({ page }) => {
  await page.goto('/')
  await skipOnboarding(page)
  await page.getByText('Freestyle').click()
  await page.waitForURL('**/voice**')
  const toggle = page.locator('[aria-label="Enable hands-free mode"]')
  await expect(toggle).toBeVisible()
})

test('text input fallback appears on voice page', async ({ page }) => {
  await page.goto('/')
  await skipOnboarding(page)
  await page.getByText('Freestyle').click()
  await page.waitForURL('**/voice**')
  const typeLink = page.getByText('Or type instead')
  await expect(typeLink).toBeVisible()
  await typeLink.click()
  const input = page.locator('input[placeholder*="type"]')
  await expect(input).toBeVisible()
})

test('persona picker renders in onboarding', async ({ page }) => {
  await page.goto('/')
  // Fresh session — onboarding shows
  await expect(page.getByText('What language?')).toBeVisible()
  // Click continue
  await page.getByText('Continue →').click()
  // Screen 2: why learning?
  await expect(page.getByText('Why are you learning?')).toBeVisible()
  await page.getByText('Travel').click()
  await page.getByText('Continue →').click()
  // Screen 3: pick your tutor
  await expect(page.getByText('Pick your tutor')).toBeVisible()
  await expect(page.getByText('Sofia')).toBeVisible()
  await expect(page.getByText('Marco')).toBeVisible()
  await expect(page.getByText('Nonna')).toBeVisible()
})

test('settings page loads', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByText('Settings')).toBeVisible()
})

test('phrases page has print phrasebook button when phrases exist', async ({ page }) => {
  await page.goto('/phrases')
  await page.evaluate(() => {
    const bookmarks = [
      {
        id: 'test1',
        italian: 'Ciao',
        phonetic: 'chow',
        english: 'Hello',
        scenarioId: 'greetings',
        scenarioTitle: 'Greetings',
        savedAt: Date.now(),
      },
    ]
    localStorage.setItem('linforo-bookmarks', JSON.stringify(bookmarks))
  })
  await page.reload()
  await expect(page.getByText('Print Phrasebook')).toBeVisible()
})
