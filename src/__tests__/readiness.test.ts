import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeReadiness,
  incrementScenarioConversation,
  getScenarioConversationCount,
} from '@/lib/readiness'
import { addBookmark } from '@/lib/bookmarks'

beforeEach(() => {
  localStorage.clear()
})

describe('readiness', () => {
  it('returns 0 with no activity', () => {
    expect(computeReadiness()).toBe(0)
  })

  it('increments scenario conversation count', () => {
    incrementScenarioConversation('restaurant')
    expect(getScenarioConversationCount('restaurant')).toBe(1)
    incrementScenarioConversation('restaurant')
    expect(getScenarioConversationCount('restaurant')).toBe(2)
  })

  it('returns 0 for unknown scenario', () => {
    expect(getScenarioConversationCount('unknown')).toBe(0)
  })

  it('increases readiness with conversations', () => {
    incrementScenarioConversation('restaurant')
    const r = computeReadiness()
    expect(r).toBeGreaterThan(0)
  })

  it('caps conversation contribution at 3 conversations', () => {
    for (let i = 0; i < 10; i++) {
      incrementScenarioConversation('restaurant')
    }
    // 5% conv score max for one scenario = 5 out of 100
    const r = computeReadiness()
    expect(r).toBeGreaterThanOrEqual(5)
  })

  it('increases readiness with bookmarks', () => {
    addBookmark({
      italian: 'Vorrei ordinare',
      phonetic: 'vor-RAY or-dee-NAH-reh',
      english: "I'd like to order",
      scenarioId: 'restaurant',
      scenarioTitle: 'Restaurant',
    })
    const r = computeReadiness()
    expect(r).toBeGreaterThan(0)
  })

  it('reaches 100% when all scenarios fully practiced', () => {
    const SCENARIO_IDS = [
      'restaurant', 'directions', 'bathroom', 'greetings',
      'market', 'price', 'excuse_me', 'help', 'check', 'thank_you',
    ]
    // Max conv score per scenario: 3 convs = 5%
    for (const id of SCENARIO_IDS) {
      for (let i = 0; i < 3; i++) incrementScenarioConversation(id)
    }
    const r = computeReadiness()
    expect(r).toBe(50) // 5% conv only, bookmarks = 0
  })

  it('counts multiple scenarios independently', () => {
    incrementScenarioConversation('restaurant')
    incrementScenarioConversation('greetings')
    expect(getScenarioConversationCount('restaurant')).toBe(1)
    expect(getScenarioConversationCount('greetings')).toBe(1)
    expect(getScenarioConversationCount('directions')).toBe(0)
  })
})
