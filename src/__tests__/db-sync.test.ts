import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase so the client doesn't require real credentials in unit tests
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockReturnThis(),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
  createServiceClient: vi.fn(),
}))

import {
  getLocalDailyUsage,
  incrementLocalDailyUsage,
  getDailyLimit,
  getRemainingConversations,
  generateReferralCode,
} from '@/lib/db-sync'

const TODAY = new Date().toISOString().slice(0, 10)

beforeEach(() => {
  localStorage.clear()
})

describe('daily usage', () => {
  it('starts at 0 for a fresh day', () => {
    const usage = getLocalDailyUsage()
    expect(usage.count).toBe(0)
    expect(usage.date).toBe(TODAY)
  })

  it('increments correctly', () => {
    incrementLocalDailyUsage()
    incrementLocalDailyUsage()
    const usage = getLocalDailyUsage()
    expect(usage.count).toBe(2)
  })

  it('resets when date changes', () => {
    localStorage.setItem('linforo-daily-usage', JSON.stringify({ date: '2020-01-01', count: 99 }))
    const usage = getLocalDailyUsage()
    expect(usage.count).toBe(0)
    expect(usage.date).toBe(TODAY)
  })
})

describe('getDailyLimit', () => {
  it('returns 5 for free', () => {
    expect(getDailyLimit('free')).toBe(5)
  })

  it('returns 50 for premium', () => {
    expect(getDailyLimit('premium')).toBe(50)
  })
})

describe('getRemainingConversations', () => {
  it('returns full limit when count is 0', () => {
    expect(getRemainingConversations('free')).toBe(5)
  })

  it('decreases after incrementing', () => {
    incrementLocalDailyUsage()
    incrementLocalDailyUsage()
    expect(getRemainingConversations('free')).toBe(3)
  })

  it('never goes below 0', () => {
    for (let i = 0; i < 10; i++) incrementLocalDailyUsage()
    expect(getRemainingConversations('free')).toBe(0)
  })

  it('premium returns 50 when fresh', () => {
    expect(getRemainingConversations('premium')).toBe(50)
  })
})

describe('generateReferralCode', () => {
  it('generates an 8-character string', () => {
    const code = generateReferralCode()
    expect(code).toHaveLength(8)
  })

  it('uses only allowed characters', () => {
    const code = generateReferralCode()
    expect(/^[A-Z2-9]+$/.test(code)).toBe(true)
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferralCode()))
    // Extremely unlikely to collide
    expect(codes.size).toBeGreaterThan(15)
  })
})
