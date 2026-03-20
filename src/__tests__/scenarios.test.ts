import { describe, it, expect } from 'vitest'
import { SCENARIOS, getScenarioById } from '@/lib/scenarios'

describe('scenarios', () => {
  it('has a freestyle scenario as first item', () => {
    expect(SCENARIOS[0].id).toBe('freestyle')
    expect(SCENARIOS[0].featured).toBe(true)
  })

  it('has exactly 11 scenarios (1 freestyle + 10 travel)', () => {
    expect(SCENARIOS).toHaveLength(11)
  })

  it('all scenarios have required fields', () => {
    for (const s of SCENARIOS) {
      expect(s.id).toBeTruthy()
      expect(s.emoji).toBeTruthy()
      expect(s.title).toBeTruthy()
      expect(s.description).toBeTruthy()
    }
  })

  it('getScenarioById returns correct scenario', () => {
    const restaurant = getScenarioById('restaurant')
    expect(restaurant?.title).toBe('Restaurant')
  })

  it('getScenarioById returns undefined for unknown id', () => {
    expect(getScenarioById('nonexistent')).toBeUndefined()
  })
})
