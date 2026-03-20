export type MessageRole = 'user' | 'tutor'

export interface ConversationMessage {
  id: string
  role: MessageRole
  text: string
  timestamp: number
}

export function createMessage(role: MessageRole, text: string): ConversationMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    timestamp: Date.now(),
  }
}

export function formatMessagesForAPI(messages: ConversationMessage[]): Array<{ role: string; content: string }> {
  return messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text,
  }))
}
