import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

const TASK_STATUSES = ['draft', 'published', 'completed', 'archived'] as const;
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(255, '任务标题过长'),
  description: z.string().max(2000, '描述过长').optional().nullable(),
  deadline: z.string().datetime({ message: '无效的截止日期格式' }).optional().nullable(),
  passingScore: z.number().int().min(0).max(100).default(100),
  strictMode: z.boolean().default(true),
  enableQuiz: z.boolean().default(false),
  assignmentType: z.enum(['all', 'department', 'user']).default('all'),
  assignmentIds: z.array(z.string().uuid('无效的UUID格式')).max(1000, '分配用户过多').default([]),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(1000, '页码超出范围').default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE, `每页最多${MAX_PAGE_SIZE}条`).default(DEFAULT_PAGE_SIZE),
  status: z.string().refine((val) => TASK_STATUSES.includes(val as typeof TASK_STATUSES[number]), {
    message: '无效的任务状态',
  }).optional(),
  search: z.string().max(MAX_SEARCH_LENGTH, `搜索关键词最长${MAX_SEARCH_LENGTH}个字符`).optional(),
});

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: 'draft' | 'published' | 'completed' | 'archived';
  passing_score: number | null;
  strict_mode: boolean;
  enable_quiz: boolean;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  file_count: number;
  assignment_count: number;
}

interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: 'draft' | 'published' | 'completed' | 'archived';
  passing_score: number | null;
  strict_mode: boolean;
  enable_quiz: boolean;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  file_count: number;
  assignment_count: number;
}

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;

    // Validate pagination and filter parameters (convert null to undefined for Zod defaults)
    const validatedParams = paginationSchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const { page, limit, status, search } = validatedParams;
    const offset = (page - 1) * limit;

    const db = sql;

    // Check if search is provided (for ILIKE we need to use unsafe or build differently)
    const hasSearch = !!search;
    const hasStatus = !!status;

    // Extract common WHERE conditions for reuse
    const roleFilter = currentUser.role !== 'admin' ? db`t.status = 'published'` : db`1=1`;
    const statusFilter = hasStatus ? db`AND t.status = ${status}` : db``;
    const searchFilter = hasSearch ? db`AND t.title ILIKE ${'%' + search + '%'}` : db``;

    // Get total count
    const countResult = await db`
      SELECT COUNT(*) as count FROM tasks t
      WHERE ${roleFilter}
      ${statusFilter}
      ${searchFilter}
    ` as { count: string }[];
    const total = parseInt(countResult[0].count);

    // Get tasks with file_count and assignment_count via subqueries
    const result = await db`
      SELECT
        t.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM task_files WHERE task_id = t.id) as file_count,
        (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignment_count
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE ${roleFilter}
      ${statusFilter}
      ${searchFilter}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as TaskRow[];

    const tasks: TaskResponse[] = result.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      deadline: row.deadline,
      status: row.status,
      passing_score: row.passing_score,
      strict_mode: row.strict_mode,
      enable_quiz: row.enable_quiz,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      file_count: Number(row.file_count) || 0,
      assignment_count: Number(row.assignment_count) || 0,
    }));

    const totalPages = Math.ceil(total / limit);

    return successResponse(tasks, {
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Get tasks error:', error);
    return errorResponse('获取任务列表失败', 500);
  }
}

// POST /api/tasks - Create a new task (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限创建任务', 403);
    }

    // Validate request body using Zod
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    const db = sql;

    // Create the task
    const taskResult = await db`
      INSERT INTO tasks (title, description, deadline, passing_score, strict_mode, enable_quiz, created_by)
      VALUES (${validatedData.title}, ${validatedData.description ?? null}, ${validatedData.deadline ?? null}, ${validatedData.passingScore}, ${validatedData.strictMode}, ${validatedData.enableQuiz}, ${currentUser.userId})
      RETURNING *
    ` as unknown as TaskRow[];

    const task = taskResult[0];

    // Handle task assignment based on assignment_type
    let assignedUsers: string[] = [];

    if (validatedData.assignmentType === 'all') {
      // Assign to all active users
      const activeUsers = await db`
        SELECT id FROM users WHERE status = 'active'
      ` as { id: string }[];
      assignedUsers = activeUsers.map((u) => u.id);
    } else if (validatedData.assignmentType === 'department' && validatedData.assignmentIds.length > 0) {
      // Assign to users in specified departments
      const departmentUsers = await db`
        SELECT id FROM users WHERE department_id = ANY(${validatedData.assignmentIds}) AND status = 'active'
      ` as { id: string }[];
      assignedUsers = departmentUsers.map((u) => u.id);
    } else if (validatedData.assignmentType === 'user' && validatedData.assignmentIds.length > 0) {
      // Assign to specified users
      assignedUsers = validatedData.assignmentIds;
    }

    // Create task assignments using batch insert (fixes N+1 query issue)
    if (assignedUsers.length > 0) {
      // Batch insert using UNNEST for better performance
      await db`
        INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
        SELECT ${task.id}, unnest(${assignedUsers}), ${validatedData.assignmentType}, ${currentUser.userId}
        ON CONFLICT (task_id, user_id) DO NOTHING
      `;
    }

    // Get file_count and assignment_count
    const fileCountResult = await db`
      SELECT COUNT(*) as count FROM task_files WHERE task_id = ${task.id}
    ` as { count: string }[];
    const assignmentCountResult = await db`
      SELECT COUNT(*) as count FROM task_assignments WHERE task_id = ${task.id}
    ` as { count: string }[];

    const taskResponse: TaskResponse = {
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      status: task.status,
      passing_score: task.passing_score,
      strict_mode: task.strict_mode,
      enable_quiz: task.enable_quiz,
      created_by: task.created_by,
      created_by_name: task.created_by_name,
      created_at: task.created_at,
      file_count: parseInt(fileCountResult[0].count),
      assignment_count: parseInt(assignmentCountResult[0].count),
    };

    return successResponse(taskResponse, { message: '任务创建成功' }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Create task error:', error);
    return errorResponse('创建任务失败', 500);
  }
}
