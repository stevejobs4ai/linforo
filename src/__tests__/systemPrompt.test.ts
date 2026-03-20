import { describe, it, expect } from 'vitest'
import { generateSystemPrompt } from '@/lib/systemPrompt'
import { getScenarioById } from '@/lib/scenarios'

describe('systemPrompt', () => {
  it('includes scenario context for non-freestyle', () => {
    const scenario = getScenarioById('restaurant')
    const prompt = generateSystemPrompt(scenario, 'female')
    expect(prompt).toContain('Restaurant')
  })

  it('uses freestyle language when no scenario or freestyle selected', () => {
    const scenario = getScenarioById('freestyle')
    const prompt = generateSystemPrompt(scenario, 'female')
    expect(prompt).toContain('freestyle')
  })

  it('mentions female voice style', () => {
    const prompt = generateSystemPrompt(undefined, 'female')
    expect(prompt).toContain('female')
  })

  it('mentions male voice style', () => {
    const prompt = generateSystemPrompt(undefined, 'male')
    expect(prompt).toContain('male')
  })
})
