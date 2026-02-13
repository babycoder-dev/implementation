import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';

interface QuizSubmitBody {
  taskId: string;
  answers: Array<{
    questionId: string;
    answer: number;
  }>;
}

interface QuestionRow {
  id: string;
  task_id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

interface TaskRow {
  id: string;
  passing_score: number | null;
}

// POST /api/quiz/submit - Submit quiz answers
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const { taskId, answers } = await request.json() as QuizSubmitBody;

    if (!taskId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    if (answers.length === 0) {
      return NextResponse.json(
        { success: false, error: '请至少回答一道题' },
        { status: 400 }
      );
    }

    // Get task with passing_score
    const taskResult = await sql<TaskRow[]>`SELECT id, passing_score FROM tasks WHERE id = ${taskId}`;

    if (taskResult.length === 0) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    const task = taskResult[0];
    const passingScore = task.passing_score ?? 60;

    // Get all questions for the task
    const questionsResult = await sql<QuestionRow[]>`SELECT * FROM quiz_questions WHERE task_id = ${taskId}`;

    if (questionsResult.length === 0) {
      return NextResponse.json(
        { success: false, error: '该任务没有题目' },
        { status: 400 }
      );
    }

    const totalQuestions = questionsResult.length;

    // Create a map of questionId -> correct_answer for quick lookup
    const questionMap = new Map<string, number>();
    questionsResult.forEach((q) => {
      questionMap.set(q.id, q.correct_answer);
    });

    // Calculate correct answers
    let correctAnswers = 0;
    answers.forEach((answer) => {
      const correctAnswer = questionMap.get(answer.questionId);
      if (correctAnswer !== undefined && answer.answer === correctAnswer) {
        correctAnswers++;
      }
    });

    // Calculate score
    const score = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
    const passed = score >= passingScore;

    // Save submission
    await sql`
      INSERT INTO quiz_submissions (task_id, user_id, score, passed, total_questions, correct_answers)
      VALUES (${taskId}, ${currentUser.userId}, ${score}, ${passed}, ${totalQuestions}, ${correctAnswers})
    `;

    return NextResponse.json({
      success: true,
      data: {
        score,
        passed,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        passing_score: passingScore,
      },
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return NextResponse.json(
      { success: false, error: '提交答案失败' },
      { status: 500 }
    );
  }
}
