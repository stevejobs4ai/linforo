import scenariosData from '../../content/scenarios/italian.json'
import languagesData from '../../content/languages.json'

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

export interface LanguageConfig {
  name: string
  nativeName: string
  flag: string
  code: string
  deepgramLanguage?: string
  elevenLabsVoices?: { female: string; male: string }
  scenariosPath?: string
  available: boolean
}

export const LANGUAGES: Record<string, LanguageConfig> = languagesData as Record<string, LanguageConfig>

export function getAvailableLanguages(): Array<{ id: string } & LanguageConfig> {
  return Object.entries(LANGUAGES).map(([id, cfg]) => ({ id, ...cfg }))
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
