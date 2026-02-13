/**
 * 认证中间件 - SRS-04
 * 基于 JWT 的认证和 RBAC 权限控制
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { JWTPayload, UserRole } from './types';
import { JWT_SECRET } from './auth';

const TOKEN_NAME = 'auth_token';

// 公开路由（不需要认证）
const PUBLIC_ROUTES = [
  '/auth/login',
  '/api/auth/login',
  '/api/auth/logout',
];

// 管理员专用路由
const ADMIN_ROUTES = [
  '/admin/departments',
  '/admin/users',
  '/admin/tasks',
  '/admin/reports',
  '/api/departments',
  '/api/users',
  '/api/tasks',
  '/api/reports',
];

// 角色权限映射 - SRS-04
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'], // 所有权限
  leader: [
    '/admin/departments',
    '/admin/reports',
    '/api/departments',
    '/api/reports',
    '/api/users', // 仅本部门
  ],
  user: [], // 无管理权限
};

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * 从请求中获取 token
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // 优先从 Authorization header 获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 其次从 cookie 获取
  const cookie = request.cookies.get(TOKEN_NAME);
  if (cookie?.value) {
    return cookie.value;
  }

  return null;
}

/**
 * 检查用户是否有权限访问指定路由
 */
export function hasPermission(role: UserRole, path: string): boolean {
  if (role === 'admin') return true;

  const permissions = ROLE_PERMISSIONS[role];
  if (permissions.includes('*')) return true;

  return permissions.some((permission) => {
    if (permission.endsWith('/*')) {
      return path.startsWith(permission.slice(0, -1));
    }
    return path === permission;
  });
}

/**
 * 认证中间件
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // 1. 检查是否是公开路由
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  // 2. 验证 token
  const token = getTokenFromRequest(request);
  if (!token) {
    // API 路由返回 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    // 页面重定向到登录页
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. 验证 token 有效性
  const payload = await verifyToken(token);
  if (!payload) {
    // token 无效，清除 cookie 并返回 401
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, error: '登录已过期，请重新登录', timestamp: new Date().toISOString() },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/auth/login', request.url));

    // 清除无效的 cookie
    response.cookies.delete(TOKEN_NAME);
    return response;
  }

  // 4. 检查权限
  if (!hasPermission(payload.role as UserRole, pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '无权限访问', timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }
    // 页面重定向到首页
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 5. 将用户信息添加到请求头（供 API 使用）
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-name', payload.username);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * 创建 JWT token
 */
export async function createToken(user: {
  id: string;
  username: string;
  role: UserRole;
}): Promise<string> {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

// 导入 SignJWT
import { SignJWT } from 'jose';

export { JWT_SECRET, TOKEN_NAME };
