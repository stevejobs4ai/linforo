import { describe, it, expect, beforeEach } from 'vitest'
import { PERSONAS, getPersonaById, getSelectedPersona, savePersona } from '@/lib/personas'

beforeEach(() => {
  localStorage.clear()
})

describe('personas', () => {
  it('has exactly 3 personas', () => {
    expect(PERSONAS).toHaveLength(3)
  })

  it('contains Sofia, Marco, Nonna', () => {
    const ids = PERSONAS.map((p) => p.id)
    expect(ids).toContain('sofia')
    expect(ids).toContain('marco')
    expect(ids).toContain('nonna')
  })

  it('Sofia has female voice gender', () => {
    const sofia = getPersonaById('sofia')
    expect(sofia.voiceGender).toBe('female')
  })

  it('Marco has male voice gender', () => {
    const marco = getPersonaById('marco')
    expect(marco.voiceGender).toBe('male')
  })

  it('getPersonaById returns correct persona', () => {
    const nonna = getPersonaById('nonna')
    expect(nonna.name).toBe('Nonna')
    expect(nonna.emoji).toBe('👵')
  })

  it('getSelectedPersona defaults to sofia', () => {
    const p = getSelectedPersona()
    expect(p.id).toBe('sofia')
  })

  it('savePersona persists selection', () => {
    savePersona('marco')
    expect(getSelectedPersona().id).toBe('marco')
  })

  it('each persona has a systemPromptAddition', () => {
    PERSONAS.forEach((p) => {
      expect(p.systemPromptAddition.length).toBeGreaterThan(10)
    })
  })

  it('each persona has a voiceId', () => {
    PERSONAS.forEach((p) => {
      expect(p.voiceId).toBeTruthy()
    })
  })
})
