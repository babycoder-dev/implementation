import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schemas
const createQuizQuestionSchema = z.object({
  question: z.string().min(1, '题目不能为空').max(500, '题目过长'),
  options: z.array(z.string().min(1, '选项不能为空')).min(2, '至少需要2个选项').max(6, '最多6个选项'),
  correctAnswer: z.number().int().min(0, '正确答案索引无效'),
  order: z.number().int().min(0).optional().default(0),
});

// Database row types
interface TaskRow {
  id: string;
  title: string;
  enable_quiz: boolean;
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
interface QuizQuestion {
  id: string;
  question: string;
  options: unknown;
  order: number;
}

// GET /api/tasks/[id]/quiz - Get quiz settings and questions
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

    // Get task with quiz settings
    const taskResult = await sql`
      SELECT id, title, passing_score, strict_mode, enable_quiz
      FROM tasks
      WHERE id = ${id}
    ` as (TaskRow & { passing_score: number | null; strict_mode: boolean; enable_quiz: boolean })[];

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    // Get quiz questions WITHOUT correct_answer
    const questionsResult = await sql`
      SELECT id, task_id, question, options, "order", created_at
      FROM quiz_questions
      WHERE task_id = ${id}
      ORDER BY "order", created_at
    ` as QuizQuestionRow[];

    const questions: QuizQuestion[] = questionsResult.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      order: q.order,
    }));

    const response = {
      enable_quiz: task.enable_quiz,
      passing_score: task.passing_score,
      strict_mode: task.strict_mode,
      questions,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Get quiz error:', error);
    return errorResponse('获取测验设置失败', 500);
  }
}

// POST /api/tasks/[id]/quiz - Add a quiz question (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = createQuizQuestionSchema.parse(body);

    // Check if task exists
    const taskResult = await sql`
      SELECT id FROM tasks WHERE id = ${id}
    ` as { id: string }[];

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Validate correctAnswer index
    if (validatedData.correctAnswer < 0 || validatedData.correctAnswer >= validatedData.options.length) {
      return errorResponse('正确答案索引无效', 400);
    }

    // Get the next order if not provided
    let order = validatedData.order;
    if (order === 0) {
      const maxOrderResult = await sql`
        SELECT COALESCE(MAX("order"), -1) as max_order
        FROM quiz_questions
        WHERE task_id = ${id}
      ` as { max_order: number }[];
      order = maxOrderResult[0].max_order + 1;
    }

    // Insert the quiz question
    const result = await sql`
      INSERT INTO quiz_questions (task_id, question, options, correct_answer, "order")
      VALUES (${id}, ${validatedData.question}, ${validatedData.options}, ${validatedData.correctAnswer}, ${order})
      RETURNING *
    ` as QuizQuestionRow[];

    const newQuestion = result[0];

    // Enable quiz on the task if not already enabled
    await sql`
      UPDATE tasks
      SET enable_quiz = true
      WHERE id = ${id} AND enable_quiz = false
    `;

    const response: QuizQuestion = {
      id: newQuestion.id,
      question: newQuestion.question,
      options: newQuestion.options,
      order: newQuestion.order,
    };

    return successResponse(response, { message: '题目添加成功' }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Add quiz question error:', error);
    return errorResponse('添加题目失败', 500);
  }
}
