import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Validation schema for user update
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(6).optional(),
})

// GET /api/admin/users/:id - 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/:id - 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check if user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = updateUserSchema.parse(body)

    // Check if username is being changed and if it conflicts
    if (validated.username && validated.username !== targetUser.username) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, validated.username))
        .limit(1)

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: '用户名已存在' },
          { status: 409 }
        )
      }
    }

    // Prevent changing your own role
    if (id === auth.userId && validated.role && validated.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '不能撤销自己的管理员权限' },
        { status: 400 }
      )
    }

    const updateData: Partial<typeof users.$inferInsert> = {}

    if (validated.username !== undefined) updateData.username = validated.username
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.role !== undefined) updateData.role = validated.role
    if (validated.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(validated.password, 10)
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })

    return NextResponse.json({
      success: true,
      data: updatedUser,
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
      { success: false, error: '更新用户失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/:id - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Cannot delete yourself
    if (id === auth.userId) {
      return NextResponse.json(
        { success: false, error: '不能删除自己的账号' },
        { status: 400 }
      )
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    await db.delete(users).where(eq(users.id, id))

    return NextResponse.json({
      success: true,
      message: '用户已删除',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    )
  }
}
