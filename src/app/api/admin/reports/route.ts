import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/admin/reports - Get detailed reports data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'overview';
    const departmentId = searchParams.get('departmentId');

    if (reportType === 'overview') {
      // Get overall statistics
      const userCountResult = await sql`SELECT COUNT(*) as count FROM users`;
      const taskCountResult = await sql`SELECT COUNT(*) as count FROM tasks`;
      const completedCountResult = await sql`SELECT COUNT(*) as count FROM task_assignments WHERE completed_at IS NOT NULL`;
      const totalAssignmentsResult = await sql`SELECT COUNT(*) as count FROM task_assignments`;
      const avgScoreResult = await sql`SELECT AVG(score) as avg FROM quiz_submissions WHERE score IS NOT NULL`;

      const userCount = Number(userCountResult[0]?.count || 0);
      const taskCount = Number(taskCountResult[0]?.count || 0);
      const completedCount = Number(completedCountResult[0]?.count || 0);
      const totalAssignments = Number(totalAssignmentsResult[0]?.count || 0);
      const avgScore = Number(avgScoreResult[0]?.avg);

      const completionRate = totalAssignments > 0
        ? Math.round((completedCount / totalAssignments) * 100)
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalUsers: userCount,
            totalTasks: taskCount,
            completedAssignments: completedCount,
            totalAssignments: totalAssignments,
            completionRate,
            averageScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
          }
        }
      });
    }

    if (reportType === 'departments') {
      const deptStats = await sql`
        SELECT
          d.id,
          d.name,
          d.description,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT ta.id) as assignment_count,
          COUNT(DISTINCT ta.id) FILTER (WHERE ta.completed_at IS NOT NULL) as completed_count,
          AVG(qs.score) as avg_score
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id
        LEFT JOIN task_assignments ta ON ta.user_id = u.id
        LEFT JOIN quiz_submissions qs ON qs.user_id = u.id AND qs.task_id = ta.task_id
        GROUP BY d.id, d.name, d.description
        ORDER BY d.name
      `;

      return NextResponse.json({
        success: true,
        data: {
          departments: deptStats.map((d: Record<string, unknown>) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            userCount: Number(d.user_count),
            assignmentCount: Number(d.assignment_count),
            completedCount: Number(d.completed_count),
            completionRate: Number(d.assignment_count) > 0
              ? Math.round((Number(d.completed_count) / Number(d.assignment_count)) * 100)
              : 0,
            averageScore: d.avg_score ? Math.round(Number(d.avg_score) * 10) / 10 : null,
          }))
        }
      });
    }

    if (reportType === 'users') {
      const userStats = await sql`
        SELECT
          u.id,
          u.username,
          u.name,
          u.role,
          d.name as department_name,
          COUNT(DISTINCT ta.id) as total_assignments,
          COUNT(DISTINCT ta.id) FILTER (WHERE ta.completed_at IS NOT NULL) as completed_assignments,
          MAX(qs.score) as latest_score,
          AVG(qs.score) as avg_score,
          SUM(CASE WHEN qs.passed = true THEN 1 ELSE 0 END) as passed_quizzes
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN task_assignments ta ON ta.user_id = u.id
        LEFT JOIN quiz_submissions qs ON qs.user_id = u.id
        ${departmentId ? sql`WHERE u.department_id = ${departmentId}` : sql``}
        GROUP BY u.id, u.username, u.name, u.role, d.name
        ORDER BY u.name
      `;

      return NextResponse.json({
        success: true,
        data: {
          users: userStats.map((u: Record<string, unknown>) => ({
            id: u.id,
            username: u.username,
            name: u.name || u.username,
            role: u.role,
            department: u.department_name,
            totalTasks: Number(u.total_assignments),
            completedTasks: Number(u.completed_assignments),
            completionRate: Number(u.total_assignments) > 0
              ? Math.round((Number(u.completed_assignments) / Number(u.total_assignments)) * 100)
              : 0,
            latestScore: u.latest_score ? Number(u.latest_score) : null,
            averageScore: u.avg_score ? Math.round(Number(u.avg_score) * 10) / 10 : null,
            passedQuizzes: Number(u.passed_quizzes),
          }))
        }
      });
    }

    if (reportType === 'tasks') {
      const taskStats = await sql`
        SELECT
          t.id,
          t.title,
          t.status,
          t.deadline,
          COUNT(DISTINCT ta.id) as assignment_count,
          COUNT(DISTINCT ta.id) FILTER (WHERE ta.completed_at IS NOT NULL) as completed_count,
          AVG(qs.score) as avg_score,
          AVG(CASE WHEN qs.passed = true THEN 1 ELSE 0 END) as pass_rate
        FROM tasks t
        LEFT JOIN task_assignments ta ON ta.task_id = t.id
        LEFT JOIN quiz_submissions qs ON qs.task_id = t.id
        GROUP BY t.id, t.title, t.status, t.deadline
        ORDER BY t.created_at DESC
      `;

      return NextResponse.json({
        success: true,
        data: {
          tasks: taskStats.map((t: Record<string, unknown>) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            deadline: t.deadline,
            assignmentCount: Number(t.assignment_count),
            completedCount: Number(t.completed_count),
            completionRate: Number(t.assignment_count) > 0
              ? Math.round((Number(t.completed_count) / Number(t.assignment_count)) * 100)
              : 0,
            averageScore: t.avg_score ? Math.round(Number(t.avg_score) * 10) / 10 : null,
            passRate: t.pass_rate ? Math.round(Number(t.pass_rate) * 100) : null,
          }))
        }
      });
    }

    return NextResponse.json(
      { success: false, error: '不支持的报告类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, error: '获取报表数据失败' },
      { status: 500 }
    );
  }
}
