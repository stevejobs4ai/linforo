export interface HistoryMessage {
  role: 'user' | 'tutor'
  text: string
  timestamp: number
}

export interface ConversationSession {
  id: string
  scenarioId: string
  scenarioTitle: string
  scenarioEmoji: string
  startedAt: number
  messages: HistoryMessage[]
}

const KEY = 'linforo-history'
const MAX_SESSIONS = 50

function load(): ConversationSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ConversationSession[]) : []
  } catch {
    return []
  }
}

export function getHistory(): ConversationSession[] {
  return load().sort((a, b) => b.startedAt - a.startedAt)
}

export function saveSession(
  session: Omit<ConversationSession, 'id'>
): ConversationSession {
  const sessions = load()
  const newSession: ConversationSession = {
    ...session,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
  const updated = [newSession, ...sessions].slice(0, MAX_SESSIONS)
  localStorage.setItem(KEY, JSON.stringify(updated))
  return newSession
}

export function getSession(id: string): ConversationSession | undefined {
  return load().find((s) => s.id === id)
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}
