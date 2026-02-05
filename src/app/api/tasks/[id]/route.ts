import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskFiles, taskAssignments, quizQuestions, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for task update
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId } = await params

  try {
    // Get current user to check role
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 })
    }

    // Check access permissions
    // Admin can access all tasks, regular users can only access assigned tasks
    if (currentUser.role !== 'admin') {
      const [assignment] = await db
        .select()
        .from(taskAssignments)
        .where(
          and(
            eq(taskAssignments.taskId, taskId),
            eq(taskAssignments.userId, auth.userId)
          )
        )
        .limit(1)

      if (!assignment) {
        return NextResponse.json({ success: false, error: '无权访问此任务' }, { status: 403 })
      }
    }

    // Get task files
    const files = await db
      .select({
        id: taskFiles.id,
        title: taskFiles.title,
        fileUrl: taskFiles.fileUrl,
        fileType: taskFiles.fileType,
        fileSize: taskFiles.fileSize,
        order: taskFiles.order,
      })
      .from(taskFiles)
      .where(eq(taskFiles.taskId, taskId))
      .orderBy(taskFiles.order)

    // Get quiz questions (without correct answers for security)
    const questions = await db
      .select({
        id: quizQuestions.id,
        question: quizQuestions.question,
        options: quizQuestions.options,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.taskId, taskId))

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
      },
      files,
      questions,
    })
  } catch (error) {
    console.error('Failed to fetch task:', error)
    return NextResponse.json({ success: false, error: '获取任务失败' }, { status: 500 })
  }
}

// PUT /api/tasks/:id - 更新任务
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId } = await params

  try {
    // Check if task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      )
    }

    // Check admin permission
    if (task.createdBy !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '无权修改此任务' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateTaskSchema.parse(body)

    const updateData: Partial<typeof tasks.$inferInsert> = {}
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.deadline !== undefined) {
      updateData.deadline = new Date(validated.deadline)
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning()

    return NextResponse.json({
      success: true,
      data: updatedTask,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues?.[0]?.message || '数据验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { success: false, error: '更新任务失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/:id - 删除任务
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const { id: taskId } = await params

  try {
    // Check if task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      )
    }

    // Check admin permission
    if (task.createdBy !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '无权删除此任务' },
        { status: 403 }
      )
    }

    await db.delete(tasks).where(eq(tasks.id, taskId))

    return NextResponse.json({
      success: true,
      message: '任务已删除',
    })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    )
  }
}
