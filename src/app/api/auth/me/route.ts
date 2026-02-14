/**
 * 当前用户 API - SRS-04
 * GET /api/auth/me
 */

import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);

    if (!user) {
      return errorResponse('未登录', 401);
    }

    // 获取用户的完整信息，包括部门名称和创建时间
    const userResult = await sql<UserRow[]>`
      SELECT
        u.id,
        u.username,
        u.name,
        u.role,
        u.department_id,
        d.name AS department_name,
        u.created_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ${user.userId}
    `;

    if (userResult.length === 0) {
      return errorResponse('用户不存在', 404);
    }

    const userData = userResult[0];

    return successResponse({
      user: {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        department_id: userData.department_id,
        department_name: userData.department_name,
        created_at: userData.created_at,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('获取用户信息失败', 500);
  }
}
