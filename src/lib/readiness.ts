import { getBookmarks } from './bookmarks'
import { getAllConfidence } from './confidence'
import { SCENARIOS } from './scenarios'

const CONV_KEY = 'linforo-scenario-conversations'

// Travel scenarios only (index > 0, excluding freestyle and roleplay)
const TRAVEL_SCENARIOS = SCENARIOS.filter(
  (s) => s.id !== 'freestyle' && s.id !== 'roleplay'
)

function loadConversations(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CONV_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function incrementScenarioConversation(scenarioId: string): void {
  if (typeof window === 'undefined') return
  const data = loadConversations()
  data[scenarioId] = (data[scenarioId] ?? 0) + 1
  localStorage.setItem(CONV_KEY, JSON.stringify(data))
}

export function getScenarioConversationCount(scenarioId: string): number {
  return loadConversations()[scenarioId] ?? 0
}

/**
 * Returns a 0–100 readiness score.
 * Each travel scenario contributes up to 10%:
 *   - 5% from bookmarks (ratio of phrases bookmarked; owned phrases count 2x)
 *   - 5% from conversations (capped at 3 conversations = full credit)
 */
export function computeReadiness(): number {
  if (typeof window === 'undefined') return 0

  const count = TRAVEL_SCENARIOS.length
  if (count === 0) return 0

  const bookmarks = getBookmarks()
  const conversations = loadConversations()
  const confidence = getAllConfidence()
  let total = 0

  for (const scenario of TRAVEL_SCENARIOS) {
    const phraseCount = scenario.phrases.length || 1
    const scenarioBookmarks = bookmarks.filter((b) => b.scenarioId === scenario.id)

    // Owned phrases count 2x — reach full credit with half as many owned phrases
    let weightedBookmarkCount = 0
    for (const b of scenarioBookmarks) {
      const conf = confidence[b.italian]
      weightedBookmarkCount += conf?.status === 'owned' ? 2 : 1
    }
    const bookmarkScore = Math.min(weightedBookmarkCount / phraseCount, 1) * 5

    const convs = conversations[scenario.id] ?? 0
    const convScore = Math.min(convs / 3, 1) * 5
    total += bookmarkScore + convScore
  }

  return Math.round(Math.min(total, 100))
}
