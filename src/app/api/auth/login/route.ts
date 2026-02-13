/**
 * 登录 API - SRS-04
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createToken } from '@/lib/auth-middleware';
import type { User } from '@/lib/types';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: string;
  department_id: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码必填' },
        { status: 400 }
      );
    }

    // 从数据库查询用户
    const userResult = await sql<UserRow[]>`
      SELECT id, username, password_hash, name, role, department_id
      FROM users
      WHERE username = ${username}
        AND status = 'active'
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = userResult[0];

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 生成 JWT token
    const token = await createToken({
      id: user.id,
      username: user.username,
      role: user.role as 'admin' | 'leader' | 'user',
    });

    // 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department_id: user.department_id,
        },
      },
      timestamp: new Date().toISOString(),
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
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
