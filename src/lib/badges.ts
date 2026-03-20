/**
 * badges.ts — growth-based badge system.
 * Badge tiers are based purely on phrases owned (status === 'owned').
 * No daily login tracking.
 */

import { countOwnedPhrases, getAllConfidence } from './confidence'

export type BadgeTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Badge {
  tier: BadgeTier
  label: string
  emoji: string
  threshold: number
}

export const BADGES: Badge[] = [
  { tier: 'bronze', label: 'Bronze', emoji: '🥉', threshold: 10 },
  { tier: 'silver', label: 'Silver', emoji: '🥈', threshold: 30 },
  { tier: 'gold', label: 'Gold', emoji: '🥇', threshold: 60 },
  { tier: 'platinum', label: 'Platinum', emoji: '💎', threshold: 100 },
]

export function getBadgeTier(phrasesOwned: number): BadgeTier {
  if (phrasesOwned >= 100) return 'platinum'
  if (phrasesOwned >= 60) return 'gold'
  if (phrasesOwned >= 30) return 'silver'
  if (phrasesOwned >= 10) return 'bronze'
  return 'none'
}

export function getBadge(phrasesOwned: number): Badge | null {
  const tier = getBadgeTier(phrasesOwned)
  return BADGES.find((b) => b.tier === tier) ?? null
}

export function getNextBadge(phrasesOwned: number): Badge | null {
  return BADGES.find((b) => b.threshold > phrasesOwned) ?? null
}

export interface MonthlyStats {
  scenariosPracticed: number
  phrasesOwned: number
  roleplaysCompleted: number
}

export function getMonthlyStats(): MonthlyStats {
  const confidence = getAllConfidence()
  const now = Date.now()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartMs = monthStart.getTime()

  let phrasesOwned = 0
  for (const p of Object.values(confidence)) {
    if (p.status === 'owned' && p.lastAttempted >= monthStartMs) phrasesOwned++
  }

  // Scenarios practiced this month from localStorage history
  let scenariosPracticed = 0
  let roleplaysCompleted = 0
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('linforo-history')
      if (raw) {
        const sessions = JSON.parse(raw) as Array<{ startedAt: number; scenarioId: string }>
        for (const s of sessions) {
          if (s.startedAt >= monthStartMs) {
            scenariosPracticed++
            if (s.scenarioId === 'roleplay') roleplaysCompleted++
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return { scenariosPracticed, phrasesOwned, roleplaysCompleted }
}

export function getPhrasesOwned(): number {
  return countOwnedPhrases()
}

export function getDaysActive(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem('linforo-history')
    if (!raw) return 0
    const sessions = JSON.parse(raw) as Array<{ startedAt: number }>
    const days = new Set<string>()
    for (const s of sessions) {
      days.add(new Date(s.startedAt).toISOString().slice(0, 10))
    }
    return days.size
  } catch {
    return 0
  }
}
