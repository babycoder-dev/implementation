import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**'],
    env: {
      DATABASE_URL: 'postgresql://user:password@localhost:5432/learning_system',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: '9000',
      MINIO_ACCESS_KEY: 'test-access-key',
      MINIO_SECRET_KEY: 'test-secret-key',
      MINIO_BUCKET: 'learning-files',
      MINIO_USE_SSL: 'false',
      SESSION_SECRET: 'test-session-secret-for-development-only',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
