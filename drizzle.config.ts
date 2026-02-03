import type { Config } from 'drizzle-kit'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
})

// Drizzle config is evaluated at build time, so we use a separate validation
const envVars = envSchema.parse(process.env)

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: envVars.DATABASE_URL,
  },
} satisfies Config
