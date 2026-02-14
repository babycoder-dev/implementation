import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { videoValidator, VideoValidationResult } from '@/lib/learning/video-validator';

// Request body types
interface VideoProgressRequest {
  userId: string;
  videoId: string;
  action: 'play' | 'pause' | 'seek' | 'speed_changed' | 'time_update' | 'finish';
  currentTime: number;
  playbackSpeed?: number;
}

interface VideoFinishRequest {
  userId: string;
  videoId: string;
  finalTime: number;
}

// GET /api/learning/video/progress - Get video progress and validation status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const videoId = searchParams.get('videoId');

    if (!userId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'userId and videoId are required' },
        { status: 400 }
      );
    }

    const db = sql;

    // Get video progress
    const progressResult = await db`
      SELECT id, user_id, file_id, current_time, duration, last_updated
      FROM video_progress
      WHERE user_id = ${userId} AND file_id = ${videoId}
    ` as {
      id: string;
      user_id: string;
      file_id: string;
      current_time: number;
      duration: number;
      last_updated: Date;
    }[];

    // Get video info
    const videoInfoResult = await db`
      SELECT id, title, file_url, file_type, file_size
      FROM task_files
      WHERE id = ${videoId}
    ` as {
      id: string;
      title: string;
      file_url: string;
      file_type: string;
      file_size: number;
    }[];

    // Get recent logs for this video
    const logsResult = await db`
      SELECT id, action, current_time, playback_speed, timestamp
      FROM video_logs
      WHERE user_id = ${userId} AND file_id = ${videoId}
      ORDER BY timestamp DESC
      LIMIT 50
    ` as {
      id: string;
      action: string;
      current_time: number;
      playback_speed?: number;
      timestamp: Date;
    }[];

    // Get validation result
    const validationResult = await videoValidator.validate(userId, videoId);

    return NextResponse.json({
      success: true,
      data: {
        progress: progressResult.length > 0 ? {
          currentTime: progressResult[0].current_time,
          duration: progressResult[0].duration,
          lastUpdated: progressResult[0].last_updated,
        } : null,
        video: videoInfoResult.length > 0 ? {
          id: videoInfoResult[0].id,
          title: videoInfoResult[0].title,
          duration: videoInfoResult[0].file_size,
        } : null,
        logs: logsResult.map((log) => ({
          action: log.action,
          currentTime: log.current_time,
          playbackSpeed: log.playback_speed,
          timestamp: log.timestamp,
        })),
        validation: validationResult,
      },
    });
  } catch (error) {
    console.error('Get video progress error:', error);
    return NextResponse.json(
      { success: false, error: '获取视频进度失败' },
      { status: 500 }
    );
  }
}

// POST /api/learning/video/progress - Record video progress and events
export async function POST(request: NextRequest) {
  try {
    const body: VideoProgressRequest = await request.json();
    const { userId, videoId, action, currentTime, playbackSpeed } = body;

    if (!userId || !videoId || !action) {
      return NextResponse.json(
        { success: false, error: 'userId, videoId, and action are required' },
        { status: 400 }
      );
    }

    const db = sql;

    // Record the video log event
    const logResult = await db`
      INSERT INTO video_logs (user_id, file_id, action, current_time, playback_speed)
      VALUES (${userId}, ${videoId}, ${action}, ${currentTime}, ${playbackSpeed || null})
      RETURNING id, timestamp
    ` as { id: string; timestamp: Date }[];

    // Update video progress for play, seek, time_update actions
    if (['play', 'seek', 'time_update', 'finish'].includes(action)) {
      await db`
        INSERT INTO video_progress (user_id, file_id, current_time, duration, last_updated)
        VALUES (${userId}, ${videoId}, ${currentTime}, ${currentTime}, NOW())
        ON CONFLICT (user_id, file_id)
        DO UPDATE SET
          current_time = ${currentTime},
          last_updated = NOW()
      `;
    }

    // Handle pause events - count them for validation
    if (action === 'pause') {
      // Pause is already logged above, validation will be done on finish
      console.log(`Pause recorded for user ${userId}, video ${videoId}`);
    }

    // Handle speed changed events
    if (action === 'speed_changed' && playbackSpeed !== undefined) {
      console.log(`Speed changed to ${playbackSpeed}x for user ${userId}, video ${videoId}`);
    }

    // Handle finish event - perform validation
    let validationResult: VideoValidationResult | null = null;
    if (action === 'finish') {
      validationResult = await videoValidator.validate(userId, videoId);

      console.log(`Video finished for user ${userId}, video ${videoId}`);
      console.log(`Validation result:`, validationResult);
    }

    return NextResponse.json({
      success: true,
      data: {
        logId: logResult[0].id,
        timestamp: logResult[0].timestamp,
        validation: validationResult,
      },
    });
  } catch (error) {
    console.error('Record video progress error:', error);
    return NextResponse.json(
      { success: false, error: '记录视频进度失败' },
      { status: 500 }
    );
  }
}

// POST /api/learning/video/progress/finish - Handle video finish event with validation
export async function PUT(request: NextRequest) {
  try {
    const body: VideoFinishRequest = await request.json();
    const { userId, videoId, finalTime } = body;

    if (!userId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'userId and videoId are required' },
        { status: 400 }
      );
    }

    const db = sql;

    // Record finish event
    await db`
      INSERT INTO video_logs (user_id, file_id, action, current_time)
      VALUES (${userId}, ${videoId}, 'finish', ${finalTime})
    `;

    // Update final progress
    await db`
      UPDATE video_progress
      SET current_time = ${finalTime}, last_updated = NOW()
      WHERE user_id = ${userId} AND file_id = ${videoId}
    `;

    // Perform validation
    const validationResult = await videoValidator.validate(userId, videoId);

    // If validation passed, update task completion status
    if (validationResult.isValid) {
      // Get the task_id for this video file
      const taskResult = await db`
        SELECT task_id FROM task_files WHERE id = ${videoId}
      ` as { task_id: string }[];

      if (taskResult.length > 0) {
        const taskId = taskResult[0].task_id;

        // Update file learning status (implementation depends on your schema)
        // This is a placeholder for updating the task completion status
        console.log(`Video validation passed for user ${userId}, task ${taskId}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        userId,
        finalTime,
        validation: validationResult,
        message: validationResult.isValid
          ? '视频学习验证通过'
          : '视频学习验证未通过，请检查学习行为',
      },
    });
  } catch (error) {
    console.error('Video finish validation error:', error);
    return NextResponse.json(
      { success: false, error: '视频完成验证失败' },
      { status: 500 }
    );
  }
}
