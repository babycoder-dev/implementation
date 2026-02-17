import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { departments, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, count } from 'drizzle-orm'
import { z } from 'zod'

// Validation schemas
const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

// GET /api/admin/departments - 获取部门列表
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

    // Get departments with user count
    const allDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        createdAt: departments.createdAt,
        userCount: count(users.id),
      })
      .from(departments)
      .leftJoin(users, eq(users.departmentId, departments.id))
      .groupBy(departments.id, departments.name, departments.description, departments.createdAt)
      .orderBy(departments.name)

    return NextResponse.json({
      success: true,
      data: allDepartments.map(d => ({
        ...d,
        userCount: d.userCount || 0,
      })),
    })
  } catch (error) {
    console.error('Failed to get departments:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { success: false, error: '获取部门列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/admin/departments - 创建部门
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
    const validated = createDepartmentSchema.parse(body)

    // Check if name already exists
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.name, validated.name))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { success: false, error: '部门名称已存在' },
        { status: 409 }
      )
    }

    const [newDepartment] = await db
      .insert(departments)
      .values({
        name: validated.name,
        description: validated.description,
      })
      .returning({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        createdAt: departments.createdAt,
      })

    return NextResponse.json({
      success: true,
      data: newDepartment,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues?.[0]?.message || '数据验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
    console.error('Failed to create department:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { success: false, error: '创建部门失败' },
      { status: 500 }
    )
  }
}
