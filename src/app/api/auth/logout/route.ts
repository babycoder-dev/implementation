/**
 * 登出 API - SRS-04
 * POST /api/auth/logout
 */

import { successResponse } from '@/lib/api-response';

export async function POST() {
  const response = successResponse(null, { message: '登出成功' });

  // 清除认证 cookie
  response.cookies.delete('auth_token');

  return response;
}
