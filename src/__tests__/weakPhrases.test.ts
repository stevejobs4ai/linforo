import { describe, it, expect, beforeEach } from 'vitest'
import { recordAttempt, getWeakPhrases, promoteToOwned } from '@/lib/confidence'

beforeEach(() => {
  localStorage.clear()
})

describe('getWeakPhrases', () => {
  it('returns empty array when no phrases tracked', () => {
    expect(getWeakPhrases()).toHaveLength(0)
  })

  it('returns new phrases', () => {
    recordAttempt('Ciao')
    const weak = getWeakPhrases()
    expect(weak.some((p) => p.phraseItalian === 'Ciao')).toBe(true)
  })

  it('does not return owned phrases', () => {
    for (let i = 0; i < 5; i++) recordAttempt('Grazie')
    const weak = getWeakPhrases()
    expect(weak.some((p) => p.phraseItalian === 'Grazie')).toBe(false)
  })

  it('respects the limit parameter', () => {
    for (let i = 0; i < 5; i++) recordAttempt(`phrase${i}`)
    expect(getWeakPhrases(2)).toHaveLength(2)
  })

  it('sorts by oldest lastAttempted', () => {
    recordAttempt('First')
    recordAttempt('Second')
    const weak = getWeakPhrases()
    expect(weak[0].phraseItalian).toBe('First')
  })

  it('promoteToOwned changes status', () => {
    recordAttempt('Buongiorno')
    promoteToOwned('Buongiorno')
    const weak = getWeakPhrases()
    expect(weak.some((p) => p.phraseItalian === 'Buongiorno')).toBe(false)
  })

  it('promoteToOwned returns null for unknown phrase', () => {
    expect(promoteToOwned('nonexistent')).toBeNull()
  })

  it('getWeakPhrases default limit is 3', () => {
    for (let i = 0; i < 5; i++) recordAttempt(`phrase${i}`)
    expect(getWeakPhrases()).toHaveLength(3)
  })
})
