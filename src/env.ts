import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  MINIO_ENDPOINT: z.string(),
  MINIO_PORT: z.string(),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string(),
  MINIO_USE_SSL: z.string().transform((v) => v === 'true'),
  SESSION_SECRET: z.string(),
})

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
  'MINIO_USE_SSL',
  'SESSION_SECRET',
]

// Validate once and cache result
let validatedEnv: z.infer<typeof envSchema> | null = null

function getEnv() {
  if (validatedEnv) {
    return validatedEnv
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch {
    // During build time, env vars may not be available
    // Return a fallback object that will be replaced at runtime
    return {
      DATABASE_URL: '',
      MINIO_ENDPOINT: '',
      MINIO_PORT: '',
      MINIO_ACCESS_KEY: '',
      MINIO_SECRET_KEY: '',
      MINIO_BUCKET: '',
      MINIO_USE_SSL: false,
      SESSION_SECRET: '',
    } as z.infer<typeof envSchema>
  }
}

export const env = getEnv
