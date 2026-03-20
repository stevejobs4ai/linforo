import { describe, it, expect } from 'vitest'

// Test the roleplay rating logic extracted from voice page
function getRoleplayRating(userMessageCount: number) {
  if (userMessageCount >= 8) return { label: 'Gold', emoji: '🥇', color: '#ffd60a' }
  if (userMessageCount >= 5) return { label: 'Silver', emoji: '🥈', color: '#aaa' }
  return { label: 'Bronze', emoji: '🥉', color: '#c97b3a' }
}

function countItalianMessages(messages: Array<{ role: string; text: string }>) {
  const italianPattern =
    /\b(ciao|buon|grazie|prego|per favore|scusi|mi|ho|sono|vorrei|posso|dov|cosa|come|quando|quanto)\b/i
  return messages
    .filter((m) => m.role === 'user')
    .filter((m) => italianPattern.test(m.text)).length
}

describe('roleplay rating', () => {
  it('returns Bronze for fewer than 5 user messages', () => {
    expect(getRoleplayRating(0).label).toBe('Bronze')
    expect(getRoleplayRating(4).label).toBe('Bronze')
  })

  it('returns Silver for 5-7 user messages', () => {
    expect(getRoleplayRating(5).label).toBe('Silver')
    expect(getRoleplayRating(7).label).toBe('Silver')
  })

  it('returns Gold for 8+ user messages', () => {
    expect(getRoleplayRating(8).label).toBe('Gold')
    expect(getRoleplayRating(20).label).toBe('Gold')
  })

  it('Gold has correct color', () => {
    expect(getRoleplayRating(10).color).toBe('#ffd60a')
  })
})

describe('italian message detection', () => {
  it('counts messages containing Italian words', () => {
    const messages = [
      { role: 'user', text: 'Ciao, buongiorno!' },
      { role: 'user', text: 'Hello, I need help' },
      { role: 'tutor', text: 'Benvenuto!' },
      { role: 'user', text: 'Vorrei un caffè' },
    ]
    // "Ciao" and "Vorrei" match; tutor message excluded; English excluded
    expect(countItalianMessages(messages)).toBe(2)
  })

  it('ignores tutor messages', () => {
    const messages = [
      { role: 'tutor', text: 'Ciao, come stai?' },
      { role: 'user', text: 'I want coffee' },
    ]
    expect(countItalianMessages(messages)).toBe(0)
  })

  it('returns 0 for no Italian', () => {
    const messages = [
      { role: 'user', text: 'Hello' },
      { role: 'user', text: 'I need help' },
    ]
    expect(countItalianMessages(messages)).toBe(0)
  })

  it('detects various Italian keywords', () => {
    const messages = [
      { role: 'user', text: 'grazie mille' },
      { role: 'user', text: 'posso avere' },
      { role: 'user', text: 'scusi, dov' },
    ]
    expect(countItalianMessages(messages)).toBe(3)
  })
})
