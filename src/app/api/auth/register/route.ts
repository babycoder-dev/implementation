import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/validations/auth'
import { rateLimit } from '@/lib/rate-limit'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'

const REGISTER_RATE_LIMIT = 3
const REGISTER_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from X-Forwarded-For header (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return `register:${forwardedFor.split(',')[0].trim()}`
  }

  // Fall back to X-Real-IP header
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return `register:${realIp}`
  }

  // Last resort: use a fallback identifier
  // In production, this should be replaced with proper IP detection
  return 'register:unknown'
}

function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): Headers {
  return new Headers({
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  })
}

export async function POST(request: NextRequest) {
  // Apply rate limiting before processing
  const identifier = getClientIdentifier(request)
  const rateLimitResult = rateLimit(
    identifier,
    REGISTER_RATE_LIMIT,
    REGISTER_WINDOW_MS
  )

  // Create headers with rate limit information
  const rateLimitHeaders = createRateLimitHeaders(
    rateLimitResult.limit,
    rateLimitResult.remaining,
    rateLimitResult.resetAt
  )

  if (!rateLimitResult.allowed) {
    console.warn(
      `Rate limit exceeded for register from ${identifier} at ${new Date().toISOString()}`
    )
    return NextResponse.json(
      {
        success: false,
        error: '注册请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    )
  }

  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // Check if username already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, validated.username))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    const passwordHash = await hashPassword(validated.password)

    const [user] = await db
      .insert(users)
      .values({
        username: validated.username,
        passwordHash,
        name: validated.name,
        role: 'user',
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201, headers: rateLimitHeaders }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    return NextResponse.json(
      { success: false, error: '注册失败' },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
