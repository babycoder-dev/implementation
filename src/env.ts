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

export const env = (() => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    // 检查是否是 Zod 错误
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(e => e.message === 'Required')
        .map(e => e.path.join('.'))
        .join(', ')

      if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars)
        throw new Error(`Missing required environment variables: ${missingVars}`)
      }

      // 检查是否缺少特定环境变量
      const requiredVars = [
        'DATABASE_URL',
        'MINIO_ENDPOINT',
        'MINIO_PORT',
        'MINIO_ACCESS_KEY',
        'MINIO_SECRET_KEY',
        'MINIO_BUCKET',
        'MINIO_USE_SSL',
        'SESSION_SECRET',
      ]

      const missingVarInfo = []
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          missingVarInfo.push(`${varName} (not set)`)
        }
      }

      if (missingVarInfo.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVarInfo.join(', ')}`)
      }

      throw error
    }
  }
})()
