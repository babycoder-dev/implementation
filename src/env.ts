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

export const env = envSchema.parse(process.env)
