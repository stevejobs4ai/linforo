import scenariosData from '../../content/scenarios.json'

export interface ScenarioPhrase {
  italian: string
  phonetic: string
  english: string
}

export interface Scenario {
  id: string
  emoji: string
  title: string
  description: string
  subtitle: string
  systemContext: string
  phrases: ScenarioPhrase[]
  featured?: boolean
}

export const SCENARIOS: Scenario[] = scenariosData.scenarios.map((s, i) => ({
  id: s.id,
  emoji: s.emoji,
  title: s.title,
  subtitle: s.subtitle,
  description: s.subtitle,
  systemContext: s.systemContext,
  phrases: s.phrases as ScenarioPhrase[],
  featured: i === 0 ? true : undefined,
}))

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
