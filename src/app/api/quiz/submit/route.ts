import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transaction } from '@/db/transaction'
import { quizAnswers, quizQuestions, tasks, quizSubmissions, taskAssignments, users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { ZodError, z } from 'zod'
import { eq, inArray, and } from 'drizzle-orm'

const submitSchema = z.object({
  taskId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answer: z.number().int().min(0),
  })),
})

export async function POST(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskId, answers } = submitSchema.parse(body)

    if (answers.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有答案可提交' },
        { status: 400 }
      )
    }

    // Fetch task to get passingScore and strictMode
    const taskResult = await db
      .select({
        id: tasks.id,
        passingScore: tasks.passingScore,
        strictMode: tasks.strictMode,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))

    if (taskResult.length === 0) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 400 }
      )
    }

    const task = taskResult[0]
    const passingScore = task.passingScore ?? 100
    const strictMode = task.strictMode ?? false

    // Check user role and task assignment
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    const isAdmin = currentUser?.role === 'admin'

    // Check if user has access to this task (admins can access all)
    if (!isAdmin) {
      const [assignment] = await db
        .select()
        .from(taskAssignments)
        .where(
          and(
            eq(taskAssignments.taskId, taskId),
            eq(taskAssignments.userId, auth.userId)
          )
        )
        .limit(1)

      if (!assignment) {
        return NextResponse.json(
          { success: false, error: '无权访问此任务' },
          { status: 403 }
        )
      }
    }

    // Fetch user's submissions for this task
    const existingSubmissions = await db
      .select({
        id: quizSubmissions.id,
        passed: quizSubmissions.passed,
        attemptCount: quizSubmissions.attemptCount,
      })
      .from(quizSubmissions)
      .where(
        and(
          eq(quizSubmissions.taskId, taskId),
          eq(quizSubmissions.userId, auth.userId)
        )
      )

    // Check if user has already passed
    const hasPassed = existingSubmissions.some(s => s.passed)
    if (hasPassed) {
      return NextResponse.json(
        { success: false, error: '已达到及格分数' },
        { status: 400 }
      )
    }

    // Check submission limit (max 3 attempts)
    const attemptCount = existingSubmissions.length
    if (attemptCount >= 3) {
      return NextResponse.json(
        { success: false, error: '提交次数已用完' },
        { status: 400 }
      )
    }

    // Get all question IDs
    const questionIds = answers.map(a => a.questionId)

    // Fetch all questions to verify and get correct answers
    // CRITICAL FIX: Also filter by taskId to ensure questions belong to this task
    const questions = await db
      .select({
        id: quizQuestions.id,
        taskId: quizQuestions.taskId,
        question: quizQuestions.question,
        options: quizQuestions.options,
        correctAnswer: quizQuestions.correctAnswer,
      })
      .from(quizQuestions)
      .where(
        and(
          eq(quizQuestions.taskId, taskId),
          inArray(quizQuestions.id, questionIds)
        )
      )

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { success: false, error: '部分题目不存在' },
        { status: 400 }
      )
    }

    // Create a map for quick lookup
    const questionMap = new Map(questions.map(q => [q.id, q]))

    // CRITICAL FIX: Validate answer index is within options bounds
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId)
      if (question && answer.answer >= (question.options as unknown[]).length) {
        return NextResponse.json(
          { success: false, error: '答案选项无效' },
          { status: 400 }
        )
      }
    }

    // Check for already answered questions (filter by current user)
    const answeredQuestions = await db
      .select({ questionId: quizAnswers.questionId })
      .from(quizAnswers)
      .where(
        and(
          eq(quizAnswers.userId, auth.userId),
          inArray(
            quizAnswers.questionId,
            answers.map(a => a.questionId)
          )
        )
      )

    if (answeredQuestions.length > 0) {
      return NextResponse.json(
        { success: false, error: '部分题目已回答过' },
        { status: 400 }
      )
    }

    // Grade answers
    let correctCount = 0
    const answersToInsert = answers.map(a => {
      const question = questionMap.get(a.questionId)
      const isCorrect = question ? a.answer === question.correctAnswer : false
      if (isCorrect) correctCount++
      return {
        userId: auth.userId,
        questionId: a.questionId,
        answer: a.answer,
        isCorrect,
      }
    })

    // Calculate passing status
    const scorePercentage = (correctCount / answers.length) * 100
    const passed = strictMode
      ? scorePercentage === 100
      : scorePercentage >= passingScore

    // Prepare submission record
    const submissionRecord = {
      taskId,
      userId: auth.userId,
      score: scorePercentage.toFixed(2),
      passed,
      totalQuestions: answers.length,
      correctAnswers: correctCount,
      attemptCount: attemptCount + 1,
      answers: answers.map(a => {
        const question = questionMap.get(a.questionId)
        const isCorrect = question ? a.answer === question.correctAnswer : false
        return {
          questionId: a.questionId,
          question: question?.question || '',
          options: question?.options || [],
          userAnswer: a.answer,
          correctAnswer: question?.correctAnswer ?? 0,
          isCorrect,
        }
      }),
    }

    // Use transaction for atomic operation
    await transaction(async (tx) => {
      await tx.insert(quizAnswers).values(answersToInsert)
      await tx.insert(quizSubmissions).values(submissionRecord)
    })

    return NextResponse.json({
      success: true,
      data: {
        score: correctCount,
        total: answers.length,
        passed,
        answers: submissionRecord.answers,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400 }
      )
    }

    console.error('Submit quiz answers error:', error)
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    )
  }
}
