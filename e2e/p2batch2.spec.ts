import { test, expect, Page } from '@playwright/test'

// Helper: skip onboarding
async function skipOnboarding(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linforo-onboarding-done', 'true')
  })
  await page.reload()
}

test('history page loads and shows empty state', async ({ page }) => {
  await page.goto('/history')
  await expect(page.getByText('Conversation History')).toBeVisible()
  await expect(page.getByText('No conversations yet.')).toBeVisible()
})

test('history page has back button to scenarios', async ({ page }) => {
  await page.goto('/history')
  const backBtn = page.locator('[aria-label="Back to scenarios"]')
  await expect(backBtn).toBeVisible()
  await backBtn.click()
  await page.waitForURL('**/')
})

test('history page shows sessions from localStorage', async ({ page }) => {
  await page.goto('/history')
  await page.evaluate(() => {
    const session = {
      id: 'test-123',
      scenarioId: 'restaurant',
      scenarioTitle: 'Restaurant',
      scenarioEmoji: '🍝',
      startedAt: Date.now(),
      messages: [
        { role: 'tutor', text: 'Benvenuto! Cosa prende?', timestamp: Date.now() },
        { role: 'user', text: 'Ciao', timestamp: Date.now() + 1 },
      ],
    }
    localStorage.setItem('linforo-history', JSON.stringify([session]))
  })
  await page.reload()
  await expect(page.getByText('Restaurant')).toBeVisible()
  await expect(page.getByText('Benvenuto! Cosa prende?')).toBeVisible()
})

test('emergency phrasebook page loads', async ({ page }) => {
  await page.goto('/emergency')
  await expect(page.getByText('Emergency Phrases')).toBeVisible()
})

test('emergency phrasebook shows all critical phrases', async ({ page }) => {
  await page.goto('/emergency')
  await expect(page.getByText('Aiuto!')).toBeVisible()
  await expect(page.getByText('Help!')).toBeVisible()
  await expect(page.getByText('Non capisco')).toBeVisible()
})

test('emergency phrasebook has back button', async ({ page }) => {
  await page.goto('/emergency')
  const backBtn = page.locator('[aria-label="Back to scenarios"]')
  await expect(backBtn).toBeVisible()
})

test('scenario picker shows readiness ring', async ({ page }) => {
  await skipOnboarding(page)
  // SVG ring should be rendered
  const ring = page.locator('svg[aria-label]').first()
  await expect(ring).toBeVisible()
})

test('scenario picker shows emergency and history buttons', async ({ page }) => {
  await skipOnboarding(page)
  const emergencyBtn = page.locator('[aria-label="Emergency phrases"]')
  const historyBtn = page.locator('[aria-label="Conversation history"]')
  await expect(emergencyBtn).toBeVisible()
  await expect(historyBtn).toBeVisible()
})

test('scenario picker shows Roleplay card', async ({ page }) => {
  await skipOnboarding(page)
  await expect(page.getByText('Roleplay')).toBeVisible()
})

test('roleplay card opens character picker', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByText('Roleplay').click()
  await expect(page.getByText('Choose a character')).toBeVisible()
  await expect(page.getByText('Waiter')).toBeVisible()
  await expect(page.getByText('Taxi Driver')).toBeVisible()
})

test('roleplay flow navigates to voice page with character param', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByText('Roleplay').click()
  await page.getByText('Waiter').click()
  await page.waitForURL('**/voice**')
  expect(page.url()).toContain('scenario=roleplay')
  expect(page.url()).toContain('character=waiter')
})

test('voice page has shadow and teach me buttons', async ({ page }) => {
  await page.goto('/voice?scenario=restaurant')
  await expect(page.locator('[aria-label="Enable shadowing mode"]')).toBeVisible()
  await expect(page.locator('[aria-label="Teach me something new"]')).toBeVisible()
})
