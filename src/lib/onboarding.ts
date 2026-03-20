export type LearningReason = 'travel' | 'moving' | 'curiosity' | 'school'

export interface OnboardingState {
  completed: boolean
  language: string
  reason: LearningReason | null
  voiceGender: 'female' | 'male'
}

const KEY_COMPLETED = 'linforo-onboarding-done'
const KEY_REASON = 'linforo-learning-reason'
const KEY_VOICE = 'linforo-voice-gender'

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(KEY_COMPLETED) === 'true'
}

export function completeOnboarding(reason: LearningReason, voiceGender: 'female' | 'male'): void {
  localStorage.setItem(KEY_COMPLETED, 'true')
  localStorage.setItem(KEY_REASON, reason)
  localStorage.setItem(KEY_VOICE, voiceGender)
}

export function getLearningReason(): LearningReason | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(KEY_REASON)
  if (v === 'travel' || v === 'moving' || v === 'curiosity' || v === 'school') return v
  return null
}
