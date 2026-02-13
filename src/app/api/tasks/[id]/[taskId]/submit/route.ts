import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';

interface QuizQuestionRow {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

interface QuizSubmissionRow {
  id: string;
  task_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  submitted_at: string;
}

// POST /api/tasks/[taskId]/submit - Submit quiz answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    const { taskId } = await params;
    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { success: false, error: '答案不能为空', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    // Check if already submitted
    const existingSubmission = await sql<{ id: string }[]>`
      SELECT id FROM quiz_submissions
      WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
    `;

    if (existingSubmission.length > 0) {
      return NextResponse.json(
        { success: false, error: '您已提交过测验', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    // Get quiz questions
    const questions = await sql<QuizQuestionRow[]>`
      SELECT id, correct_answer
      FROM quiz_questions
      WHERE task_id = ${taskId}
    `;

    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: '该任务没有测验题目', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    // Create question map for quick lookup
    const questionMap = new Map(questions.map((q) => [q.id, q.correct_answer]));

    // Validate all question IDs
    for (const answer of answers) {
      if (!questionMap.has(answer.question_id)) {
        return NextResponse.json(
          { success: false, error: '题目ID无效', timestamp: new Date().toISOString() },
          { status: 400 }
        );
      }
    }

    // Grade the quiz
    let correctCount = 0;
    const answerRecords: { question_id: string; answer: number; is_correct: boolean }[] = [];

    for (const answer of answers) {
      const correctAnswer = questionMap.get(answer.question_id);
      const isCorrect = correctAnswer === answer.answer;
      if (isCorrect) {
        correctCount++;
      }
      answerRecords.push({
        question_id: answer.question_id,
        answer: answer.answer,
        is_correct: isCorrect,
      });
    }

    // Get task passing score
    const taskResult = await sql<{ passing_score: number | null; title: string }[]>`
      SELECT passing_score, title
      FROM tasks
      WHERE id = ${taskId}
    `;

    const task = taskResult[0];
    const passingScore = task?.passing_score ?? 60;
    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= passingScore;

    // Create submission
    const submissionResult = await sql<QuizSubmissionRow[]>`
      INSERT INTO quiz_submissions (task_id, user_id, score, passed, total_questions, correct_answers)
      VALUES (${taskId}, ${currentUser.userId}, ${score}, ${passed}, ${totalQuestions}, ${correctCount})
      RETURNING *
    `;

    const submission = submissionResult[0];

    // Save answer records
    for (const record of answerRecords) {
      await sql`
        INSERT INTO quiz_answers (submission_id, question_id, answer, is_correct)
        VALUES (${submission.id}, ${record.question_id}, ${record.answer}, ${record.is_correct})
      `;
    }

    // If passed all requirements, mark assignment as completed
    if (passed) {
      await sql`
        UPDATE task_assignments
        SET completed_at = NOW()
        WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        score: submission.score,
        passed: submission.passed,
        totalQuestions: submission.total_questions,
        correctAnswers: submission.correct_answers,
        passingScore,
        taskTitle: task?.title || '',
        submittedAt: submission.submitted_at,
      },
      meta: { message: passed ? '测验通过' : '测验未通过' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      { success: false, error: '提交测验失败', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// GET /api/tasks/[taskId]/submit - Get user's submission for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    const { taskId } = await params;

    const result = await sql<QuizSubmissionRow[]>`
      SELECT *
      FROM quiz_submissions
      WHERE task_id = ${taskId} AND user_id = ${currentUser.userId}
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到提交记录', timestamp: new Date().toISOString() },
        { status: 404 }
      );
    }

    const submission = result[0];

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        taskId: submission.task_id,
        score: submission.score,
        passed: submission.passed,
        totalQuestions: submission.total_questions,
        correctAnswers: submission.correct_answers,
        submittedAt: submission.submitted_at,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get quiz submission error:', error);
    return NextResponse.json(
      { success: false, error: '获取提交记录失败', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
