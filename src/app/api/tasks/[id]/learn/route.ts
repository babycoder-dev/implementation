import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// Database row types
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  passing_score: number | null;
  strict_mode: boolean;
  enable_quiz: boolean;
  created_at: string;
}

interface TaskFileRow {
  id: string;
  task_id: string;
  title: string;
  file_url: string;
  original_url: string | null;
  file_type: string;
  file_size: number;
  duration: number | null;
  total_pages: number | null;
  "order": number;
  converted: boolean;
}

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

interface AssignmentRow {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  submitted_at: string | null;
  is_completed: boolean;
}

interface QuizSubmissionRow {
  id: string;
  task_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  total_questions: number;
  submitted_at: string;
}

// Response types based on SRS-03
interface FileProgress {
  current_page?: number;
  current_time?: number;
  progress_percent: number;
  effective_time: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface TaskFile {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  duration: number | null;
  total_pages: number | null;
  progress: FileProgress;
}

interface QuizInfo {
  enabled: boolean;
  completed: boolean;
  passed: boolean | null;
}

// GET /api/tasks/[id]/learn - Get task learning details (SRS-03)
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
    const taskResult = await sql<TaskRow[]>`
      SELECT id, title, description, deadline, status, passing_score, strict_mode, enable_quiz, created_at
      FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    // Only allow viewing published tasks
    if (task.status !== 'published') {
      return errorResponse('任务未发布', 403);
    }

    // Get task files with progress
    const filesResult = await sql<TaskFileRow[]>`
      SELECT id, task_id, title, file_url, original_url, file_type, file_size, duration, total_pages, "order", converted
      FROM task_files WHERE task_id = ${taskId} ORDER BY "order" ASC
    `;

    // Get user's assignment
    const assignmentResult = await sql<AssignmentRow[]>`
      SELECT id, task_id, user_id, assigned_at, submitted_at, is_completed
      FROM task_assignments WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
    `;

    // Get user's file progress
    const fileIds = filesResult.map(f => f.id);
    let progressResult: FileProgressRow[] = [];

    if (fileIds.length > 0) {
      progressResult = await sql<FileProgressRow[]>`
        SELECT fp.* FROM file_progress fp
        WHERE fp.user_id = ${currentUser.userId} AND fp.file_id IN ${sql(fileIds)}
      `;
    }

    // Create progress map
    const progressMap = new Map(progressResult.map(p => [p.file_id, p]));

    // Build files array with progress
    const files: TaskFile[] = filesResult.map(file => {
      const progress = progressMap.get(file.id);
      const fileType = file.file_type as 'pdf' | 'video' | 'office';

      let fileProgress: FileProgress;

      if (!progress) {
        // No progress yet
        fileProgress = {
          progress_percent: 0,
          effective_time: 0,
          is_completed: false,
          completed_at: null,
        };
      } else {
        fileProgress = {
          current_page: fileType === 'pdf' ? progress.current_page : undefined,
          current_time: fileType === 'video' ? progress.current_time : undefined,
          progress_percent: Number(progress.progress),
          effective_time: progress.effective_time,
          is_completed: progress.completed_at !== null,
          completed_at: progress.completed_at,
        };
      }

      return {
        id: file.id,
        title: file.title,
        file_type: file.file_type,
        file_size: file.file_size,
        duration: file.duration,
        total_pages: file.total_pages,
        progress: fileProgress,
      };
    });

    // Get quiz info
    let quizInfo: QuizInfo = {
      enabled: task.enable_quiz,
      completed: false,
      passed: null,
    };

    if (task.enable_quiz) {
      const quizSubmission = await sql<QuizSubmissionRow[]>`
        SELECT id, task_id, user_id, score, passed, total_questions, submitted_at
        FROM quiz_submissions
        WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
        ORDER BY submitted_at DESC LIMIT 1
      `;

      if (quizSubmission.length > 0) {
        quizInfo = {
          enabled: true,
          completed: true,
          passed: quizSubmission[0].passed,
        };
      }
    }

    // Build response
    const response = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
      },
      files,
      assignment: assignmentResult.length > 0 ? {
        is_completed: assignmentResult[0].is_completed,
        submitted_at: assignmentResult[0].submitted_at,
      } : {
        is_completed: false,
        submitted_at: null,
      },
      quiz: quizInfo,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Get task learning details error:', error);
    return errorResponse('获取学习详情失败', 500);
  }
}
