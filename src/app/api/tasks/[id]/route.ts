import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Task status types
const TASK_STATUSES = ['draft', 'published', 'completed', 'archived', 'deleted', 'deadline_passed'] as const;

// State transition rules (SRS-02)
const STATE_TRANSITIONS: Record<string, string[]> = {
  draft: ['published', 'deleted'],
  published: ['archived', 'deleted', 'deadline_passed', 'completed'],
  deadline_passed: ['archived'],
  archived: ['deleted'],
  deleted: [],
  completed: ['archived', 'deleted'],
};

// Update task validation schema
const updateTaskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(255, '任务标题过长').optional(),
  description: z.string().max(2000, '描述过长').optional().nullable(),
  deadline: z.string().datetime({ message: '无效的截止日期格式' }).optional().nullable(),
  status: z.string().refine(
    (val) => TASK_STATUSES.includes(val as typeof TASK_STATUSES[number]),
    { message: '无效的任务状态' }
  ).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  strictMode: z.boolean().optional(),
  enableQuiz: z.boolean().optional(),
});

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
  created_by: string;
  created_at: string;
  updated_at: string | null;
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
  required_completion: string;
  order: number;
  converted: boolean;
  created_at: string;
}

interface TaskAssignmentRow {
  id: string;
  task_id: string;
  user_id: string;
  assignment_type: string;
  assigned_by: string | null;
  assigned_at: string;
  submitted_at: string | null;
  is_completed: boolean;
  user_name: string | null;
  department_name: string | null;
}

interface QuizQuestionRow {
  id: string;
  task_id: string;
  question: string;
  options: unknown;
  correct_answer: number;
  order: number;
  created_at: string;
}

// Response types
interface TaskFile {
  id: string;
  title: string;
  fileUrl: string;
  originalUrl: string | null;
  fileType: string;
  fileSize: number;
  duration: number | null;
  requiredCompletion: string;
  order: number;
  converted: boolean;
}

interface TaskAssignment {
  userId: string;
  userName: string | null;
  departmentName: string | null;
  assignedAt: string;
  isCompleted: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: unknown;
  order: number;
}

interface CreatedBy {
  id: string;
  name: string | null;
}

interface TaskDetailResponse {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  passingScore: number | null;
  strictMode: boolean;
  enableQuiz: boolean;
  createdBy: CreatedBy;
  files: TaskFile[];
  assignments: TaskAssignment[];
  quizQuestions: QuizQuestion[];
  createdAt: string;
  updatedAt: string | null;
}

// Helper function to validate state transition
function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions = STATE_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

// GET /api/tasks/[id] - Get a single task with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id } = await params;

    // Get task with created_by info
    const taskResult = await sql`
      SELECT t.*, u.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ${id}
    ` as (TaskRow & { created_by_name: string | null })[];

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    // Non-admin users can only see published tasks
    if (currentUser.role !== 'admin' && task.status !== 'published') {
      return errorResponse('无权限查看此任务', 403);
    }

    // Get task files with required fields
    const filesResult = await sql`
      SELECT id, task_id, title, file_url, original_url, file_type, file_size,
             duration, required_completion, "order", converted
      FROM task_files
      WHERE task_id = ${id}
      ORDER BY "order"
    ` as TaskFileRow[];

    const files: TaskFile[] = filesResult.map((file) => ({
      id: file.id,
      title: file.title,
      fileUrl: file.file_url,
      originalUrl: file.original_url,
      fileType: file.file_type,
      fileSize: file.file_size,
      duration: file.duration,
      requiredCompletion: file.required_completion,
      order: file.order,
      converted: file.converted,
    }));

    // Get task assignments with user and department info
    const assignmentsResult = await sql`
      SELECT ta.*, u.name as user_name, d.name as department_name
      FROM task_assignments ta
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ta.task_id = ${id}
    ` as TaskAssignmentRow[];

    const assignments: TaskAssignment[] = assignmentsResult.map((assignment) => ({
      userId: assignment.user_id,
      userName: assignment.user_name,
      departmentName: assignment.department_name,
      assignedAt: assignment.assigned_at,
      isCompleted: assignment.is_completed,
    }));

    // Get quiz questions WITHOUT correct_answer
    const questionsResult = await sql`
      SELECT id, task_id, question, options, "order"
      FROM quiz_questions
      WHERE task_id = ${id}
      ORDER BY "order"
    ` as QuizQuestionRow[];

    const quizQuestions: QuizQuestion[] = questionsResult.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      order: q.order,
    }));

    // Build response
    const response: TaskDetailResponse = {
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      status: task.status,
      passingScore: task.passing_score,
      strictMode: task.strict_mode,
      enableQuiz: task.enable_quiz,
      createdBy: {
        id: task.created_by,
        name: task.created_by_name,
      },
      files,
      assignments,
      quizQuestions,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Get task error:', error);
    return errorResponse('获取任务详情失败', 500);
  }
}

