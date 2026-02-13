/**
 * Auth Me API Tests - SRS-04
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  sql: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  getUserFromHeaders: vi.fn()
}));

import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { GET } from '@/app/api/auth/me/route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('未登录');
  });

  it('should return user info for authenticated user', async () => {
    const mockUser = {
      userId: 'user-123',
      role: 'admin'
    };
    mockGetUserFromHeaders.mockReturnValue(mockUser);

    mockSql.mockResolvedValueOnce([
      {
        id: 'user-123',
        username: 'admin',
        name: 'Admin User',
        role: 'admin',
        department_id: 'dept-1',
        department_name: 'IT Department',
        created_at: '2024-01-01T00:00:00Z'
      }
    ]);

    const request = new NextRequest('http://localhost/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.user).toEqual({
      id: 'user-123',
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      department_id: 'dept-1',
      department_name: 'IT Department',
      created_at: '2024-01-01T00:00:00Z'
    });
  });

  it('should return null department for user without department', async () => {
    const mockUser = {
      userId: 'user-456',
      role: 'user'
    };
    mockGetUserFromHeaders.mockReturnValue(mockUser);

    mockSql.mockResolvedValueOnce([
      {
        id: 'user-456',
        username: 'testuser',
        name: 'Test User',
        role: 'user',
        department_id: null,
        department_name: null,
        created_at: '2024-01-02T00:00:00Z'
      }
    ]);

    const request = new NextRequest('http://localhost/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.user.department_id).toBeNull();
    expect(data.data.user.department_name).toBeNull();
  });

  it('should return 404 if user not found in database', async () => {
    const mockUser = {
      userId: 'nonexistent-user',
      role: 'user'
    };
    mockGetUserFromHeaders.mockReturnValue(mockUser);

    mockSql.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/auth/me');
    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('用户不存在');
  });

  it('should include timestamp in response', async () => {
    const mockUser = {
      userId: 'user-123',
      role: 'admin'
    };
    mockGetUserFromHeaders.mockReturnValue(mockUser);

    mockSql.mockResolvedValueOnce([
      {
        id: 'user-123',
        username: 'admin',
        name: 'Admin User',
        role: 'admin',
        department_id: null,
        department_name: null,
        created_at: '2024-01-01T00:00:00Z'
      }
    ]);

    const request = new NextRequest('http://localhost/api/auth/me');
    const response = await GET(request);

    const data = await response.json();
    expect(data.timestamp).toBeDefined();
  });
});
