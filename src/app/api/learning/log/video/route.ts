import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema for video learning log
const videoLogSchema = z.object({
  fileId: z.string().uuid('无效的文件ID'),
  taskId: z.string().uuid('无效的任务ID'),
  currentTime: z.number().int().min(0, '当前时间不能为负数'),
  duration: z.number().int().min(0, '视频时长不能为负数'),
  action: z.enum(['time_update', 'play', 'pause', 'seek', 'ended']).optional().default('time_update'),
  playbackRate: z.number().min(0.5).max(2).optional().default(1),
  isMuted: z.boolean().optional().default(false),
  sessionDuration: z.number().int().min(0).optional().default(0),
});

// Database row types
interface TaskFileRow {
  id: string;
  task_id: string;
  file_type: string;
  duration: number | null;
}

interface FileProgressRow {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  current_time: number;
  duration: number;
  progress: number;
  effective_time: number;
  completed_at: string | null;
}

// POST /api/learning/log/video - Record video learning log (SRS-03)
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const body = await request.json();
    const validatedData = videoLogSchema.parse(body);
    const { fileId, taskId, currentTime, duration, action, playbackRate, isMuted, sessionDuration } = validatedData;

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
      SELECT id, task_id, file_type, duration
      FROM task_files WHERE id = ${fileId} AND task_id = ${taskId}
    `;

    if (fileResult.length === 0) {
      return errorResponse('文件不存在', 404);
    }

    const file = fileResult[0];
    const videoDuration = duration || file.duration || 0;

    // Calculate progress percentage (video: current_time >= duration * 0.95)
    const progressPercent = videoDuration > 0 ? Math.min((currentTime / videoDuration) * 100, 100) : 0;

    // Check if completed (watched 95% or more)
    const isCompleted = videoDuration > 0 && currentTime >= videoDuration * 0.95;

    // Upsert file progress
    const progressResult = await sql<FileProgressRow[]>`
      INSERT INTO file_progress (user_id, file_id, task_id, current_time, duration, progress, effective_time, started_at, last_accessed, completed_at)
      VALUES (
        ${currentUser.userId}, ${fileId}, ${taskId},
        ${currentTime}, ${videoDuration},
        ${progressPercent}, ${sessionDuration},
        COALESCE((SELECT started_at FROM file_progress WHERE user_id = ${currentUser.userId} AND file_id = ${fileId}), NOW()),
        NOW(),
        COALESCE((SELECT completed_at FROM file_progress WHERE user_id = ${currentUser.userId} AND file_id = ${fileId}),
          ${isCompleted ? 'NOW()' : null})
      )
      ON CONFLICT (user_id, file_id)
      DO UPDATE SET
        current_time = EXCLUDED.current_time,
        duration = COALESCE(EXCLUDED.duration, file_progress.duration),
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
      INSERT INTO learning_logs (user_id, file_id, task_id, log_type, current_time, action, session_duration, is_active_session, created_at)
      VALUES (${currentUser.userId}, ${fileId}, ${taskId}, 'video', ${currentTime}, ${action}, ${sessionDuration}, true, NOW())
    `;

    const response = {
      current_time: progress.current_time,
      duration: progress.duration,
      progress_percent: Number(progress.progress),
      effective_time: progress.effective_time,
      is_completed: progress.completed_at !== null,
    };

    return successResponse(response, { message: '视频学习记录成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Video learning log error:', error);
    return errorResponse('记录视频学习失败', 500);
  }
}
