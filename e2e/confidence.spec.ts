import { test, expect } from '@playwright/test'

test.describe('confidence dots on phrases page', () => {
  test('shows no phrases message when empty', async ({ page }) => {
    await page.goto('/phrases')
    await expect(page.getByText('No saved phrases yet.')).toBeVisible({ timeout: 5000 })
  })

  test('shows offline download button when phrases exist', async ({ page }) => {
    await page.goto('/phrases')
    // Add a fake bookmark via localStorage
    await page.evaluate(() => {
      const bookmark = {
        id: 'test-1',
        italian: 'Ciao',
        phonetic: 'CHOW',
        english: 'Hello',
        scenarioId: 'greetings',
        scenarioTitle: 'Greetings',
        savedAt: Date.now(),
      }
      localStorage.setItem('linforo-bookmarks', JSON.stringify([bookmark]))
    })
    await page.reload()

    await expect(page.getByText('Download for Offline')).toBeVisible({ timeout: 5000 })
  })

  test('shows confidence dot when confidence data exists', async ({ page }) => {
    await page.goto('/phrases')
    await page.evaluate(() => {
      const bookmark = {
        id: 'test-2',
        italian: 'Grazie',
        phonetic: 'GRAT-see-eh',
        english: 'Thank you',
        scenarioId: 'thank_you',
        scenarioTitle: 'Thank You',
        savedAt: Date.now(),
      }
      localStorage.setItem('linforo-bookmarks', JSON.stringify([bookmark]))
      // Add confidence data — owned
      const conf = {
        'Grazie': {
          phraseItalian: 'Grazie',
          attempts: 5,
          lastAttempted: Date.now(),
          firstAttempted: Date.now() - 2 * 24 * 60 * 60 * 1000,
          status: 'owned',
        },
      }
      localStorage.setItem('linforo-confidence', JSON.stringify(conf))
    })
    await page.reload()

    // Confidence dot should render (aria-label)
    await expect(page.getByLabel('Confidence: owned')).toBeVisible({ timeout: 5000 })
  })
})
