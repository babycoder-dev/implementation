import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/validations/auth'
import { rateLimit } from '@/lib/rate-limit'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'

const LOGIN_RATE_LIMIT = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from X-Forwarded-For header (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return `login:${forwardedFor.split(',')[0].trim()}`
  }

  // Fall back to X-Real-IP header
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return `login:${realIp}`
  }

  // Last resort: use a fallback identifier
  // In production, this should be replaced with proper IP detection
  return 'login:unknown'
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
    LOGIN_RATE_LIMIT,
    LOGIN_WINDOW_MS
  )

  // Create headers with rate limit information
  const rateLimitHeaders = createRateLimitHeaders(
    rateLimitResult.limit,
    rateLimitResult.remaining,
    rateLimitResult.resetAt
  )

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: '请求过于频繁，请稍后再试',
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
    const validated = loginSchema.parse(body)

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, validated.username))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401, headers: rateLimitHeaders }
      )
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401, headers: rateLimitHeaders }
      )
    }

    const token = await createSession(user.id)

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
      { headers: rateLimitHeaders }
    )

    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
