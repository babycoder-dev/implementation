import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { pdfValidator, PdfValidationResult } from '../../../../lib/learning/pdf-validator';
import { detectSuspiciousActivity, Context } from '../../../../lib/learning/suspicious-detector';

interface LearningLogRow {
  id: string;
  user_id: string;
  file_id: string;
  page_num: number;
  timestamp: Date | string;
  action_type: string;
}

interface CreateLogRequest {
  fileId: string;
  action: string;
  pageNum?: number;
  duration?: number;
  /** Video-specific fields */
  isMuted?: boolean;
  playbackRate?: number;
  /** Visibility state for suspicious detection */
  isHidden?: boolean;
  /** Time gap for suspicious detection */
  timeGap?: number;
}

// GET /api/learning/log - Get learning logs for a file
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: '缺少 fileId 参数' },
        { status: 400 }
      );
    }

    const logs = await sql<LearningLogRow[]>`
      SELECT * FROM learning_logs
      WHERE user_id = ${currentUser.userId}
        AND file_id = ${fileId}
      ORDER BY timestamp ASC
    `;

    // Get PDF validation result if requested
    const includeValidation = searchParams.get('includeValidation') === 'true';
    let validationResult: PdfValidationResult | null = null;

    if (includeValidation) {
      validationResult = await pdfValidator.validate(fileId, currentUser.userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          userId: log.user_id,
          fileId: log.file_id,
          pageNum: log.page_num,
          timestamp: log.timestamp,
          actionType: log.action_type,
        })),
        validation: validationResult,
      },
    });
  } catch (error) {
    console.error('Get learning logs error:', error);
    return NextResponse.json(
      { success: false, error: '获取学习日志失败' },
      { status: 500 }
    );
  }
}

// POST /api/learning/log - Create a new learning log entry
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const body: CreateLogRequest = await request.json();
    const { fileId, action, pageNum, isMuted, playbackRate, isHidden, timeGap } = body;

    if (!fileId || !action) {
      return NextResponse.json(
        { success: false, error: '缺少 fileId 或 action 参数' },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = ['open', 'page_turn', 'stay', 'finish', 'close'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: '无效的 action 类型' },
        { status: 400 }
      );
    }

    const userId = currentUser.userId;

    // Handle 'finish' action - perform PDF learning validation
    let validationResult: PdfValidationResult | null = null;
    if (action === 'finish') {
      validationResult = await pdfValidator.validate(fileId, userId);
    }

    // Detect suspicious activities
    const suspiciousContext: Context = {
      userId,
      fileId,
      isHidden,
      isMuted,
      playbackRate,
      timeGap,
      timestamp: new Date(),
    };

    const suspiciousActivities = detectSuspiciousActivity(suspiciousContext);

    // Insert suspicious activities to database
    if (suspiciousActivities.length > 0) {
      for (const activity of suspiciousActivities) {
        await sql`
          INSERT INTO suspicious_activities (user_id, file_id, activity_type, reason, evidence, created_at)
          VALUES (${activity.user_id}, ${activity.file_id || null}, ${activity.activity_type}, ${activity.reason}, ${JSON.stringify(activity.evidence || {})}, ${activity.created_at})
        `;
      }
    }

    // Create the learning log entry
    const logResult = await sql<LearningLogRow[]>`
      INSERT INTO learning_logs (user_id, file_id, page_num, action_type)
      VALUES (${userId}, ${fileId}, ${pageNum || 1}, ${action})
      RETURNING *
    `;
    const log = logResult[0];

    return NextResponse.json({
      success: true,
      data: {
        id: log.id,
        userId: log.user_id,
        fileId: log.file_id,
        pageNum: log.page_num,
        timestamp: log.timestamp,
        actionType: log.action_type,
        validation: validationResult,
      },
      validation: validationResult,
      suspiciousActivities: suspiciousActivities.map((a) => ({
        activityType: a.activity_type,
        reason: a.reason,
      })),
    });
  } catch (error) {
    console.error('Create learning log error:', error);
    return NextResponse.json(
      { success: false, error: '创建学习日志失败' },
      { status: 500 }
    );
  }
}
