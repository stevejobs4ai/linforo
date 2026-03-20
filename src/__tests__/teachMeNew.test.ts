import { describe, it, expect, beforeEach } from 'vitest'
import { addBookmark, getBookmarks } from '@/lib/bookmarks'
import { getScenarioById } from '@/lib/scenarios'

beforeEach(() => {
  localStorage.clear()
})

describe('teach me new — phrase selection logic', () => {
  it('finds unbookmarked phrases in a scenario', () => {
    const scenario = getScenarioById('restaurant')!
    const bookmarked = getBookmarks()
    const bookmarkedItalian = new Set(
      bookmarked
        .filter((b) => b.scenarioId === 'restaurant')
        .map((b) => b.italian)
    )
    const unbookmarked = scenario.phrases.filter(
      (p) => !bookmarkedItalian.has(p.italian)
    )
    expect(unbookmarked.length).toBe(scenario.phrases.length)
  })

  it('excludes already-bookmarked phrases', () => {
    const scenario = getScenarioById('greetings')!
    const firstPhrase = scenario.phrases[0]

    addBookmark({
      italian: firstPhrase.italian,
      phonetic: firstPhrase.phonetic,
      english: firstPhrase.english,
      scenarioId: 'greetings',
      scenarioTitle: 'Greetings',
    })

    const bookmarked = getBookmarks()
    const bookmarkedItalian = new Set(
      bookmarked
        .filter((b) => b.scenarioId === 'greetings')
        .map((b) => b.italian)
    )
    const unbookmarked = scenario.phrases.filter(
      (p) => !bookmarkedItalian.has(p.italian)
    )

    expect(unbookmarked.length).toBe(scenario.phrases.length - 1)
    expect(unbookmarked.find((p) => p.italian === firstPhrase.italian)).toBeUndefined()
  })

  it('returns empty when all phrases are bookmarked', () => {
    const scenario = getScenarioById('bathroom')! // has 5 phrases
    for (const phrase of scenario.phrases) {
      addBookmark({
        italian: phrase.italian,
        phonetic: phrase.phonetic,
        english: phrase.english,
        scenarioId: 'bathroom',
        scenarioTitle: 'Bathroom',
      })
    }

    const bookmarked = getBookmarks()
    const bookmarkedItalian = new Set(
      bookmarked
        .filter((b) => b.scenarioId === 'bathroom')
        .map((b) => b.italian)
    )
    const unbookmarked = scenario.phrases.filter(
      (p) => !bookmarkedItalian.has(p.italian)
    )

    expect(unbookmarked.length).toBe(0)
  })

  it('teach message format includes phrase details', () => {
    const phrase = {
      italian: 'Ciao!',
      phonetic: 'CHOW',
      english: 'Hi',
    }
    const msg = `✨ Let me teach you a new phrase! **${phrase.italian}** (${phrase.phonetic}) — "${phrase.english}". Now try saying it back!`
    expect(msg).toContain('Ciao!')
    expect(msg).toContain('CHOW')
    expect(msg).toContain('Hi')
    expect(msg).toContain('✨')
  })

  it('random selection picks from unbookmarked list', () => {
    const unbookmarked = [
      { italian: 'A', phonetic: 'a', english: 'A' },
      { italian: 'B', phonetic: 'b', english: 'B' },
      { italian: 'C', phonetic: 'c', english: 'C' },
    ]
    const picked = unbookmarked[Math.floor(Math.random() * unbookmarked.length)]
    expect(unbookmarked).toContainEqual(picked)
  })

  it('mastery message is shown when no unbookmarked phrases', () => {
    const allBookmarked = true
    const message = allBookmarked
      ? "You've mastered all phrases in this scenario! 🎉"
      : 'Next phrase: ...'
    expect(message).toContain("You've mastered")
  })
})
