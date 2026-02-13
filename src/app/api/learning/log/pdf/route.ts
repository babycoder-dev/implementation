import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema for PDF learning log
const pdfLogSchema = z.object({
  fileId: z.string().uuid('无效的文件ID'),
  taskId: z.string().uuid('无效的任务ID'),
  pageNum: z.number().int().min(1, '页码必须大于0').optional().default(1),
  scrollPosition: z.number().min(0).max(1).optional().default(0),
  actionType: z.enum(['page_change', 'scroll', 'open', 'close']).optional().default('page_change'),
  sessionDuration: z.number().int().min(0).optional().default(0),
});

// Database row types
interface TaskFileRow {
  id: string;
  task_id: string;
  file_type: string;
  total_pages: number | null;
}

interface FileProgressRow {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  current_page: number;
  total_pages: number;
  progress: number;
  effective_time: number;
  completed_at: string | null;
}

// POST /api/learning/log/pdf - Record PDF learning log (SRS-03)
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const body = await request.json();
    const validatedData = pdfLogSchema.parse(body);
    const { fileId, taskId, pageNum, scrollPosition, actionType, sessionDuration } = validatedData;

    // Verify task exists and is published
    const taskResult = await sql<{ id: string; status: string }[]>`
      SELECT id, status FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    if (taskResult[0].status !== 'published') {
      return errorResponse('任务未发布', 403);
    }

    // Verify file belongs to task
    const fileResult = await sql<TaskFileRow[]>`
      SELECT id, task_id, file_type, total_pages
      FROM task_files WHERE id = ${fileId} AND task_id = ${taskId}
    `;

    if (fileResult.length === 0) {
      return errorResponse('文件不存在', 404);
    }

    const file = fileResult[0];
    const totalPages = file.total_pages || 0;

    // Calculate progress percentage
    const progressPercent = totalPages > 0 ? Math.min((pageNum / totalPages) * 100, 100) : 0;

    // Check if already completed (PDF: current_page >= total_pages)
    const isCompleted = pageNum >= totalPages && totalPages > 0;

    // Upsert file progress
    const progressResult = await sql<FileProgressRow[]>`
      INSERT INTO file_progress (user_id, file_id, task_id, current_page, total_pages, scroll_position, progress, effective_time, started_at, last_accessed, completed_at)
      VALUES (
        ${currentUser.userId}, ${fileId}, ${taskId},
        ${pageNum}, ${totalPages}, ${scrollPosition},
        ${progressPercent}, ${sessionDuration},
        COALESCE((SELECT started_at FROM file_progress WHERE user_id = ${currentUser.userId} AND file_id = ${fileId}), NOW()),
        NOW(),
        COALESCE((SELECT completed_at FROM file_progress WHERE user_id = ${currentUser.userId} AND file_id = ${fileId}),
          ${isCompleted ? 'NOW()' : null})
      )
      ON CONFLICT (user_id, file_id)
      DO UPDATE SET
        current_page = EXCLUDED.current_page,
        total_pages = EXCLUDED.total_pages,
        scroll_position = EXCLUDED.scroll_position,
        progress = EXCLUDED.progress,
        effective_time = file_progress.effective_time + EXCLUDED.effective_time,
        last_accessed = NOW(),
        completed_at = CASE
          WHEN file_progress.completed_at IS NOT NULL THEN file_progress.completed_at
          WHEN EXCLUDED.completed_at IS NOT NULL THEN EXCLUDED.completed_at
          ELSE NULL
        END
      RETURNING *
    `;

    const progress = progressResult[0];

    // Insert learning log
    await sql`
      INSERT INTO learning_logs (user_id, file_id, task_id, log_type, page_num, action, session_duration, is_active_session, created_at)
      VALUES (${currentUser.userId}, ${fileId}, ${taskId}, 'pdf', ${pageNum}, ${actionType}, ${sessionDuration}, true, NOW())
    `;

    const response = {
      current_page: progress.current_page,
      total_pages: progress.total_pages,
      progress_percent: Number(progress.progress),
      effective_time: progress.effective_time,
      is_completed: progress.completed_at !== null,
    };

    return successResponse(response, { message: 'PDF学习记录成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('PDF learning log error:', error);
    return errorResponse('记录PDF学习失败', 500);
  }
}
