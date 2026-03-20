import '@testing-library/jest-dom'

// Provide a fully-functional localStorage mock for jsdom environments
// that don't expose it (null-origin restriction in some jsdom versions).
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

if (typeof window !== 'undefined') {
  try {
    window.localStorage.setItem('__test__', '1')
    window.localStorage.removeItem('__test__')
  } catch {
    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      writable: true,
    })
  }
}
