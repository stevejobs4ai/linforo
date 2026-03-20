const KEY = 'linforo-confidence'

export interface PhraseConfidence {
  phraseItalian: string
  attempts: number
  lastAttempted: number
  firstAttempted: number
  status: 'new' | 'practicing' | 'owned'
}

function computeStatus(
  attempts: number,
  firstAttempted: number
): PhraseConfidence['status'] {
  if (attempts >= 5) return 'owned'
  // 'practicing' requires 3+ attempts spread across at least 2 different days
  if (attempts >= 3) {
    const daysSinceFirst = (Date.now() - firstAttempted) / (1000 * 60 * 60 * 24)
    if (daysSinceFirst >= 1) return 'practicing'
  }
  return 'new'
}

function load(): Record<string, PhraseConfidence> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, PhraseConfidence>) : {}
  } catch {
    return {}
  }
}

function save(data: Record<string, PhraseConfidence>): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function recordAttempt(phraseItalian: string): PhraseConfidence {
  const data = load()
  const existing = data[phraseItalian]
  const now = Date.now()

  if (existing) {
    const attempts = existing.attempts + 1
    const updated: PhraseConfidence = {
      ...existing,
      attempts,
      lastAttempted: now,
      status: computeStatus(attempts, existing.firstAttempted),
    }
    data[phraseItalian] = updated
    save(data)
    return updated
  }

  const entry: PhraseConfidence = {
    phraseItalian,
    attempts: 1,
    lastAttempted: now,
    firstAttempted: now,
    status: 'new',
  }
  data[phraseItalian] = entry
  save(data)
  return entry
}

export function getConfidence(phraseItalian: string): PhraseConfidence | null {
  return load()[phraseItalian] ?? null
}

export function getAllConfidence(): Record<string, PhraseConfidence> {
  return load()
}

export function getStatusColor(status: PhraseConfidence['status']): string {
  switch (status) {
    case 'owned':
      return '#4caf50'
    case 'practicing':
      return '#ffd60a'
    case 'new':
      return '#ff3b30'
  }
}

export function getStatusLabel(status: PhraseConfidence['status']): string {
  switch (status) {
    case 'owned':
      return 'Owned'
    case 'practicing':
      return 'Practicing'
    case 'new':
      return 'New'
  }
}

/** Count owned phrases (status === 'owned') across all tracked phrases */
export function countOwnedPhrases(): number {
  const data = load()
  return Object.values(data).filter((p) => p.status === 'owned').length
}

/**
 * Returns weak phrases (status 'new' or 'practicing') sorted by oldest lastAttempted.
 * Used by spaced repetition to surface forgotten phrases.
 */
export function getWeakPhrases(limit = 3): PhraseConfidence[] {
  const data = load()
  return Object.values(data)
    .filter((p) => p.status === 'new' || p.status === 'practicing')
    .sort((a, b) => a.lastAttempted - b.lastAttempted)
    .slice(0, limit)
}

/**
 * Promote a phrase to 'owned' after sustained successful use.
 * Called externally when the tutor resurfaces a phrase and the user responds well.
 */
export function promoteToOwned(phraseItalian: string): PhraseConfidence | null {
  const data = load()
  const existing = data[phraseItalian]
  if (!existing) return null
  const updated: PhraseConfidence = { ...existing, status: 'owned' }
  data[phraseItalian] = updated
  save(data)
  return updated
}
