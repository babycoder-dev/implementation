import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface DashboardStats {
  userCount: number;
  taskCount: number;
  completionRate: number;
  pendingTaskCount: number;
}

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET() {
  try {
    // Get user count
    const userCountResult = await sql`SELECT COUNT(*) as count FROM users`;
    const userCount = parseInt(userCountResult[0].count);

    // Get task count
    const taskCountResult = await sql`SELECT COUNT(*) as count FROM tasks`;
    const taskCount = parseInt(taskCountResult[0].count);

    // Get completed task count
    const completedCountResult = await sql`SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'`;
    const completedCount = parseInt(completedCountResult[0].count);

    // Calculate completion rate
    const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    // Get pending task count
    const pendingTaskResult = await sql`SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'`;
    const pendingTaskCount = parseInt(pendingTaskResult[0].count);

    const stats: DashboardStats = {
      userCount,
      taskCount,
      completionRate,
      pendingTaskCount,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: '获取看板数据失败' },
      { status: 500 }
    );
  }
}
