import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/learning_system';

function getDb() {
  return neon(databaseUrl);
}

interface VideoLogRow {
  id: string;
  user_id: string;
  file_id: string;
  timestamp: string;
  action: 'play' | 'pause' | 'seek' | 'speed_changed' | 'time_update' | 'finish';
  current_time: number;
  playback_speed: number | null;
}

interface VideoLogResponse {
  id: string;
  userId: string;
  fileId: string;
  timestamp: string;
  action: 'play' | 'pause' | 'seek' | 'speed_changed' | 'time_update' | 'finish';
  currentTime: number;
  playbackSpeed: number | null;
}

// POST /api/learning/video-logs - Log video activity
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { fileId, action, currentTime, playbackSpeed } = await request.json();

    if (!fileId || !action) {
      return errorResponse('文件ID和操作类型不能为空', 400);
    }

    const db = getDb();

    const result = await db`
      INSERT INTO video_logs (user_id, file_id, action, current_time, playback_speed)
      VALUES (${currentUser.userId}, ${fileId}, ${action}, ${currentTime || 0}, ${playbackSpeed || null})
      RETURNING *
    ` as VideoLogRow[];

    const log: VideoLogResponse = {
      id: result[0].id,
      userId: result[0].user_id,
      fileId: result[0].file_id,
      timestamp: result[0].timestamp,
      action: result[0].action,
      currentTime: result[0].current_time,
      playbackSpeed: result[0].playback_speed,
    };

    return successResponse(log, { message: '视频日志记录成功' }, 201);
  } catch (error) {
    console.error('Log video activity error:', error);
    return errorResponse('记录视频日志失败', 500);
  }
}

// GET /api/learning/video-logs - Get video logs for a user
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const db = getDb();

    const logs = await db`
      SELECT *
      FROM video_logs
      WHERE user_id = ${currentUser.userId}
      ${fileId ? db`AND file_id = ${fileId}` : db``}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    ` as VideoLogRow[];

    const result: VideoLogResponse[] = logs.map((row) => ({
      id: row.id,
      userId: row.user_id,
      fileId: row.file_id,
      timestamp: row.timestamp,
      action: row.action,
      currentTime: row.current_time,
      playbackSpeed: row.playback_speed,
    }));

    return successResponse(result);
  } catch (error) {
    console.error('Get video logs error:', error);
    return errorResponse('获取视频日志失败', 500);
  }
}
