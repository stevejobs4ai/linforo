import { describe, it, expect, beforeEach } from 'vitest'
import {
  INTERESTS,
  getInterests,
  setInterests,
  hasSetInterests,
  markInterestsSeen,
  hasSeenInterests,
  getInterestsPromptText,
} from '@/lib/interests'

beforeEach(() => {
  localStorage.clear()
})

describe('interests', () => {
  it('returns empty array when no interests set', () => {
    expect(getInterests()).toEqual([])
  })

  it('hasSetInterests returns false initially', () => {
    expect(hasSetInterests()).toBe(false)
  })

  it('saves and retrieves interests', () => {
    setInterests(['cooking', 'wine'])
    const interests = getInterests()
    expect(interests).toContain('cooking')
    expect(interests).toContain('wine')
  })

  it('hasSetInterests returns true after setting', () => {
    setInterests(['music'])
    expect(hasSetInterests()).toBe(true)
  })

  it('can set empty array (user explicitly cleared)', () => {
    setInterests(['cooking'])
    setInterests([])
    expect(getInterests()).toEqual([])
    expect(hasSetInterests()).toBe(true)
  })

  it('INTERESTS has 10 items', () => {
    expect(INTERESTS).toHaveLength(10)
  })

  it('all interests have id, emoji, label', () => {
    for (const interest of INTERESTS) {
      expect(interest.id).toBeTruthy()
      expect(interest.emoji).toBeTruthy()
      expect(interest.label).toBeTruthy()
    }
  })

  it('getInterestsPromptText returns empty when no interests', () => {
    expect(getInterestsPromptText()).toBe('')
  })

  it('getInterestsPromptText includes interest labels', () => {
    setInterests(['cooking', 'wine'])
    const text = getInterestsPromptText()
    expect(text).toContain('Cooking')
    expect(text).toContain('Wine')
  })

  it('hasSeenInterests returns false initially', () => {
    expect(hasSeenInterests()).toBe(false)
  })

  it('markInterestsSeen sets seen flag', () => {
    markInterestsSeen()
    expect(hasSeenInterests()).toBe(true)
  })
})
