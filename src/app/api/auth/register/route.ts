import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/validations/auth'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
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
        { status: 400 }
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
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: '注册失败' },
      { status: 500 }
    )
  }
}
