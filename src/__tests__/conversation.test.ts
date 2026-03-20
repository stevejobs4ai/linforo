import { describe, it, expect } from 'vitest'
import { createMessage, formatMessagesForAPI } from '@/lib/conversation'

describe('conversation', () => {
  it('creates a user message with correct role', () => {
    const msg = createMessage('user', 'Hello')
    expect(msg.role).toBe('user')
    expect(msg.text).toBe('Hello')
    expect(msg.id).toBeTruthy()
    expect(msg.timestamp).toBeGreaterThan(0)
  })

  it('creates a tutor message with correct role', () => {
    const msg = createMessage('tutor', 'Ciao!')
    expect(msg.role).toBe('tutor')
  })

  it('formats messages for API correctly', () => {
    const messages = [
      createMessage('user', 'Hello'),
      createMessage('tutor', 'Ciao!'),
    ]
    const formatted = formatMessagesForAPI(messages)
    expect(formatted[0].role).toBe('user')
    expect(formatted[1].role).toBe('assistant')
  })

  it('each message has a unique id', () => {
    const msg1 = createMessage('user', 'Hello')
    const msg2 = createMessage('user', 'Hello')
    expect(msg1.id).not.toBe(msg2.id)
  })
})
