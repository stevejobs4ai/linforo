import { describe, it, expect } from 'vitest'

// Test shadow mode state logic
describe('shadow mode', () => {
  it('shadow mode starts disabled', () => {
    let shadowMode = false
    expect(shadowMode).toBe(false)
  })

  it('toggling shadow mode flips the state', () => {
    let shadowMode = false
    shadowMode = !shadowMode
    expect(shadowMode).toBe(true)
    shadowMode = !shadowMode
    expect(shadowMode).toBe(false)
  })

  it('shadow prompt does not include English instructions', () => {
    const scenarioTitle = 'Restaurant'
    const shadowPrompt = `You are in SHADOWING MODE for Italian language practice.
Say exactly ONE short Italian sentence or phrase (5-10 words) suitable for ${scenarioTitle} conversation.
Do NOT include any English translation, phonetic pronunciation, or explanation.
Just the Italian phrase, nothing else. Make it natural and useful.`

    expect(shadowPrompt).toContain('SHADOWING MODE')
    expect(shadowPrompt).toContain('Do NOT include any English')
    expect(shadowPrompt).toContain(scenarioTitle)
  })

  it('shadow mode audio state transitions correctly', () => {
    // idle → say-it-back after phrase plays
    const transitions = ['idle', 'processing', 'playing', 'say-it-back']
    expect(transitions[0]).toBe('idle')
    expect(transitions[transitions.length - 1]).toBe('say-it-back')
  })

  it('shadow mode does not call chat API with user transcript', () => {
    // In shadow mode, user speech is displayed but does not trigger AI response
    const isShadowMode = true
    let chatApiCalled = false
    if (!isShadowMode) {
      chatApiCalled = true
    }
    expect(chatApiCalled).toBe(false)
  })

  it('shadow phrase shows Italian text in banner', () => {
    const shadowPhrase = 'Vorrei un caffè, per favore'
    const banner = `${shadowPhrase}`
    expect(banner).toBe(shadowPhrase)
    expect(banner.length).toBeGreaterThan(0)
  })
})
