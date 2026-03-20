import { describe, it, expect } from 'vitest'
import { LANGUAGES, getAvailableLanguages } from '@/lib/scenarios'

describe('language config', () => {
  it('loads LANGUAGES from languages.json', () => {
    expect(LANGUAGES).toBeDefined()
    expect(typeof LANGUAGES).toBe('object')
  })

  it('has italian config', () => {
    expect(LANGUAGES.italian).toBeDefined()
    expect(LANGUAGES.italian.name).toBe('Italian')
    expect(LANGUAGES.italian.available).toBe(true)
  })

  it('has spanish as coming soon', () => {
    expect(LANGUAGES.spanish).toBeDefined()
    expect(LANGUAGES.spanish.available).toBe(false)
  })

  it('has french as coming soon', () => {
    expect(LANGUAGES.french).toBeDefined()
    expect(LANGUAGES.french.available).toBe(false)
  })

  it('italian has deepgramLanguage code', () => {
    expect(LANGUAGES.italian.deepgramLanguage).toBe('it')
  })

  it('italian has elevenLabsVoices', () => {
    expect(LANGUAGES.italian.elevenLabsVoices?.female).toBeTruthy()
    expect(LANGUAGES.italian.elevenLabsVoices?.male).toBeTruthy()
  })

  it('getAvailableLanguages returns all languages', () => {
    const langs = getAvailableLanguages()
    expect(langs.length).toBeGreaterThanOrEqual(3)
  })

  it('getAvailableLanguages includes italian with id', () => {
    const langs = getAvailableLanguages()
    const it = langs.find((l) => l.id === 'italian')
    expect(it).toBeDefined()
    expect(it?.flag).toBe('🇮🇹')
  })
})
