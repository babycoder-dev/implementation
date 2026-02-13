/**
 * Next.js Middleware 配置
 * 基于 SRS-04 认证需求
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';

const PUBLIC_ROUTES = ['/auth/login', '/api/auth/login', '/api/auth/logout'];
const PROTECTED_ROUTES = ['/admin', '/tasks', '/api'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 静态资源和 API 探索路由直接放行
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. 公开路由放行
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 3. 调用认证中间件
  const authResult = await authMiddleware(request);
  if (authResult) {
    return authResult;
  }

  // 4. 登录用户访问登录页时重定向到首页
  if (pathname === '/auth/login') {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态资源)
     * - _next/image (图片优化)
     * - favicon.ico (图标)
     * - public 目录下的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
