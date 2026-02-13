import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schemas
const addAssignmentSchema = z.object({
  assignment_type: z.enum(['department', 'user']),
  ids: z.array(z.string().uuid('无效的ID格式')).min(1, 'ID列表不能为空'),
});

const removeAssignmentSchema = z.object({
  user_ids: z.array(z.string().uuid('无效的用户ID格式')).min(1, '用户ID列表不能为空'),
});

// Database row types
interface TaskAssignmentRow {
  id: string;
  task_id: string;
  user_id: string;
  assignment_type: string;
  assigned_by: string | null;
  assigned_at: string;
  submitted_at: string | null;
  is_completed: boolean;
  username: string | null;
  name: string | null;
  department_name: string | null;
}

// Response types
interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  departmentName: string | null;
  assignedAt: string;
  isCompleted: boolean;
}

// GET /api/tasks/[id]/assignments - Get assignments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id: taskId } = await params;

    // Verify task exists
    const taskResult = await sql`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Get task assignments with user and department info
    const result = await sql<TaskAssignmentRow[]>`
      SELECT ta.id, ta.task_id, ta.user_id, ta.assignment_type, ta.assigned_by,
             ta.assigned_at, ta.submitted_at, ta.is_completed,
             u.username, u.name, d.name as department_name
      FROM task_assignments ta
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ta.task_id = ${taskId}
      ORDER BY ta.assigned_at DESC
    `;

    const assignments: TaskAssignment[] = result.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      userName: row.name,
      departmentName: row.department_name,
      assignedAt: row.assigned_at,
      isCompleted: row.is_completed,
    }));

    // Get the assignment_type from the first assignment or default to 'user'
    const assignmentType = result.length > 0 ? result[0].assignment_type : 'user';

    return successResponse({
      assignment_type: assignmentType,
      assignments,
    });
  } catch (error) {
    console.error('Get task assignments error:', error);
    return errorResponse('获取任务分配列表失败', 500);
  }
}

// POST /api/tasks/[id]/assignments - Add assignments (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限分配任务', 403);
    }

    const { id: taskId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = addAssignmentSchema.parse(body);
    const { assignment_type, ids } = validatedData;

    // Verify task exists
    const taskResult = await sql`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    let userIdsToAssign: string[] = [];

    if (assignment_type === 'department') {
      // Find all users in the specified departments
      const departmentIds = ids;
      const usersInDepartments = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE department_id IN ${sql(departmentIds)}
      `;
      userIdsToAssign = usersInDepartments.map(u => u.id);
    } else {
      // Direct user assignment
      userIdsToAssign = ids;
    }

    if (userIdsToAssign.length === 0) {
      return errorResponse('没有可分配的用户', 400);
    }

    // Get existing assignments
    const existingAssignments = await sql<{ user_id: string }[]>`
      SELECT user_id FROM task_assignments WHERE task_id = ${taskId}
    `;
    const existingUserIds = new Set(existingAssignments.map((a) => a.user_id));

    // Filter out already assigned users
    const newUserIds = userIdsToAssign.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return errorResponse('所选用户已被分配', 400);
    }

    // Create assignments (bulk insert using UNNEST)
    const assignments = await sql<TaskAssignmentRow[]>`
      INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
      SELECT ${taskId}, unnest(${newUserIds}), ${assignment_type}, ${currentUser.userId}
      ON CONFLICT (task_id, user_id) DO NOTHING
      RETURNING *
    `;

    // Fetch user and department info
    const usersResult = await sql<{ id: string; username: string; name: string; department_name: string | null }[]>`
      SELECT u.id, u.username, u.name, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id IN ${sql(newUserIds)}
    `;

    const userMap = new Map(usersResult.map((u) => [u.id, u]));

    const result: TaskAssignment[] = assignments.map((a) => ({
      id: a.id,
      taskId: a.task_id,
      userId: a.user_id,
      userName: userMap.get(a.user_id)?.name || null,
      departmentName: userMap.get(a.user_id)?.department_name || null,
      assignedAt: a.assigned_at,
      isCompleted: a.is_completed,
    }));

    return successResponse(result, { message: '任务分配成功' }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Create task assignment error:', error);
    return errorResponse('分配任务失败', 500);
  }
}

// DELETE /api/tasks/[id]/assignments - Remove assignments (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限取消分配', 403);
    }

    const { id: taskId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = removeAssignmentSchema.parse(body);
    const { user_ids } = validatedData;

    if (user_ids.length === 0) {
      return errorResponse('用户ID列表不能为空', 400);
    }

    // Verify task exists
    const taskResult = await sql`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Delete assignments (bulk delete using ANY)
    await sql`
      DELETE FROM task_assignments
      WHERE task_id = ${taskId} AND user_id = ANY(${user_ids})
    `;

    return successResponse({ removed: user_ids.length }, { message: '取消分配成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Delete task assignment error:', error);
    return errorResponse('取消分配失败', 500);
  }
}
