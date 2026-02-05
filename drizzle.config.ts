import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Will be overridden at runtime by environment variable
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/learning_system',
  },
} satisfies Config
