export interface BookmarkedPhrase {
  id: string
  italian: string
  phonetic: string
  english: string
  scenarioId: string
  scenarioTitle: string
  savedAt: number
}

const KEY = 'linforo-bookmarks'

function load(): BookmarkedPhrase[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(bookmarks: BookmarkedPhrase[]): void {
  localStorage.setItem(KEY, JSON.stringify(bookmarks))
}

export function getBookmarks(): BookmarkedPhrase[] {
  return load()
}

export function addBookmark(phrase: Omit<BookmarkedPhrase, 'id' | 'savedAt'>): BookmarkedPhrase {
  const bookmarks = load()
  const existing = bookmarks.find(
    (b) => b.italian === phrase.italian && b.scenarioId === phrase.scenarioId
  )
  if (existing) return existing
  const newBookmark: BookmarkedPhrase = {
    ...phrase,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    savedAt: Date.now(),
  }
  save([...bookmarks, newBookmark])
  return newBookmark
}

export function removeBookmark(id: string): void {
  const bookmarks = load().filter((b) => b.id !== id)
  save(bookmarks)
}

export function isBookmarked(italian: string, scenarioId: string): boolean {
  return load().some((b) => b.italian === italian && b.scenarioId === scenarioId)
}

export function getBookmarksByScenario(): Record<string, BookmarkedPhrase[]> {
  const bookmarks = load()
  return bookmarks.reduce<Record<string, BookmarkedPhrase[]>>((acc, b) => {
    const key = b.scenarioId
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})
}
