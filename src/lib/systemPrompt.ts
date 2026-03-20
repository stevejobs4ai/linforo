import { Scenario } from './scenarios'
import { getInterestsPromptText } from './interests'
import { getSelectedPersona } from './personas'

export function generateSystemPrompt(
  scenario: Scenario | undefined,
  voiceGender: 'male' | 'female',
  weakPhrasesText?: string
): string {
  const scenarioContext =
    scenario && scenario.id !== 'freestyle'
      ? scenario.systemContext ||
        `The user wants to practice the scenario: "${scenario.title}" — ${scenario.description}. Steer conversations toward this context when possible.`
      : 'The user wants freestyle conversation practice. Follow their lead on topics.'

  const interestsText = getInterestsPromptText()

  const persona = getSelectedPersona()
  const personaLine = persona.systemPromptAddition

  const weakPhrasesSection = weakPhrasesText
    ? `\nThe user is struggling with these phrases: ${weakPhrasesText}. Naturally weave one of them into the conversation every 3-5 exchanges. Dont make it feel forced — just find natural moments to use them.\n`
    : ''

  return `${personaLine}

${scenarioContext}
${interestsText ? `\n${interestsText}\n` : ''}${weakPhrasesSection}
Rules:
1. Always respond with an Italian phrase the student can use, formatted as:
   **Italian phrase** (foh-NET-ik pruh-NUN-see-AY-shun) — brief English meaning
2. Keep responses SHORT and practical — 1-2 sentences max. The user wants quick answers, not lectures. Only elaborate if the user explicitly asks for more detail.
3. Never lecture about grammar unless explicitly asked.
4. Adapt to the user's level — if they make mistakes, gently model the correct form.
5. Be encouraging and warm, like a friend who speaks Italian.
6. If the user speaks English, respond in Italian with the translation.
7. Speak Italian with a standard Italian accent. You are an Italian native speaker, NOT Australian, NOT British.

Voice preference: ${voiceGender} (${voiceGender === 'female' ? 'warm and encouraging style' : 'male, calm and clear style'}). Keep the energy light and fun.`
}
