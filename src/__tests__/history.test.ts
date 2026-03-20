import { describe, it, expect, beforeEach } from 'vitest'
import {
  getHistory,
  saveSession,
  getSession,
  clearHistory,
} from '@/lib/history'

const mockSession = {
  scenarioId: 'restaurant',
  scenarioTitle: 'Restaurant',
  scenarioEmoji: '🍝',
  startedAt: 1000000,
  messages: [
    { role: 'tutor' as const, text: 'Ciao! Come posso aiutarla?', timestamp: 1000001 },
    { role: 'user' as const, text: 'Buongiorno', timestamp: 1000002 },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe('history', () => {
  it('starts empty', () => {
    expect(getHistory()).toHaveLength(0)
  })

  it('saveSession stores a session with generated id', () => {
    const s = saveSession(mockSession)
    expect(s.id).toBeTruthy()
    expect(s.scenarioId).toBe('restaurant')
    expect(getHistory()).toHaveLength(1)
  })

  it('getHistory returns sessions sorted newest first', () => {
    saveSession({ ...mockSession, startedAt: 1000 })
    saveSession({ ...mockSession, startedAt: 3000 })
    saveSession({ ...mockSession, startedAt: 2000 })
    const history = getHistory()
    expect(history[0].startedAt).toBe(3000)
    expect(history[2].startedAt).toBe(1000)
  })

  it('getSession retrieves a session by id', () => {
    const saved = saveSession(mockSession)
    const found = getSession(saved.id)
    expect(found).toBeDefined()
    expect(found?.scenarioId).toBe('restaurant')
  })

  it('getSession returns undefined for unknown id', () => {
    expect(getSession('nonexistent')).toBeUndefined()
  })

  it('clearHistory empties the list', () => {
    saveSession(mockSession)
    saveSession(mockSession)
    clearHistory()
    expect(getHistory()).toHaveLength(0)
  })

  it('stores messages with role and text', () => {
    const saved = saveSession(mockSession)
    const found = getSession(saved.id)
    expect(found?.messages).toHaveLength(2)
    expect(found?.messages[0].role).toBe('tutor')
    expect(found?.messages[0].text).toBe('Ciao! Come posso aiutarla?')
  })

  it('caps at 50 sessions', () => {
    for (let i = 0; i < 55; i++) {
      saveSession({ ...mockSession, startedAt: i })
    }
    expect(getHistory()).toHaveLength(50)
  })
})
