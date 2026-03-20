const KEY = 'linforo-interests'
const SEEN_KEY = 'linforo-interests-seen'

// Preset interest IDs — plus any user-defined custom strings
export type Interest = string

export const PRESET_INTERESTS = ['cooking', 'soccer', 'fashion', 'music', 'art', 'history', 'wine', 'travel', 'family', 'movies'] as const

export const INTERESTS: { id: Interest; emoji: string; label: string }[] = [
  { id: 'cooking', emoji: '🍕', label: 'Cooking' },
  { id: 'soccer', emoji: '⚽', label: 'Soccer' },
  { id: 'fashion', emoji: '👗', label: 'Fashion' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'art', emoji: '🎨', label: 'Art' },
  { id: 'history', emoji: '🏛️', label: 'History' },
  { id: 'wine', emoji: '🍷', label: 'Wine' },
  { id: 'travel', emoji: '✈️', label: 'Travel' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
  { id: 'movies', emoji: '🎬', label: 'Movies' },
]

export function getInterests(): Interest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Interest[]) : []
  } catch {
    return []
  }
}

export function setInterests(interests: Interest[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(interests))
}

export function hasSetInterests(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) !== null
}

export function markInterestsSeen(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SEEN_KEY, '1')
}

export function hasSeenInterests(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SEEN_KEY) === '1'
}

export function getInterestsPromptText(): string {
  const interests = getInterests()
  if (interests.length === 0) return ''
  const labels = interests.map((id) => INTERESTS.find((i) => i.id === id)?.label ?? id)
  return `The user is interested in: ${labels.join(', ')}. Weave relevant Italian vocabulary into conversations when natural.`
}
