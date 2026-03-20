export interface ReminderPrefs {
  enabled: boolean
  time: string // "HH:MM"
}

const KEY = 'linforo-reminders'

export function getReminderPrefs(): ReminderPrefs {
  if (typeof window === 'undefined') return { enabled: false, time: '09:00' }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as ReminderPrefs
  } catch {
    // ignore
  }
  return { enabled: false, time: '09:00' }
}

export function saveReminderPrefs(prefs: ReminderPrefs): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

const NUDGE_KEY = 'linforo-reminder-prompt-shown'

export function hasShownReminderPrompt(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(NUDGE_KEY) === 'true'
}

export function markReminderPromptShown(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(NUDGE_KEY, 'true')
}

/**
 * Check if the in-app reminder banner should show.
 * Conditions: enabled, app is open, current time >= reminder time, user hasn't practiced today.
 */
export function shouldShowInAppReminder(lastPracticeDate: string | null): boolean {
  const prefs = getReminderPrefs()
  if (!prefs.enabled) return false

  const now = new Date()
  const [hh, mm] = prefs.time.split(':').map(Number)
  const reminderToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0)

  if (now < reminderToday) return false

  // Check if practiced today
  if (lastPracticeDate) {
    const today = now.toISOString().slice(0, 10)
    if (lastPracticeDate === today) return false
  }

  return true
}

/** Register service worker for push notifications */
export async function registerReminderServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    await navigator.serviceWorker.register('/sw-reminder.js')
    return true
  } catch {
    return false
  }
}

/** Request notification permission and enable reminders */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}
