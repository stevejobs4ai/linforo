import { describe, it, expect, beforeEach } from 'vitest'
import { generateSystemPrompt } from '@/lib/systemPrompt'
import { savePersona } from '@/lib/personas'

beforeEach(() => {
  localStorage.clear()
})

describe('generateSystemPrompt with persona', () => {
  it('defaults to sofia persona when none stored', () => {
    const prompt = generateSystemPrompt(undefined, 'female')
    expect(prompt).toContain('Sofia')
  })

  it('uses marco persona when selected', () => {
    savePersona('marco')
    const prompt = generateSystemPrompt(undefined, 'male')
    expect(prompt).toContain('Marco')
  })

  it('uses nonna persona when selected', () => {
    savePersona('nonna')
    const prompt = generateSystemPrompt(undefined, 'female')
    expect(prompt).toContain('Nonna')
  })

  it('includes weak phrases when provided', () => {
    const prompt = generateSystemPrompt(undefined, 'female', 'Ciao, Grazie')
    expect(prompt).toContain('Ciao, Grazie')
  })

  it('does not include weak phrases section when undefined', () => {
    const prompt = generateSystemPrompt(undefined, 'female', undefined)
    expect(prompt).not.toContain('struggling with these phrases')
  })

  it('includes scenario context', () => {
    const scenario = {
      id: 'restaurant',
      emoji: '🍝',
      title: 'Restaurant',
      description: 'Order food',
      subtitle: 'Order food',
      systemContext: 'Custom restaurant context',
      phrases: [],
    }
    const prompt = generateSystemPrompt(scenario, 'female')
    expect(prompt).toContain('Custom restaurant context')
  })
})
