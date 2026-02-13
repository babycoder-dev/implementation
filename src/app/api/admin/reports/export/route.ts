import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateLearningReport } from '@/lib/reports/excel-exporter';

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

// GET /api/admin/reports/export - Export learning report as Excel
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format');

    // Only support xlsx format for now
    if (format && format.toLowerCase() !== 'xlsx') {
      return NextResponse.json(
        { success: false, error: '不支持的导出格式' },
        { status: 400 }
      );
    }

    // Get all users
    const usersResult = await sql`SELECT id, username, name FROM users`;
    const totalUsers = usersResult.length;

    // Get all tasks
    const tasksResult = await sql`SELECT id, title FROM tasks`;
    const totalTasks = tasksResult.length;

    // Get all task assignments with completion info
    const assignmentsResult = await sql`
      SELECT ta.id, ta.task_id, ta.user_id, ta.completed_at
      FROM task_assignments ta
    `;

    // Get all quiz submissions
    const quizSubmissionsResult = await sql`
      SELECT qs.id, qs.task_id, qs.user_id, qs.score, qs.passed,
             qs.total_questions, qs.correct_answers, qs.submitted_at
      FROM quiz_submissions qs
    `;

    // Create a map of quiz submissions by user_id and task_id for quick lookup
    const quizMap = new Map<string, typeof quizSubmissionsResult[0]>();
    quizSubmissionsResult.forEach((qs) => {
      const key = `${qs.user_id}-${qs.task_id}`;
      quizMap.set(key, qs);
    });

    // Get task titles map
    const taskMap = new Map<string, string>();
    tasksResult.forEach((task) => {
      taskMap.set(task.id, task.title);
    });

    // Get user names map
    const userMap = new Map<string, string>();
    usersResult.forEach((user) => {
      userMap.set(user.id, user.name || user.username);
    });

    // Build learning records
    const learningRecords = assignmentsResult.map((assignment) => {
      const userName = userMap.get(assignment.user_id) || '未知用户';
      const taskTitle = taskMap.get(assignment.task_id) || '未知任务';
      const quizKey = `${assignment.user_id}-${assignment.task_id}`;
      const quiz = quizMap.get(quizKey);

      return {
        userName,
        taskTitle,
        completedAt: formatDate(assignment.completed_at),
        score: quiz ? quiz.score : null,
        passed: quiz ? quiz.passed : null,
        duration: null, // Duration not tracked in current schema
      };
    });

    // Calculate statistics
    const completedTasks = assignmentsResult.filter((a) => a.completed_at !== null).length;

    // Calculate average score from quiz submissions
    const totalScore = quizSubmissionsResult.reduce((sum, qs) => sum + qs.score, 0);
    const averageScore = quizSubmissionsResult.length > 0
      ? totalScore / quizSubmissionsResult.length
      : 0;

    const reportData = {
      exportDate: new Date().toLocaleString('zh-CN'),
      statistics: {
        totalUsers,
        totalTasks,
        completedTasks,
        averageScore,
      },
      learningRecords,
    };

    // Generate Excel file
    const excelBuffer = generateLearningReport(reportData);

    // Return the file with proper headers
    const filename = `学习报表_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Export report error:', error);
    return NextResponse.json(
      { success: false, error: '导出报表失败' },
      { status: 500 }
    );
  }
}
