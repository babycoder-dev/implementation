import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schemas
const updateQuizQuestionSchema = z.object({
  question: z.string().min(1, '题目不能为空').max(500, '题目过长').optional(),
  options: z.array(z.string().min(1, '选项不能为空')).min(2, '至少需要2个选项').max(6, '最多6个选项').optional(),
  correctAnswer: z.number().int().min(0, '正确答案索引无效').optional(),
  order: z.number().int().min(0).optional(),
});

// Database row types
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

// PUT /api/tasks/[id]/quiz/[questionId] - Update a quiz question (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId, questionId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateQuizQuestionSchema.parse(body);

    // Check if question exists and belongs to this task
    const existingQuestion = await sql`
      SELECT * FROM quiz_questions
      WHERE id = ${questionId} AND task_id = ${taskId}
    ` as QuizQuestionRow[];

    if (existingQuestion.length === 0) {
      return errorResponse('题目不存在', 404);
    }

    const currentQuestion = existingQuestion[0];

    // Validate correctAnswer index if provided
    const options = validatedData.options ?? (currentQuestion.options as string[]);
    if (validatedData.correctAnswer !== undefined) {
      if (validatedData.correctAnswer < 0 || validatedData.correctAnswer >= options.length) {
        return errorResponse('正确答案索引无效', 400);
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validatedData.question !== undefined) {
      updateFields.push(`question = $${paramIndex++}`);
      values.push(validatedData.question);
    }
    if (validatedData.options !== undefined) {
      updateFields.push(`options = $${paramIndex++}`);
      values.push(validatedData.options);
    }
    if (validatedData.correctAnswer !== undefined) {
      updateFields.push(`correct_answer = $${paramIndex++}`);
      values.push(validatedData.correctAnswer);
    }
    if (validatedData.order !== undefined) {
      updateFields.push(`"order" = $${paramIndex++}`);
      values.push(validatedData.order);
    }

    if (updateFields.length === 0) {
      return errorResponse('没有需要更新的字段', 400);
    }

    // Use sql.unsafe for dynamic query with numbered parameters
    const updateSql = `UPDATE quiz_questions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND task_id = $${paramIndex + 1} RETURNING *`;
    values.push(questionId, taskId);

    const result = await sql.unsafe(updateSql) as QuizQuestionRow[];

    if (result.length === 0) {
      return errorResponse('题目不存在', 404);
    }

    const updatedQuestion = result[0];

    const response: QuizQuestion = {
      id: updatedQuestion.id,
      question: updatedQuestion.question,
      options: updatedQuestion.options,
      order: updatedQuestion.order,
    };

    return successResponse(response, { message: '题目更新成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Update quiz question error:', error);
    return errorResponse('更新题目失败', 500);
  }
}

// DELETE /api/tasks/[id]/quiz/[questionId] - Delete a quiz question (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId, questionId } = await params;

    // Check if question exists
    const existingQuestion = await sql`
      SELECT id FROM quiz_questions
      WHERE id = ${questionId} AND task_id = ${taskId}
    ` as { id: string }[];

    if (existingQuestion.length === 0) {
      return errorResponse('题目不存在', 404);
    }

    // Delete the question
    await sql`
      DELETE FROM quiz_questions
      WHERE id = ${questionId} AND task_id = ${taskId}
    `;

    // Check if there are any remaining questions for this task
    const remainingQuestions = await sql`
      SELECT COUNT(*) as count
      FROM quiz_questions
      WHERE task_id = ${taskId}
    ` as { count: string }[];

    // If no questions remain, disable quiz on the task
    if (parseInt(remainingQuestions[0].count) === 0) {
      await sql`
        UPDATE tasks
        SET enable_quiz = false
        WHERE id = ${taskId}
      `;
    }

    return successResponse({ id: questionId }, { message: '题目删除成功' });
  } catch (error) {
    console.error('Delete quiz question error:', error);
    return errorResponse('删除题目失败', 500);
  }
}
