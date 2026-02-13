/**
 * 当前用户 API - SRS-04
 * GET /api/auth/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 获取用户的完整信息，包括部门名称
    const userResult = await sql<UserRow[]>`
      SELECT
        u.id,
        u.username,
        u.name,
        u.role,
        u.department_id,
        d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ${user.userId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const userData = userResult[0];

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          role: userData.role,
          department_id: userData.department_id,
          department_name: userData.department_name,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
