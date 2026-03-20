import { describe, it, expect, beforeEach } from 'vitest'
import {
  getReminderPrefs,
  saveReminderPrefs,
  hasShownReminderPrompt,
  markReminderPromptShown,
  shouldShowInAppReminder,
} from '@/lib/reminders'

beforeEach(() => {
  localStorage.clear()
})

describe('reminders', () => {
  it('getReminderPrefs returns defaults', () => {
    const prefs = getReminderPrefs()
    expect(prefs.enabled).toBe(false)
    expect(prefs.time).toBe('09:00')
  })

  it('saveReminderPrefs persists data', () => {
    saveReminderPrefs({ enabled: true, time: '08:30' })
    const prefs = getReminderPrefs()
    expect(prefs.enabled).toBe(true)
    expect(prefs.time).toBe('08:30')
  })

  it('hasShownReminderPrompt returns false initially', () => {
    expect(hasShownReminderPrompt()).toBe(false)
  })

  it('markReminderPromptShown sets flag', () => {
    markReminderPromptShown()
    expect(hasShownReminderPrompt()).toBe(true)
  })

  it('shouldShowInAppReminder returns false when disabled', () => {
    saveReminderPrefs({ enabled: false, time: '00:00' })
    expect(shouldShowInAppReminder(null)).toBe(false)
  })

  it('shouldShowInAppReminder returns false when practiced today', () => {
    saveReminderPrefs({ enabled: true, time: '00:00' }) // always past
    const today = new Date().toISOString().slice(0, 10)
    expect(shouldShowInAppReminder(today)).toBe(false)
  })

  it('shouldShowInAppReminder returns true when enabled and not practiced', () => {
    saveReminderPrefs({ enabled: true, time: '00:00' }) // time always past
    expect(shouldShowInAppReminder(null)).toBe(true)
  })

  it('shouldShowInAppReminder returns false before reminder time', () => {
    saveReminderPrefs({ enabled: true, time: '23:59' })
    expect(shouldShowInAppReminder(null)).toBe(false)
  })
})
