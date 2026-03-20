export interface Scenario {
  id: string
  emoji: string
  title: string
  description: string
  featured?: boolean
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'freestyle',
    emoji: '🌟',
    title: 'Freestyle',
    description: 'Whatever I want',
    featured: true,
  },
  { id: 'restaurant', emoji: '🍽️', title: 'Restaurant', description: 'Order food and drinks' },
  { id: 'directions', emoji: '🗺️', title: 'Directions', description: 'Ask for and give directions' },
  { id: 'bathroom', emoji: '🚻', title: 'Bathroom', description: 'Find the restroom' },
  { id: 'greetings', emoji: '👋', title: 'Greetings', description: 'Say hello and introduce yourself' },
  { id: 'market', emoji: '🛒', title: 'Market', description: 'Shop at a local market' },
  { id: 'price', emoji: '💰', title: 'Price', description: 'Ask about prices and haggle' },
  { id: 'excuse-me', emoji: '🙏', title: 'Excuse Me', description: 'Get attention politely' },
  { id: 'ask-for-help', emoji: '🆘', title: 'Ask for Help', description: 'Request assistance' },
  { id: 'the-check', emoji: '🧾', title: 'The Check', description: 'Ask for the bill' },
  { id: 'thank-you', emoji: '🙏', title: 'Thank You', description: 'Express gratitude' },
]

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
