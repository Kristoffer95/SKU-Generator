import '@testing-library/jest-dom'

// Mock window.matchMedia for jsdom (required by use-mobile hook)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock window.scrollTo for jsdom (required by framer-motion)
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
})
