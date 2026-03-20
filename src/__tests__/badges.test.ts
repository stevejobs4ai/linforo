import { describe, it, expect, beforeEach } from 'vitest'
import {
  getBadgeTier,
  getBadge,
  getNextBadge,
  BADGES,
} from '@/lib/badges'

describe('badge tier calculation', () => {
  it('returns none for 0 phrases', () => {
    expect(getBadgeTier(0)).toBe('none')
  })

  it('returns none for 9 phrases', () => {
    expect(getBadgeTier(9)).toBe('none')
  })

  it('returns bronze at exactly 10', () => {
    expect(getBadgeTier(10)).toBe('bronze')
  })

  it('returns bronze between 10 and 29', () => {
    expect(getBadgeTier(25)).toBe('bronze')
  })

  it('returns silver at exactly 30', () => {
    expect(getBadgeTier(30)).toBe('silver')
  })

  it('returns gold at exactly 60', () => {
    expect(getBadgeTier(60)).toBe('gold')
  })

  it('returns platinum at 100', () => {
    expect(getBadgeTier(100)).toBe('platinum')
  })

  it('returns platinum above 100', () => {
    expect(getBadgeTier(150)).toBe('platinum')
  })
})

describe('getBadge', () => {
  it('returns null for no badge tier', () => {
    expect(getBadge(5)).toBeNull()
  })

  it('returns bronze badge object for 10 phrases', () => {
    const b = getBadge(10)
    expect(b).not.toBeNull()
    expect(b!.tier).toBe('bronze')
    expect(b!.emoji).toBe('🥉')
  })

  it('returns gold badge for 75 phrases', () => {
    const b = getBadge(75)
    expect(b!.tier).toBe('gold')
  })
})

describe('getNextBadge', () => {
  it('returns bronze as next badge when at 0', () => {
    const n = getNextBadge(0)
    expect(n!.tier).toBe('bronze')
    expect(n!.threshold).toBe(10)
  })

  it('returns silver as next when at 15', () => {
    const n = getNextBadge(15)
    expect(n!.tier).toBe('silver')
  })

  it('returns null when at platinum', () => {
    expect(getNextBadge(100)).toBeNull()
  })
})

describe('BADGES constant', () => {
  it('has 4 tiers in ascending threshold order', () => {
    expect(BADGES).toHaveLength(4)
    const thresholds = BADGES.map((b) => b.threshold)
    expect(thresholds).toEqual([10, 30, 60, 100])
  })
})
