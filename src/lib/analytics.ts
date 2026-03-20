// Plausible analytics — tracks custom events for linforo.app
// Script tag added in layout.tsx with strategy='afterInteractive'
// Account/domain setup handled separately by Reece

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void
  }
}

export type AnalyticsEvent =
  | 'scenario_selected'
  | 'conversation_started'
  | 'phrase_bookmarked'
  | 'session_completed'
  | 'onboarding_completed'
  | 'emergency_opened'
  | 'roleplay_started'
  | 'shadowing_started'

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return
  try {
    window.plausible?.(event, props ? { props } : undefined)
  } catch {
    // Never let analytics errors break the app
  }
}
