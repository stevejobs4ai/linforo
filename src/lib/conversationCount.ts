const KEY = 'linforo-conversation-count'
const NUDGE_THRESHOLD = 3

export function getConversationCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(KEY) ?? '0', 10)
}

export function incrementConversationCount(): number {
  const next = getConversationCount() + 1
  localStorage.setItem(KEY, String(next))
  return next
}

export function shouldShowAccountNudge(): boolean {
  return getConversationCount() >= NUDGE_THRESHOLD
}
