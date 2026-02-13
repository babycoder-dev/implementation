import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

interface PdfLogRow {
  id: string;
  user_id: string;
  file_id: string;
  page_num: number;
  action_type: string;
  duration: number;
  created_at: string;
}

interface PdfLogResponse {
  id: string;
  userId: string;
  fileId: string;
  pageNum: number;
  actionType: string;
  duration: number;
  createdAt: string;
}

// POST /api/learning/logs - Log PDF learning activity
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { fileId, pageNum, actionType, duration } = await request.json();

    if (!fileId || !actionType) {
      return errorResponse('文件ID和操作类型不能为空', 400);
    }

    const result = await sql`
      INSERT INTO learning_logs (user_id, file_id, page_num, action_type, duration)
      VALUES (${currentUser.userId}, ${fileId}, ${pageNum || 1}, ${actionType}, ${duration || 0})
      RETURNING *
    ` as PdfLogRow[];

    const log: PdfLogResponse = {
      id: result[0].id,
      userId: result[0].user_id,
      fileId: result[0].file_id,
      pageNum: result[0].page_num,
      actionType: result[0].action_type,
      duration: result[0].duration,
      createdAt: result[0].created_at,
    };

    return successResponse(log, { message: '学习日志记录成功' }, 201);
  } catch (error) {
    console.error('Log PDF activity error:', error);
    return errorResponse('记录学习日志失败', 500);
  }
}

// GET /api/learning/logs - Get learning logs for a user or file
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');

    const logs = await sql`
      SELECT *
      FROM learning_logs
      WHERE user_id = ${currentUser.userId}
      ${fileId ? sql`AND file_id = ${fileId}` : sql``}
      ORDER BY created_at DESC
    ` as PdfLogRow[];

    const result: PdfLogResponse[] = logs.map((row) => ({
      id: row.id,
      userId: row.user_id,
      fileId: row.file_id,
      pageNum: row.page_num,
      actionType: row.action_type,
      duration: row.duration,
      createdAt: row.created_at,
    }));

    return successResponse(result);
  } catch (error) {
    console.error('Get learning logs error:', error);
    return errorResponse('获取学习日志失败', 500);
  }
}
