/**
 * Departments [id] Users API Tests - SRS-04
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromHeaders: vi.fn(),
}));

import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { GET, POST, DELETE } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

describe('GET /api/departments/[id]/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/departments/dept-1/users');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 403 if user role', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/departments/dept-1/users');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return users for admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'user-1', username: 'dev1', name: 'Dev One', role: 'user', status: 'active', created_at: '2024-01-01' },
    ]);
    const request = new NextRequest('http://localhost/api/departments/dept-1/users');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should allow leader to view their department', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql
      .mockResolvedValueOnce([{ department_id: 'dept-1' }]) // Leader's dept
      .mockResolvedValueOnce([ // Users in dept
        { id: 'user-1', username: 'dev1', name: 'Dev One', role: 'user', status: 'active', created_at: '2024-01-01' },
      ]);
    const request = new NextRequest('http://localhost/api/departments/dept-1/users');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(200);
  });

  it('should deny leader access to other departments', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql.mockResolvedValueOnce([{ department_id: 'dept-1' }]); // Leader's dept
    const request = new NextRequest('http://localhost/api/departments/dept-2/users');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-2' }) });
    expect(response.status).toBe(403);
  });
});

describe('POST /api/departments/[id]/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 400 if user_id is missing', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(400);
  });

  it('should return 404 if department not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValueOnce([]); // Dept exists check
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(404);
  });

  it('should return 404 if user not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockResolvedValueOnce([{ id: 'dept-1' }]) // Dept exists
      .mockResolvedValueOnce([]); // User exists
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(404);
  });

  it('should add user to department successfully', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockResolvedValueOnce([{ id: 'dept-1' }]) // Dept exists
      .mockResolvedValueOnce([{ id: 'user-1' }]); // User exists
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'dept-1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should deny leader to add to other departments', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql.mockResolvedValueOnce([{ department_id: 'dept-1' }]); // Leader's dept
    const request = new NextRequest('http://localhost/api/departments/dept-2/users', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'dept-2' }) });
    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/departments/[id]/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 400 if user_id is missing', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(400);
  });

  it('should return 404 if user not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => []); // User exists
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(404);
  });

  it('should return 404 if user not in department', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      if (strings[0].includes('SELECT department_id FROM users WHERE id')) {
        return [{ department_id: 'dept-2' }];
      }
      return [];
    });
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(404);
  });

  it('should remove user from department successfully', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      if (strings[0].includes('SELECT department_id FROM users WHERE id')) {
        return [{ department_id: 'dept-1' }];
      }
      return [{ id: 'user-1' }];
    });
    const request = new NextRequest('http://localhost/api/departments/dept-1/users', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should deny leader to remove from other departments', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql.mockResolvedValueOnce([{ department_id: 'dept-1' }]); // Leader's dept
    const request = new NextRequest('http://localhost/api/departments/dept-2/users', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-1' }),
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-2' }) });
    expect(response.status).toBe(403);
  });
});
