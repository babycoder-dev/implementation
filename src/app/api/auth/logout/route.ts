/**
 * 登出 API - SRS-04
 * POST /api/auth/logout
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '登出成功',
    timestamp: new Date().toISOString(),
  });

  // 清除认证 cookie
  response.cookies.delete('auth_token');

  return response;
}
