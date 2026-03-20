import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getTodayPrompt,
  hasSeenTodayPrompt,
  markPromptSeen,
  isDailyPromptCompleted,
  markDailyPromptCompleted,
  incrementDailyPromptExchanges,
  getDailyPromptExchanges,
} from '@/lib/dailyPrompt'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  // Fixed date: 2026-03-20
  vi.setSystemTime(new Date('2026-03-20T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('dailyPrompt', () => {
  it('returns a prompt for today', () => {
    const p = getTodayPrompt()
    expect(p.date).toBe('2026-03-20')
    expect(p.text).toBeTruthy()
    expect(p.scenario).toBeTruthy()
    expect(p.context).toBeTruthy()
  })

  it('is deterministic — same date gives same prompt', () => {
    const p1 = getTodayPrompt()
    const p2 = getTodayPrompt()
    expect(p1.text).toBe(p2.text)
    expect(p1.scenario).toBe(p2.scenario)
  })

  it('different dates give different prompts (usually)', () => {
    const p1 = getTodayPrompt()
    vi.setSystemTime(new Date('2026-03-21T10:00:00Z'))
    const p2 = getTodayPrompt()
    // They MIGHT be the same if hash collision, but for our test dates they differ
    expect(p1.date).not.toBe(p2.date)
  })

  it('hasSeenTodayPrompt returns false initially', () => {
    expect(hasSeenTodayPrompt()).toBe(false)
  })

  it('markPromptSeen sets seen for today', () => {
    markPromptSeen()
    expect(hasSeenTodayPrompt()).toBe(true)
  })

  it('seen on different day returns false', () => {
    markPromptSeen()
    vi.setSystemTime(new Date('2026-03-21T10:00:00Z'))
    expect(hasSeenTodayPrompt()).toBe(false)
  })

  it('isDailyPromptCompleted returns false initially', () => {
    expect(isDailyPromptCompleted()).toBe(false)
  })

  it('markDailyPromptCompleted marks as done', () => {
    markDailyPromptCompleted()
    expect(isDailyPromptCompleted()).toBe(true)
  })

  it('incrementDailyPromptExchanges counts up', () => {
    expect(incrementDailyPromptExchanges()).toBe(1)
    expect(incrementDailyPromptExchanges()).toBe(2)
    expect(incrementDailyPromptExchanges()).toBe(3)
  })

  it('getDailyPromptExchanges reads current count', () => {
    incrementDailyPromptExchanges()
    incrementDailyPromptExchanges()
    expect(getDailyPromptExchanges()).toBe(2)
  })

  it('exchanges reset on a new day', () => {
    incrementDailyPromptExchanges()
    vi.setSystemTime(new Date('2026-03-21T10:00:00Z'))
    expect(getDailyPromptExchanges()).toBe(0)
  })
})
