import { test, expect } from '@playwright/test'

test.describe('daily conversation prompt', () => {
  test('daily prompt card appears after onboarding when not yet seen', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('linforo-onboarding-done', 'true')
      localStorage.setItem('linforo-voice-gender', 'female')
      localStorage.setItem('linforo-interests-seen', '1')
      // Clear any previous daily prompt
      const today = new Date().toISOString().split('T')[0]
      localStorage.removeItem('linforo-daily-prompt-seen')
    })
    await page.reload()

    await expect(page.getByText("TODAY'S CHALLENGE")).toBeVisible({ timeout: 5000 })
    // The challenge text should be non-empty
    const card = page.locator('button', { has: page.getByText("TODAY'S CHALLENGE") })
    await expect(card).toBeVisible()
  })

  test('tapping daily prompt card navigates to voice page', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('linforo-onboarding-done', 'true')
      localStorage.setItem('linforo-voice-gender', 'female')
      localStorage.setItem('linforo-interests-seen', '1')
      localStorage.removeItem('linforo-daily-prompt-seen')
      localStorage.removeItem('linforo-daily-prompt-completed')
    })
    await page.reload()

    // Click the daily prompt card
    await page.getByText("TODAY'S CHALLENGE").click()
    await expect(page).toHaveURL(/\/voice/, { timeout: 5000 })
  })

  test('completed daily prompt shows done state', async ({ page }) => {
    await page.goto('/')
    const today = new Date().toISOString().split('T')[0]
    await page.evaluate((d) => {
      localStorage.setItem('linforo-onboarding-done', 'true')
      localStorage.setItem('linforo-voice-gender', 'female')
      localStorage.setItem('linforo-interests-seen', '1')
      localStorage.setItem('linforo-daily-prompt-completed', d)
    }, today)
    await page.reload()

    await expect(page.getByText("TODAY'S CHALLENGE DONE")).toBeVisible({ timeout: 5000 })
  })
})
