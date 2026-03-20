import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordAttempt,
  getConfidence,
  getAllConfidence,
  getStatusColor,
  getStatusLabel,
  countOwnedPhrases,
} from '@/lib/confidence'

beforeEach(() => {
  localStorage.clear()
})

describe('confidence tracker', () => {
  it('returns null for unknown phrase', () => {
    expect(getConfidence('Ciao')).toBeNull()
  })

  it('records first attempt as new', () => {
    const c = recordAttempt('Ciao')
    expect(c.attempts).toBe(1)
    expect(c.status).toBe('new')
    expect(c.phraseItalian).toBe('Ciao')
  })

  it('accumulates attempts', () => {
    recordAttempt('Ciao')
    recordAttempt('Ciao')
    const c = recordAttempt('Ciao')
    expect(c.attempts).toBe(3)
  })

  it('becomes owned after 5+ attempts', () => {
    for (let i = 0; i < 5; i++) recordAttempt('Grazie')
    const c = getConfidence('Grazie')!
    expect(c.status).toBe('owned')
  })

  it('status stays new under 3 attempts', () => {
    recordAttempt('Prego')
    recordAttempt('Prego')
    const c = getConfidence('Prego')!
    expect(c.status).toBe('new')
  })

  it('tracks multiple phrases independently', () => {
    recordAttempt('Ciao')
    for (let i = 0; i < 5; i++) recordAttempt('Grazie')
    expect(getConfidence('Ciao')!.attempts).toBe(1)
    expect(getConfidence('Grazie')!.status).toBe('owned')
  })

  it('getAllConfidence returns all tracked phrases', () => {
    recordAttempt('Ciao')
    recordAttempt('Grazie')
    const all = getAllConfidence()
    expect(Object.keys(all)).toHaveLength(2)
    expect(all['Ciao']).toBeDefined()
    expect(all['Grazie']).toBeDefined()
  })

  it('getStatusColor returns correct colors', () => {
    expect(getStatusColor('owned')).toBe('#4caf50')
    expect(getStatusColor('practicing')).toBe('#ffd60a')
    expect(getStatusColor('new')).toBe('#ff3b30')
  })

  it('getStatusLabel returns correct labels', () => {
    expect(getStatusLabel('owned')).toBe('Owned')
    expect(getStatusLabel('practicing')).toBe('Practicing')
    expect(getStatusLabel('new')).toBe('New')
  })

  it('countOwnedPhrases counts only owned', () => {
    recordAttempt('Ciao') // new
    for (let i = 0; i < 5; i++) recordAttempt('Grazie') // owned
    for (let i = 0; i < 5; i++) recordAttempt('Prego') // owned
    expect(countOwnedPhrases()).toBe(2)
  })

  it('persists across multiple calls', () => {
    recordAttempt('Ciao')
    // Re-read from localStorage
    const c = getConfidence('Ciao')!
    expect(c.attempts).toBe(1)
  })
})
