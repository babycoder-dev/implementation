import "@testing-library/jest-dom"
import crypto from 'node:crypto'

// Polyfill for ResizeObserver used by Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Polyfill Web Crypto for jose library in jsdom environment
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => crypto.randomBytes(arr.length),
    subtle: {
      sign: async (alg: string, _key: CryptoKey, data: Uint8Array) => {
        const algo = alg.startsWith('HS') ? 'sha256' : 'sha384'
        return crypto.createHmac(algo, 'test').update(data).digest()
      },
      verify: async (_alg: string, _key: CryptoKey, data: Uint8Array, signature: Uint8Array) => {
        const expected = crypto.createHmac('sha256', 'test').update(data).digest()
        return Buffer.compare(signature, expected) === 0
      },
      encrypt: async () => new Uint8Array(32),
      decrypt: async () => new Uint8Array(32),
      deriveKey: async () => ({}),
      importKey: async (_format: string, key: Uint8Array) => key,
      exportKey: async (_format: string, key: Uint8Array) => key,
      digest: async (algo: string, data: Uint8Array) => {
        const hash = crypto.createHash(algo.replace('-', ''))
        return hash.update(data).digest()
      },
    },
  },
  writable: true,
  configurable: true,
})
