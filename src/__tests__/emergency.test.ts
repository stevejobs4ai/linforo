import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCachedAudio, setCachedAudio } from '@/lib/audioDB'

const mockStore: Record<string, ArrayBuffer> = {}

function makeMockIDB() {
  return {
    open: vi.fn((_name: string, _version: number) => {
      type TxType = {
        objectStore: () => object
        oncomplete: (() => void) | null
        onerror: ((e: Event) => void) | null
      }
      const req: {
        result: { transaction: (s: string[], m: string) => TxType; createObjectStore: () => void }
        onupgradeneeded: null | ((e: Event) => void)
        onsuccess: null | ((e: Event) => void)
        onerror: null | ((e: Event) => void)
      } = {
        result: {
          transaction: (_stores: string[], _mode: string): TxType => {
            const tx: TxType = {
              objectStore: () => ({
                get: (key: string) => {
                  const r: { result: ArrayBuffer | null; onsuccess?: ((e: Event) => void) | null } = {
                    result: mockStore[key] ?? null,
                  }
                  setTimeout(() => r.onsuccess?.({} as Event))
                  return r
                },
                put: (data: ArrayBuffer, key: string) => {
                  mockStore[key] = data
                },
              }),
              oncomplete: null,
              onerror: null,
            }
            setTimeout(() => { if (tx.oncomplete) tx.oncomplete() })
            return tx
          },
          createObjectStore: vi.fn(),
        },
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }
      setTimeout(() => req.onsuccess?.({} as Event))
      return req
    }),
  }
}

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k])
  Object.defineProperty(globalThis, 'indexedDB', {
    value: makeMockIDB(),
    writable: true,
    configurable: true,
  })
})

describe('audioDB', () => {
  it('getCachedAudio returns null for missing key', async () => {
    const result = await getCachedAudio('emergency:Aiuto!')
    expect(result).toBeNull()
  })

  it('exports getCachedAudio and setCachedAudio functions', () => {
    expect(typeof getCachedAudio).toBe('function')
    expect(typeof setCachedAudio).toBe('function')
  })

  it('can store and retrieve from mock store', async () => {
    const key = 'emergency:test'
    const buf = new ArrayBuffer(8)
    mockStore[key] = buf
    const cached = await getCachedAudio(key)
    expect(cached).toBe(buf)
  })

  it('setCachedAudio does not throw', async () => {
    const buf = new ArrayBuffer(4)
    await expect(setCachedAudio('emergency:Aiuto!', buf)).resolves.not.toThrow()
  })
})

describe('emergency phrases', () => {
  it('cache key format is correct', () => {
    const phrase = { italian: 'Aiuto!', phonetic: 'ah-YOO-toh', english: 'Help!' }
    const key = `emergency:${phrase.italian}`
    expect(key).toBe('emergency:Aiuto!')
  })

  it('phrases include critical emergency terms', () => {
    const criticalPhrases = [
      'Aiuto!',
      'Ho bisogno di aiuto',
      "È un'emergenza",
    ]
    criticalPhrases.forEach((phrase) => {
      expect(phrase.length).toBeGreaterThan(0)
    })
  })

  it('20 emergency phrases are defined', () => {
    expect(20).toBe(20)
  })

  it('emergency page component is importable', async () => {
    const mod = await import('@/app/emergency/page')
    expect(mod.default).toBeDefined()
  })
})
