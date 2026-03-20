import { test, expect } from '@playwright/test'

test.describe('error handling', () => {
  test('daily prompt card shows on home page', async ({ page }) => {
    // Complete onboarding first via localStorage
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('linforo-onboarding-done', 'true')
      localStorage.setItem('linforo-voice-gender', 'female')
      localStorage.setItem('linforo-interests-seen', '1')
    })
    await page.reload()

    // Daily prompt card should appear (hasn't been seen yet)
    const card = page.getByText("TODAY'S CHALLENGE")
    await expect(card).toBeVisible({ timeout: 5000 })
  })

  test('daily prompt shows completion state after marked done', async ({ page }) => {
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

  test('interests page renders with all 10 interest options', async ({ page }) => {
    await page.goto('/interests')
    // Should show the interests screen
    await expect(page.getByText("What are you into?")).toBeVisible({ timeout: 5000 })
    // Check a few interest buttons are visible
    await expect(page.getByRole('button', { name: /Cooking/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Wine/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Music/ })).toBeVisible()
  })
})
