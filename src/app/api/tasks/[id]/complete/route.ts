import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema for completing a task
const completeTaskSchema = z.object({
  confirmed: z.boolean().refine(val => val === true, {
    message: '必须确认才能提交任务',
  }),
});

// Database row types
interface TaskRow {
  id: string;
  title: string;
  status: string;
  enable_quiz: boolean;
  deadline: string | null;
}

interface TaskFileRow {
  id: string;
  task_id: string;
}

interface FileProgressRow {
  id: string;
  file_id: string;
  completed_at: string | null;
}

interface AssignmentRow {
  id: string;
  task_id: string;
  user_id: string;
  is_completed: boolean;
  submitted_at: string | null;
}

interface QuizSubmissionRow {
  id: string;
  passed: boolean;
}

// POST /api/tasks/[id]/complete - Submit task completion (SRS-03)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id: taskId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = completeTaskSchema.parse(body);

    // Verify task exists and is published
    const taskResult = await sql<TaskRow[]>`
      SELECT id, title, status, enable_quiz, deadline FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    if (task.status !== 'published') {
      return errorResponse('任务未发布', 403);
    }

    // Check if deadline has passed
    if (task.deadline && new Date(task.deadline) < new Date()) {
      return errorResponse('任务已过期', 400);
    }

    // Check if user is assigned to this task
    const assignmentResult = await sql<AssignmentRow[]>`
      SELECT id, task_id, user_id, is_completed, submitted_at
      FROM task_assignments WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
    `;

    if (assignmentResult.length === 0) {
      return errorResponse('您未被分配此任务', 403);
    }

    const assignment = assignmentResult[0];

    // Check if already completed
    if (assignment.is_completed) {
      return errorResponse('任务已完成', 400);
    }

    // Verify all files are completed
    const filesResult = await sql<TaskFileRow[]>`
      SELECT id FROM task_files WHERE task_id = ${taskId}
    `;

    const fileIds = filesResult.map(f => f.id);

    if (fileIds.length > 0) {
      const progressResult = await sql<FileProgressRow[]>`
        SELECT file_id, completed_at FROM file_progress
        WHERE user_id = ${currentUser.userId} AND file_id IN ${sql(fileIds)}
      `;

      const completedFiles = new Set(
        progressResult.filter(p => p.completed_at !== null).map(p => p.file_id)
      );

      // Check if all files are completed
      const incompleteFiles = fileIds.filter(id => !completedFiles.has(id));

      if (incompleteFiles.length > 0) {
        return errorResponse(`还有 ${incompleteFiles.length} 个文件未完成`, 400);
      }
    }

    // If quiz is enabled, verify user passed the quiz
    if (task.enable_quiz) {
      const quizSubmission = await sql<QuizSubmissionRow[]>`
        SELECT id, passed FROM quiz_submissions
        WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
        ORDER BY submitted_at DESC LIMIT 1
      `;

      if (quizSubmission.length === 0) {
        return errorResponse('请先完成测验', 400);
      }

      if (!quizSubmission[0].passed) {
        return errorResponse('测验未通过，无法提交任务', 400);
      }
    }

    // Mark assignment as completed
    const result = await sql<AssignmentRow[]>`
      UPDATE task_assignments
      SET is_completed = true, submitted_at = NOW()
      WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
      RETURNING id, is_completed, submitted_at
    `;

    const updatedAssignment = result[0];

    const response = {
      is_completed: updatedAssignment.is_completed,
      submitted_at: updatedAssignment.submitted_at,
    };

    return successResponse(response, { message: '任务已完成' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Complete task error:', error);
    return errorResponse('提交任务失败', 500);
  }
}
