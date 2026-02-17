import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { departments, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const uuidSchema = z.string().uuid('无效的部门ID格式')

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
  message: '至少需要提供 name 或 description 字段'
})

// PUT /api/admin/departments/[id] - 更新部门
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validate UUID format
  const idValidation = uuidSchema.safeParse(id)
  if (!idValidation.success) {
    return NextResponse.json(
      { success: false, error: '无效的部门ID' },
      { status: 400 }
    )
  }

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

    // Check if admin is in this department
    if (currentUser.departmentId === id) {
      return NextResponse.json(
        { success: false, error: '不能删除自己所在的部门' },
        { status: 400 }
      )
    }

    // Check if department exists
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '部门不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = updateDepartmentSchema.parse(body)

    // Check if new name already exists (if name is being changed)
    if (validated.name && validated.name !== existing.name) {
      const [duplicate] = await db
        .select()
        .from(departments)
        .where(eq(departments.name, validated.name))
        .limit(1)

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: '部门名称已存在' },
          { status: 409 }
        )
      }
    }

    const [updated] = await db
      .update(departments)
      .set({
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
      })
      .where(eq(departments.id, id))
      .returning({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        createdAt: departments.createdAt,
      })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues?.[0]?.message || '数据验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
    console.error('Failed to update department:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { success: false, error: '更新部门失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/departments/[id] - 删除部门
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validate UUID format
  const idValidation = uuidSchema.safeParse(id)
  if (!idValidation.success) {
    return NextResponse.json(
      { success: false, error: '无效的部门ID' },
      { status: 400 }
    )
  }

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

    // Check if admin is in this department
    if (currentUser.departmentId === id) {
      return NextResponse.json(
        { success: false, error: '不能删除自己所在的部门' },
        { status: 400 }
      )
    }

    // Check if department exists
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '部门不存在' },
        { status: 404 }
      )
    }

    // Check if department has users
    const [userInDept] = await db
      .select()
      .from(users)
      .where(eq(users.departmentId, id))
      .limit(1)

    if (userInDept) {
      return NextResponse.json(
        { success: false, error: '该部门下仍有用户，无法删除' },
        { status: 400 }
      )
    }

    await db
      .delete(departments)
      .where(eq(departments.id, id))

    return NextResponse.json({
      success: true,
      data: { message: '部门已删除' },
    })
  } catch (error) {
    console.error('Failed to delete department:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { success: false, error: '删除部门失败' },
      { status: 500 }
    )
  }
}
