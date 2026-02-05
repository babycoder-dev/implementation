import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Validation schemas
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(6).optional(),
})

// GET /api/admin/users - 获取所有用户列表
export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    // Check admin permission
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt)

    return NextResponse.json({
      success: true,
      data: allUsers,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - 创建用户（可选）
export async function POST(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    // Check admin permission
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, name, password, role = 'user' } = body

    if (!username || !name || !password) {
      return NextResponse.json(
        { success: false, error: '用户名、姓名和密码都是必填项' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        name,
        passwordHash,
        role,
      })
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })

    return NextResponse.json({
      success: true,
      data: newUser,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues?.[0]?.message || '数据验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: '创建用户失败' },
      { status: 500 }
    )
  }
}
