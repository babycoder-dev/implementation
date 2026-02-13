import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// Database row types
interface FileProgressRow {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  current_page: number;
  total_pages: number;
  scroll_position: number;
  current_time: number;
  duration: number;
  progress: number;
  effective_time: number;
  started_at: string;
  completed_at: string | null;
  last_accessed: string;
}

interface TaskFileRow {
  id: string;
  file_type: string;
}

// GET /api/learning/progress/[fileId] - Get file learning progress (SRS-03)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { fileId } = await params;

    // Get file info
    const fileResult = await sql<TaskFileRow[]>`
      SELECT id, file_type FROM task_files WHERE id = ${fileId}
    `;

    if (fileResult.length === 0) {
      return errorResponse('文件不存在', 404);
    }

    const fileType = fileResult[0].file_type as 'pdf' | 'video' | 'office';

    // Get user's progress for this file
    const progressResult = await sql<FileProgressRow[]>`
      SELECT * FROM file_progress
      WHERE user_id = ${currentUser.userId} AND file_id = ${fileId}
    `;

    // Return empty progress if not exists
    if (progressResult.length === 0) {
      const response = {
        file_id: fileId,
        current_page: fileType === 'pdf' ? 0 : undefined,
        current_time: fileType === 'video' ? 0 : undefined,
        progress_percent: 0,
        effective_time: 0,
        is_completed: false,
        completed_at: null,
        started_at: null,
        last_accessed: null,
      };
      return successResponse(response);
    }

    const progress = progressResult[0];

    const response = {
      file_id: progress.file_id,
      current_page: fileType === 'pdf' ? progress.current_page : undefined,
      current_time: fileType === 'video' ? progress.current_time : undefined,
      progress_percent: Number(progress.progress),
      effective_time: progress.effective_time,
      is_completed: progress.completed_at !== null,
      completed_at: progress.completed_at,
      started_at: progress.started_at,
      last_accessed: progress.last_accessed,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Get file progress error:', error);
    return errorResponse('获取学习进度失败', 500);
  }
}
