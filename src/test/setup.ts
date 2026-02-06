import "@testing-library/jest-dom"

// Polyfill for ResizeObserver used by Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Polyfill Web Crypto for jose library in jsdom environment
const crypto = require('crypto')
const subtle = crypto.subtle

Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => crypto.randomBytes(arr.length),
    subtle: {
      sign: async (alg: string, key: CryptoKey, data: Uint8Array) => {
        const algo = alg.startsWith('HS') ? 'sha256' : 'sha384'
        return crypto.createHmac(algo, key).update(data).digest()
      },
      verify: async (alg: string, key: CryptoKey, data: Uint8Array, signature: Uint8Array) => {
        const algo = alg.startsWith('HS') ? 'sha256' : 'sha384'
        const expected = crypto.createHmac(algo, key).update(data).digest()
        return Buffer.compare(signature, expected) === 0
      },
      encrypt: async () => new Uint8Array(32),
      decrypt: async () => new Uint8Array(32),
      deriveKey: async () => ({}),
      importKey: async (format: string, key: Uint8Array) => key,
      exportKey: async (format: string, key: Uint8Array) => key,
      digest: async (algo: string, data: Uint8Array) => {
        const hash = crypto.createHash(algo.replace('-', ''))
        return hash.update(data).digest()
      },
    },
  },
  writable: true,
  configurable: true,
})
