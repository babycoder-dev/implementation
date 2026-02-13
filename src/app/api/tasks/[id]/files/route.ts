import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Task file database row
interface TaskFileRow {
  id: string;
  task_id: string;
  title: string;
  file_url: string;
  original_url: string | null;
  file_type: string;
  file_size: number;
  duration: number | null;
  required_completion: string;
  order: number;
  converted: boolean;
  created_at: string;
}

// Task file response type
interface TaskFile {
  id: string;
  taskId: string;
  title: string;
  fileUrl: string;
  originalUrl: string | null;
  fileType: string;
  fileSize: number;
  duration: number | null;
  requiredCompletion: string;
  order: number;
  converted: boolean;
  createdAt: string;
}

// Validation schema for creating a file
const createFileSchema = z.object({
  title: z.string().min(1, '文件标题不能为空').max(255, '文件标题过长'),
  fileUrl: z.string().url('无效的文件URL'),
  originalUrl: z.string().url('无效的原始文件URL').optional().nullable(),
  fileType: z.string().min(1, '文件类型不能为空'),
  fileSize: z.number().int().min(0).optional().default(0),
  duration: z.number().int().min(0).optional().nullable(),
  required_completion: z.string().optional().default('optional'),
});

// GET /api/tasks/[id]/files - Get all files for a task
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
    const taskResult = await sql<{ id: string }[]>`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Get files for the task, ordered by order field
    const result = await sql<TaskFileRow[]>`
      SELECT id, task_id, title, file_url, original_url, file_type, file_size,
             duration, required_completion, "order", converted, created_at
      FROM task_files
      WHERE task_id = ${taskId}
      ORDER BY "order" ASC
    `;

    const files: TaskFile[] = result.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      fileUrl: row.file_url,
      originalUrl: row.original_url,
      fileType: row.file_type,
      fileSize: row.file_size,
      duration: row.duration,
      requiredCompletion: row.required_completion,
      order: row.order,
      converted: row.converted,
      createdAt: row.created_at,
    }));

    return successResponse(files);
  } catch (error) {
    console.error('Get task files error:', error);
    return errorResponse('获取任务文件列表失败', 500);
  }
}

// POST /api/tasks/[id]/files - Add a file to a task (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限添加文件', 403);
    }

    const { id: taskId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = createFileSchema.parse(body);

    // Verify task exists
    const taskResult = await sql<{ id: string }[]>`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Get max order and add 1
    const maxOrderResult = await sql<{ next_order: number }[]>`
      SELECT COALESCE(MAX("order"), 0) + 1 as next_order
      FROM task_files
      WHERE task_id = ${taskId}
    `;

    const nextOrder = maxOrderResult[0].next_order;

    // Insert new file
    const result = await sql<TaskFileRow[]>`
      INSERT INTO task_files (
        task_id, title, file_url, original_url, file_type, file_size,
        duration, required_completion, "order"
      ) VALUES (
        ${taskId}, ${validatedData.title}, ${validatedData.fileUrl},
        ${validatedData.originalUrl || null}, ${validatedData.fileType},
        ${validatedData.fileSize}, ${validatedData.duration || null},
        ${validatedData.required_completion}, ${nextOrder}
      )
      RETURNING id, task_id, title, file_url, original_url, file_type,
                file_size, duration, required_completion, "order", converted, created_at
    `;

    const row = result[0];
    const file: TaskFile = {
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      fileUrl: row.file_url,
      originalUrl: row.original_url,
      fileType: row.file_type,
      fileSize: row.file_size,
      duration: row.duration,
      requiredCompletion: row.required_completion,
      order: row.order,
      converted: row.converted,
      createdAt: row.created_at,
    };

    return successResponse(file, { message: '文件添加成功' }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Add task file error:', error);
    return errorResponse('添加文件失败', 500);
  }
}
