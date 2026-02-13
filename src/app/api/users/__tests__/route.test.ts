import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromHeaders: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
}));

import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { GET, POST } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('should return users list for admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'user-1', username: 'test', name: 'Test User', role: 'user', status: 'active', department_id: null, department_name: null, created_at: '2024-01-01' }
    ]);

    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should filter users by role', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'user-1', username: 'leader1', name: 'Leader One', role: 'leader', status: 'active', department_id: null, department_name: null, created_at: '2024-01-01' }
    ]);

    const request = new NextRequest('http://localhost/api/users?role=leader');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should filter users by status', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'user-1', username: 'test', name: 'Test User', role: 'user', status: 'disabled', department_id: null, department_name: null, created_at: '2024-01-01' }
    ]);

    const request = new NextRequest('http://localhost/api/users?status=disabled');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should support pagination', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'user-1', username: 'test', name: 'Test User', role: 'user', status: 'active', department_id: null, department_name: null, created_at: '2024-01-01' }
    ]);

    const request = new NextRequest('http://localhost/api/users?page=2&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta).toBeDefined();
    expect(data.meta.page).toBe(2);
    expect(data.meta.limit).toBe(5);
  });
});

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should create user successfully', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockResolvedValueOnce([]) // Check username exists
      .mockResolvedValueOnce([]) // Check department exists
      .mockResolvedValueOnce([{ id: 'new-user', username: 'test', name: 'Test', role: 'user', status: 'active', department_id: null, created_at: '2024-01-01' }]);

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password123', name: 'Test User' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 409 if username exists', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([{ id: 'existing-user' }]);

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'existing', password: 'password', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it('should return 400 if username is missing', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ password: 'password', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 if password is missing', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 if name is missing', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should create user with leader role', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockResolvedValueOnce([]) // Check username exists
      .mockResolvedValueOnce([]) // Check department exists
      .mockResolvedValueOnce([{ id: 'new-user', username: 'leader1', name: 'Leader One', role: 'leader', status: 'active', department_id: null, created_at: '2024-01-01' }]);

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'leader1', password: 'password123', name: 'Leader One', role: 'leader' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });
});
