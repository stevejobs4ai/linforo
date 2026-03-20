import { describe, it, expect, beforeEach } from 'vitest'
import { getConversationCount, incrementConversationCount, shouldShowAccountNudge } from '@/lib/conversationCount'

beforeEach(() => {
  localStorage.clear()
})

describe('conversationCount', () => {
  it('starts at 0', () => {
    expect(getConversationCount()).toBe(0)
  })

  it('increments correctly', () => {
    incrementConversationCount()
    incrementConversationCount()
    expect(getConversationCount()).toBe(2)
  })

  it('returns new count after increment', () => {
    const n = incrementConversationCount()
    expect(n).toBe(1)
  })

  it('does not show nudge before 3 conversations', () => {
    incrementConversationCount()
    incrementConversationCount()
    expect(shouldShowAccountNudge()).toBe(false)
  })

  it('shows nudge at exactly 3 conversations', () => {
    incrementConversationCount()
    incrementConversationCount()
    incrementConversationCount()
    expect(shouldShowAccountNudge()).toBe(true)
  })

  it('shows nudge after 3+ conversations', () => {
    for (let i = 0; i < 5; i++) incrementConversationCount()
    expect(shouldShowAccountNudge()).toBe(true)
  })
})
