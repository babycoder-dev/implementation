import { z, ZodError } from 'zod'

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

function formatEnvValidationError(error: ZodError): string {
  const missingVars = error.issues
    .filter((e: unknown) => {
      const issue = e as { code: string; received?: unknown; path: (string | number)[] }
      return issue.code === 'invalid_type' && issue.received === 'undefined'
    })
    .map((e: unknown) => {
      const issue = e as { path: (string | number)[] }
      return issue.path.join('.')
    })

  const lines = [
    'Missing or invalid environment variables:',
    '',
    ...REQUIRED_ENV_VARS.map((v) => {
      const isMissing = missingVars.includes(v)
      return `  ${isMissing ? '❌' : '✓'} ${v}`
    }),
    '',
    'Please ensure all required environment variables are set in your .env file or environment.',
  ]

  if (error.issues.length > missingVars.length) {
    const otherErrors = error.issues.filter((e: unknown) => {
      const issue = e as { code: string; received?: unknown }
      return !(issue.code === 'invalid_type' && issue.received === 'undefined')
    })
    lines.push('', 'Validation errors:')
    otherErrors.forEach((e: unknown) => {
      const issue = e as { path: (string | number)[]; message: string }
      const path = issue.path.join('.') || 'unknown'
      lines.push(`  - ${path}: ${issue.message}`)
    })
  }

  return lines.join('\n')
}

function getEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('\x1b[31m%s\x1b[0m', formatEnvValidationError(error))
      process.exit(1)
    }
    throw error
  }
}

// Lazy evaluation to avoid running at build time
let cachedEnv: ReturnType<typeof getEnv> | null = null

export const env = () => {
  if (!cachedEnv) {
    cachedEnv = getEnv()
  }
  return cachedEnv
}
