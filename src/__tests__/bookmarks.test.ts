import { describe, it, expect, beforeEach } from 'vitest'
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked,
  getBookmarksByScenario,
} from '@/lib/bookmarks'

beforeEach(() => {
  localStorage.clear()
})

describe('bookmarks', () => {
  it('starts empty', () => {
    expect(getBookmarks()).toHaveLength(0)
  })

  it('addBookmark stores a phrase', () => {
    addBookmark({ italian: 'Ciao', phonetic: 'CHOW', english: 'Hi', scenarioId: 'greetings', scenarioTitle: 'Greetings' })
    expect(getBookmarks()).toHaveLength(1)
    expect(getBookmarks()[0].italian).toBe('Ciao')
  })

  it('addBookmark does not duplicate', () => {
    addBookmark({ italian: 'Ciao', phonetic: 'CHOW', english: 'Hi', scenarioId: 'greetings', scenarioTitle: 'Greetings' })
    addBookmark({ italian: 'Ciao', phonetic: 'CHOW', english: 'Hi', scenarioId: 'greetings', scenarioTitle: 'Greetings' })
    expect(getBookmarks()).toHaveLength(1)
  })

  it('removeBookmark removes a phrase by id', () => {
    const b = addBookmark({ italian: 'Grazie', phonetic: 'GRAH-tsyeh', english: 'Thanks', scenarioId: 'thank_you', scenarioTitle: 'Thank You' })
    removeBookmark(b.id)
    expect(getBookmarks()).toHaveLength(0)
  })

  it('isBookmarked returns true when saved', () => {
    addBookmark({ italian: 'Grazie', phonetic: 'GRAH-tsyeh', english: 'Thanks', scenarioId: 'thank_you', scenarioTitle: 'Thank You' })
    expect(isBookmarked('Grazie', 'thank_you')).toBe(true)
  })

  it('isBookmarked returns false when not saved', () => {
    expect(isBookmarked('Prego', 'thank_you')).toBe(false)
  })

  it('getBookmarksByScenario groups correctly', () => {
    addBookmark({ italian: 'Ciao', phonetic: 'CHOW', english: 'Hi', scenarioId: 'greetings', scenarioTitle: 'Greetings' })
    addBookmark({ italian: 'Grazie', phonetic: 'GRAH-tsyeh', english: 'Thanks', scenarioId: 'thank_you', scenarioTitle: 'Thank You' })
    addBookmark({ italian: 'Buongiorno', phonetic: 'bwon-JOHR-noh', english: 'Good morning', scenarioId: 'greetings', scenarioTitle: 'Greetings' })
    const grouped = getBookmarksByScenario()
    expect(grouped['greetings']).toHaveLength(2)
    expect(grouped['thank_you']).toHaveLength(1)
  })

  it('addBookmark returns the saved bookmark with id and savedAt', () => {
    const b = addBookmark({ italian: 'Scusi', phonetic: 'SKOO-zee', english: 'Excuse me', scenarioId: 'excuse_me', scenarioTitle: 'Excuse Me' })
    expect(b.id).toBeTruthy()
    expect(b.savedAt).toBeGreaterThan(0)
  })
})
