import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema for updating effective time
const updateTimeSchema = z.object({
  fileId: z.string().uuid('无效的文件ID'),
  sessionDuration: z.number().int().min(0, '时长不能为负数'),
  isActive: z.boolean().optional().default(true),
});

// Database row types
interface FileProgressRow {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  effective_time: number;
}

interface TaskFileRow {
  id: string;
  task_id: string;
}

// POST /api/learning/time - Update effective time (SRS-03)
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const body = await request.json();
    const validatedData = updateTimeSchema.parse(body);
    const { fileId, sessionDuration, isActive } = validatedData;

    // Only update if session is active
    if (!isActive) {
      return successResponse({ message: '非活跃时段不计入有效时间' });
    }

    // Verify file exists and get task_id
    const fileResult = await sql<TaskFileRow[]>`
      SELECT id, task_id FROM task_files WHERE id = ${fileId}
    `;

    if (fileResult.length === 0) {
      return errorResponse('文件不存在', 404);
    }

    const taskId = fileResult[0].task_id;

    // Try to update, if not exists then create new record
    const progressResult = await sql<FileProgressRow[]>`
      INSERT INTO file_progress (user_id, file_id, task_id, effective_time, started_at, last_accessed)
      VALUES (${currentUser.userId}, ${fileId}, ${taskId}, ${sessionDuration}, NOW(), NOW())
      ON CONFLICT (user_id, file_id)
      DO UPDATE SET
        effective_time = file_progress.effective_time + EXCLUDED.effective_time,
        last_accessed = NOW()
      RETURNING id, effective_time
    `;

    const response = {
      file_id: fileId,
      effective_time: progressResult[0].effective_time,
    };

    return successResponse(response, { message: '有效时长更新成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Update effective time error:', error);
    return errorResponse('更新有效时长失败', 500);
  }
}
