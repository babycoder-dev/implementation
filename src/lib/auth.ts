import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcryptjs';
import { cookies } from 'next/headers';

// 导出 JWT 密钥供其他模块使用
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'learning-management-system-secret-key-2024'
);

const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 10;

/**
 * 密码哈希 - SRS-04
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

/**
 * 验证密码 - SRS-04
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return compare(password, hash);
}

/**
 * 生成 JWT Token
 * @istanbul ignore next - Server-side only function using cookies()
 */
export async function generateToken(payload: {
  userId: string;
  username: string;
  role: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<{
  userId: string;
  username: string;
  role: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      userId: string;
      username: string;
      role: string;
    };
  } catch {
    return null;
  }
}

/**
 * 设置认证 Cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * 清除认证 Cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

/**
 * 获取认证 Cookie
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}

import type { NextRequest } from 'next/server';

/**
 * 从请求头获取当前用户信息（中间件设置）
 */
export function getUserFromHeaders(request: NextRequest): {
  userId: string;
  username: string;
  role: string;
} | null {
  const userId = request.headers.get('x-user-id');
  const username = request.headers.get('x-user-name');
  const role = request.headers.get('x-user-role');

  if (!userId || !username || !role) {
    return null;
  }

  return { userId, username, role };
}

/**
 * 获取当前用户信息（从 Cookie - 备用方案）
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  username: string;
  role: string;
} | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}
