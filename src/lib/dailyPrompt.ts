const KEY_SEEN = 'linforo-daily-prompt-seen'
const KEY_COMPLETED = 'linforo-daily-prompt-completed'
const KEY_EXCHANGES = 'linforo-daily-prompt-exchanges'

const PROMPTS: Array<{
  scenario: string
  text: string
  context: string
}> = [
  {
    scenario: 'restaurant',
    text: 'Order a cappuccino and a cornetto',
    context:
      'The user wants to order a cappuccino (kap-oo-CHEE-no) and a cornetto (kor-NET-to) at a café. Help them with the Italian phrases.',
  },
  {
    scenario: 'directions',
    text: 'Ask for directions to the Colosseum',
    context:
      'The user wants to ask a local how to get to the Colosseum (il Colosseo — eel ko-lo-SEH-oh). Help them navigate in Italian.',
  },
  {
    scenario: 'market',
    text: 'Buy 2 kilos of tomatoes at the market',
    context:
      'The user wants to buy due chili di pomodori (DOO-eh KEE-lee dee po-mo-DOR-ee) at the market. Help them with Italian shopping phrases.',
  },
  {
    scenario: 'greetings',
    text: 'Greet a local and ask how they are',
    context:
      'The user wants to practice greeting someone warmly and asking how they are doing in Italian.',
  },
  {
    scenario: 'price',
    text: 'Ask how much a souvenir costs',
    context:
      'The user wants to ask the price of a souvenir and understand the response. Help them with cost-related Italian phrases.',
  },
  {
    scenario: 'restaurant',
    text: 'Order a glass of house wine',
    context:
      'The user wants to order un bicchiere di vino della casa (oon bik-KYEH-reh dee VEE-no del-la KAH-sah). Help them order wine in Italian.',
  },
  {
    scenario: 'check',
    text: 'Ask for the bill at a restaurant',
    context:
      'The user wants to ask for il conto (eel KON-to) at the end of a meal. Help them close out a restaurant visit in Italian.',
  },
  {
    scenario: 'help',
    text: 'Ask someone for help finding your hotel',
    context:
      'The user wants to ask a local for help finding their hotel using Italian. Help them ask for assistance politely.',
  },
  {
    scenario: 'market',
    text: 'Ask if they have ripe peaches',
    context:
      'The user wants to ask: Avete pesche mature? (ah-VEH-teh PES-keh mah-TOO-reh). Help them with Italian market vocabulary.',
  },
  {
    scenario: 'greetings',
    text: 'Introduce yourself in Italian',
    context:
      'The user wants to tell someone their name and where they are from in Italian. Help them with self-introduction phrases.',
  },
  {
    scenario: 'excuse_me',
    text: 'Excuse yourself to get past someone in a crowded market',
    context:
      'The user wants to politely say "excuse me" (permesso / scusi) to get past people in a crowded space.',
  },
  {
    scenario: 'bathroom',
    text: 'Find the nearest bathroom in a restaurant',
    context:
      'The user needs to ask where the bathroom is (dov\'è il bagno — doh-VEH eel BAN-yo) in a restaurant.',
  },
]

export interface DailyPrompt {
  text: string
  scenario: string
  context: string
  date: string
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function getDeterministicPrompt(date: string): (typeof PROMPTS)[number] {
  const hash = date.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PROMPTS[hash % PROMPTS.length]
}

export function getTodayPrompt(): DailyPrompt {
  const today = getTodayDate()
  const prompt = getDeterministicPrompt(today)
  return { ...prompt, date: today }
}

export function hasSeenTodayPrompt(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY_SEEN) === getTodayDate()
}

export function markPromptSeen(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_SEEN, getTodayDate())
}

export function isDailyPromptCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY_COMPLETED) === getTodayDate()
}

export function markDailyPromptCompleted(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_COMPLETED, getTodayDate())
}

export function incrementDailyPromptExchanges(): number {
  if (typeof window === 'undefined') return 0
  const today = getTodayDate()
  const key = `${KEY_EXCHANGES}-${today}`
  const count = parseInt(localStorage.getItem(key) ?? '0', 10) + 1
  localStorage.setItem(key, count.toString())
  return count
}

export function getDailyPromptExchanges(): number {
  if (typeof window === 'undefined') return 0
  const today = getTodayDate()
  const key = `${KEY_EXCHANGES}-${today}`
  return parseInt(localStorage.getItem(key) ?? '0', 10)
}
