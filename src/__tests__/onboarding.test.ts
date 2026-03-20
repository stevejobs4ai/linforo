import { describe, it, expect, beforeEach } from 'vitest'
import { isOnboardingComplete, completeOnboarding, getLearningReason } from '@/lib/onboarding'

beforeEach(() => {
  localStorage.clear()
})

describe('onboarding', () => {
  it('is not complete by default', () => {
    expect(isOnboardingComplete()).toBe(false)
  })

  it('completeOnboarding marks it done', () => {
    completeOnboarding('travel', 'female')
    expect(isOnboardingComplete()).toBe(true)
  })

  it('completeOnboarding stores the reason', () => {
    completeOnboarding('moving', 'male')
    expect(getLearningReason()).toBe('moving')
  })

  it('completeOnboarding stores voice gender', () => {
    completeOnboarding('curiosity', 'male')
    expect(localStorage.getItem('linforo-voice-gender')).toBe('male')
  })

  it('getLearningReason returns null when not set', () => {
    expect(getLearningReason()).toBeNull()
  })

  it('all four learning reasons are accepted', () => {
    for (const reason of ['travel', 'moving', 'curiosity', 'school'] as const) {
      localStorage.clear()
      completeOnboarding(reason, 'female')
      expect(getLearningReason()).toBe(reason)
    }
  })
})
