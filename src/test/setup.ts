import "@testing-library/jest-dom"

// Polyfill for ResizeObserver used by Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
