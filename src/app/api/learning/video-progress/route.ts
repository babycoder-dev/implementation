import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

interface VideoProgressRow {
  id: string;
  user_id: string;
  file_id: string;
  current_time: number;
  duration: number;
  last_updated: string;
}

interface VideoProgressResponse {
  id: string;
  userId: string;
  fileId: string;
  currentTime: number;
  duration: number;
  lastUpdated: string;
}

// POST /api/learning/video-progress - Update video progress
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { fileId, currentTime, duration } = await request.json();

    if (!fileId || typeof currentTime !== 'number') {
      return errorResponse('文件ID和当前时间不能为空', 400);
    }

    const db = sql;

    // Upsert video progress
    const result = await db`
      INSERT INTO video_progress (user_id, file_id, current_time, duration, last_updated)
      VALUES (${currentUser.userId}, ${fileId}, ${currentTime}, ${duration || 0}, NOW())
      ON CONFLICT (user_id, file_id)
      DO UPDATE SET
        current_time = EXCLUDED.current_time,
        duration = COALESCE(EXCLUDED.duration, video_progress.duration),
        last_updated = NOW()
      RETURNING *
    ` as VideoProgressRow[];

    const progress: VideoProgressResponse = {
      id: result[0].id,
      userId: result[0].user_id,
      fileId: result[0].file_id,
      currentTime: result[0].current_time,
      duration: result[0].duration,
      lastUpdated: result[0].last_updated,
    };

    return successResponse(progress, { message: '进度更新成功' });
  } catch (error) {
    console.error('Update video progress error:', error);
    return errorResponse('更新视频进度失败', 500);
  }
}

// GET /api/learning/video-progress - Get video progress for a user
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');

    const db = sql;

    const progress = await db`
      SELECT *
      FROM video_progress
      WHERE user_id = ${currentUser.userId}
      ${fileId ? db`AND file_id = ${fileId}` : db``}
    ` as VideoProgressRow[];

    const progressList: VideoProgressResponse[] = progress.map((row) => ({
      id: row.id,
      userId: row.user_id,
      fileId: row.file_id,
      currentTime: row.current_time,
      duration: row.duration,
      lastUpdated: row.last_updated,
    }));

    return successResponse(progressList);
  } catch (error) {
    console.error('Get video progress error:', error);
    return errorResponse('获取视频进度失败', 500);
  }
}
