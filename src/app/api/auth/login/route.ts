/**
 * 登录 API - SRS-04
 * POST /api/auth/login
 */

import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createToken } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts, getRemainingLockTime } from '@/lib/rate-limit';
import type { User } from '@/lib/types';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: string;
  department_id: string | null;
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return errorResponse('用户名和密码必填', 400);
    }

    // Check if account is locked due to too many failed attempts (SRS-04)
    if (await isAccountLocked(username)) {
      const remainingSeconds = await getRemainingLockTime(username);
      return errorResponse(`登录尝试过多，请${Math.ceil(remainingSeconds / 60)}分钟后重试`, 429);
    }

    // 从数据库查询用户
    const userResult = await sql<UserRow[]>`
      SELECT id, username, password_hash, name, role, department_id, created_at
      FROM users
      WHERE username = ${username}
        AND status = 'active'
    `;

    if (userResult.length === 0) {
      // Record failed attempt even for non-existent user (prevent enumeration)
      await recordFailedAttempt(username);
      return errorResponse('用户名或密码错误', 401);
    }

    const user = userResult[0];

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      // Record failed attempt
      const isLocked = await recordFailedAttempt(username);
      if (isLocked) {
        return errorResponse('登录尝试过多，账号已锁定30分钟', 429);
      }
      return errorResponse('用户名或密码错误', 401);
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(username);

    // 生成 JWT token
    const token = await createToken({
      id: user.id,
      username: user.username,
      role: user.role as 'admin' | 'leader' | 'user',
    });

    // 创建响应并设置 cookie
    const response = successResponse({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department_id: user.department_id,
        created_at: user.created_at,
      },
    });

    // 设置 httpOnly cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('登录失败，请稍后重试', 500);
  }
}