// PUT /api/tasks/[id] - Update a task with state transition validation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限修改任务', 403);
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateTaskSchema.parse(body);

    // Get current task
    const taskResult = await sql`
      SELECT * FROM tasks WHERE id = ${id}
    ` as TaskRow[];

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const currentTask = taskResult[0];

    // Validate state transition if status is being changed
    if (validatedData.status && validatedData.status !== currentTask.status) {
      if (!isValidTransition(currentTask.status, validatedData.status)) {
        return errorResponse(
          `无效的状态转换：从 ${currentTask.status} 到 ${validatedData.status}`,
          400
        );
      }

      // Business rule: publishing requires at least one file
      if (validatedData.status === 'published') {
        const fileCountResult = await sql`
          SELECT COUNT(*) as count FROM task_files WHERE task_id = ${id}
        ` as { count: string }[];
        const fileCount = parseInt(fileCountResult[0].count);

        if (fileCount === 0) {
          return errorResponse('发布任务必须至少包含一个文件', 400);
        }
      }
    }

    // Build update query dynamically with numbered parameters
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validatedData.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(validatedData.title);
    }
    if (validatedData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(validatedData.description);
    }
    if (validatedData.deadline !== undefined) {
      updateFields.push(`deadline = $${paramIndex++}`);
      values.push(validatedData.deadline);
    }
    if (validatedData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(validatedData.status);
    }
    if (validatedData.passingScore !== undefined) {
      updateFields.push(`passing_score = $${paramIndex++}`);
      values.push(validatedData.passingScore);
    }
    if (validatedData.strictMode !== undefined) {
      updateFields.push(`strict_mode = $${paramIndex++}`);
      values.push(validatedData.strictMode);
    }
    if (validatedData.enableQuiz !== undefined) {
      updateFields.push(`enable_quiz = $${paramIndex++}`);
      values.push(validatedData.enableQuiz);
    }

    if (updateFields.length === 0) {
      return errorResponse('没有需要更新的字段', 400);
    }

    // Use sql.unsafe for dynamic query with numbered parameters
    const updateSql = `UPDATE tasks SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);

    const result = await sql.unsafe(updateSql) as TaskRow[];

    if (result.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const updatedTask = result[0];

    // Build response
    const response = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      deadline: updatedTask.deadline,
      status: updatedTask.status,
      passingScore: updatedTask.passing_score,
      strictMode: updatedTask.strict_mode,
      enableQuiz: updatedTask.enable_quiz,
      createdAt: updatedTask.created_at,
      updatedAt: updatedTask.updated_at,
    };

    return successResponse(response, { message: '任务更新成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Update task error:', error);
    return errorResponse('更新任务失败', 500);
  }
}

// DELETE /api/tasks/[id] - Soft delete a task (update status to 'deleted')
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限删除任务', 403);
    }

    const { id } = await params;

    // Check if task exists
    const taskResult = await sql`
      SELECT * FROM tasks WHERE id = ${id}
    ` as TaskRow[];

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const currentTask = taskResult[0];

    // Validate state transition to deleted
    if (!isValidTransition(currentTask.status, 'deleted')) {
      return errorResponse(
        `无法删除状态为 ${currentTask.status} 的任务`,
        400
      );
    }

    // Soft delete: update status to 'deleted'
    const result = await sql`
      UPDATE tasks
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    ` as TaskRow[];

    if (result.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    return successResponse({ id }, { message: '任务删除成功' });
  } catch (error) {
    console.error('Delete task error:', error);
    return errorResponse('删除任务失败', 500);
  }
}
