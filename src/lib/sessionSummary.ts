import { ConversationMessage } from './conversation'
import { ScenarioPhrase } from './scenarios'

export interface SessionSummary {
  phraseCount: number
  bestUserPhrase: string | null
  nextPracticePhrase: ScenarioPhrase | null
}

export function computeSessionSummary(
  messages: ConversationMessage[],
  scenarioPhrases: ScenarioPhrase[]
): SessionSummary {
  const tutorMessages = messages.filter((m) => m.role === 'tutor')
  const userMessages = messages.filter((m) => m.role === 'user')

  const phraseCount = tutorMessages.length

  // Most confident user phrase = longest trimmed user transcript
  const bestUserPhrase = userMessages.reduce<string | null>((best, m) => {
    const t = m.text.trim()
    if (!best || t.length > best.length) return t
    return best
  }, null)

  // Next practice phrase = first scenario phrase the user hasn't attempted, or last tutor phrase
  let nextPracticePhrase: ScenarioPhrase | null = null
  if (scenarioPhrases.length > 0) {
    const userTexts = userMessages.map((m) => m.text.toLowerCase())
    const untried = scenarioPhrases.find(
      (p) => !userTexts.some((t) => t.includes(p.italian.toLowerCase().split(' ')[0]))
    )
    nextPracticePhrase = untried ?? scenarioPhrases[0]
  }

  return { phraseCount, bestUserPhrase, nextPracticePhrase }
}

export function formatSummaryForShare(summary: SessionSummary, scenarioTitle: string): string {
  const lines = [
    `🇮🇹 Linforo — ${scenarioTitle} session`,
    `Phrases practiced: ${summary.phraseCount}`,
  ]
  if (summary.bestUserPhrase) {
    lines.push(`Best attempt: "${summary.bestUserPhrase}"`)
  }
  if (summary.nextPracticePhrase) {
    lines.push(`Next to practice: ${summary.nextPracticePhrase.italian}`)
  }
  lines.push('Keep practicing at linforo.app')
  return lines.join('\n')
}
