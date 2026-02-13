import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  passing_score: number;
  created_at: string;
}

interface TaskFileRow {
  id: string;
  task_id: string;
  title: string;
  file_url: string;
  original_url: string | null;
  file_type: 'pdf' | 'video' | 'office';
  file_size: number;
  duration: number | null;
  order: number;
  converted: boolean;
}

interface AssignmentRow {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  completed_at: string | null;
}

interface LearningProgressRow {
  id: string;
  user_id: string;
  task_id: string;
  file_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  started_at: string | null;
  completed_at: string | null;
}

interface TaskDetailResponse {
  task: {
    id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    passingScore: number;
    createdAt: string;
  };
  files: Array<{
    id: string;
    taskId: string;
    title: string;
    fileUrl: string;
    originalUrl: string | null;
    fileType: 'pdf' | 'video' | 'office';
    fileSize: number;
    duration: number | null;
    order: number;
    converted: boolean;
  }>;
  assignment: {
    id: string;
    taskId: string;
    userId: string;
    assignedAt: string;
    completedAt: string | null;
  } | null;
  progress: Array<{
    id: string;
    userId: string;
    taskId: string;
    fileId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

// GET /api/tasks/[id]/learn - Get task learning details for current user
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

    // Get task details
    const taskResult = await sql<TaskRow[]>`SELECT * FROM tasks WHERE id = ${taskId}`;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    // Get task files
    const filesResult = await sql<TaskFileRow[]>`SELECT * FROM task_files WHERE task_id = ${taskId} ORDER BY "order" ASC`;

    // Get user's assignment for this task
    const assignmentResult = await sql<AssignmentRow[]>`SELECT * FROM task_assignments WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}`;

    // Get user's learning progress for all files in this task
    const progressResult = await sql<LearningProgressRow[]>`SELECT * FROM learning_progress WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}`;

    const response: TaskDetailResponse = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        passingScore: task.passing_score,
        createdAt: task.created_at,
      },
      files: filesResult.map(f => ({
        id: f.id,
        taskId: f.task_id,
        title: f.title,
        fileUrl: f.file_url,
        originalUrl: f.original_url,
        fileType: f.file_type,
        fileSize: f.file_size,
        duration: f.duration,
        order: f.order,
        converted: f.converted,
      })),
      assignment: assignmentResult.length > 0 ? {
        id: assignmentResult[0].id,
        taskId: assignmentResult[0].task_id,
        userId: assignmentResult[0].user_id,
        assignedAt: assignmentResult[0].assigned_at,
        completedAt: assignmentResult[0].completed_at,
      } : null,
      progress: progressResult.map(p => ({
        id: p.id,
        userId: p.user_id,
        taskId: p.task_id,
        fileId: p.file_id,
        status: p.status,
        progress: p.progress,
        startedAt: p.started_at,
        completedAt: p.completed_at,
      })),
    };

    return successResponse(response);
  } catch (error) {
    console.error('Get task learning details error:', error);
    return errorResponse('获取学习详情失败', 500);
  }
}
