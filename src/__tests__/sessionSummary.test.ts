import { describe, it, expect } from 'vitest'
import { computeSessionSummary, formatSummaryForShare } from '@/lib/sessionSummary'
import { createMessage } from '@/lib/conversation'
import type { ScenarioPhrase } from '@/lib/scenarios'

const phrases: ScenarioPhrase[] = [
  { italian: 'Vorrei ordinare', phonetic: 'vor-RAY or-dee-NAH-reh', english: "I'd like to order" },
  { italian: 'Cosa mi consiglia?', phonetic: 'KOH-zah mee con-SEEL-yah', english: 'What do you recommend?' },
  { italian: 'Il conto, per favore', phonetic: 'eel KON-toh', english: 'The check, please' },
]

describe('sessionSummary', () => {
  it('counts tutor messages as phrases practiced', () => {
    const msgs = [
      createMessage('user', 'Hello'),
      createMessage('tutor', 'Ciao!'),
      createMessage('user', 'How do I order?'),
      createMessage('tutor', 'Vorrei ordinare'),
    ]
    const s = computeSessionSummary(msgs, phrases)
    expect(s.phraseCount).toBe(2)
  })

  it('picks the longest user transcript as best phrase', () => {
    const msgs = [
      createMessage('user', 'Hi'),
      createMessage('tutor', 'Ciao'),
      createMessage('user', 'How do I ask for the check please?'),
    ]
    const s = computeSessionSummary(msgs, phrases)
    expect(s.bestUserPhrase).toBe('How do I ask for the check please?')
  })

  it('returns null bestUserPhrase when no user messages', () => {
    const msgs = [createMessage('tutor', 'Ciao')]
    const s = computeSessionSummary(msgs, phrases)
    expect(s.bestUserPhrase).toBeNull()
  })

  it('suggests a phrase not yet tried', () => {
    // "vorrei" (first word of phrase 1) is in user text → phrase 1 is tried
    // "cosa" (first word of phrase 2) is not in user text → phrase 2 is untried
    const msgs = [createMessage('user', 'vorrei ordinare')]
    const s = computeSessionSummary(msgs, phrases)
    expect(s.nextPracticePhrase?.italian).toBe('Cosa mi consiglia?')
  })

  it('returns null nextPracticePhrase with no scenario phrases', () => {
    const msgs = [createMessage('user', 'hello')]
    const s = computeSessionSummary(msgs, [])
    expect(s.nextPracticePhrase).toBeNull()
  })

  it('formatSummaryForShare includes scenario title and count', () => {
    const s = { phraseCount: 4, bestUserPhrase: 'Grazie', nextPracticePhrase: phrases[0] }
    const text = formatSummaryForShare(s, 'Restaurant')
    expect(text).toContain('Restaurant')
    expect(text).toContain('4')
    expect(text).toContain('Grazie')
  })

  it('formatSummaryForShare includes next phrase', () => {
    const s = { phraseCount: 1, bestUserPhrase: null, nextPracticePhrase: phrases[2] }
    const text = formatSummaryForShare(s, 'Restaurant')
    expect(text).toContain('Il conto, per favore')
  })
})
