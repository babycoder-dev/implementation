/**
 * Users [id] API Tests - SRS-04
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
import { GET, PUT, DELETE } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

const defaultMock = () => [];
mockSql.mockImplementation(defaultMock);

describe('GET /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(defaultMock);
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/users/user-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 if user not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => []);
    const request = new NextRequest('http://localhost/api/users/user-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(404);
  });

  it('should return user for admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => [{
      id: 'user-1',
      username: 'test',
      name: 'Test User',
      role: 'user',
      status: 'active',
      department_id: null,
      department_name: null,
    }]);
    const request = new NextRequest('http://localhost/api/users/user-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('user-1');
  });

  it('should allow leader to view users in their department', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql
      .mockImplementationOnce(() => [{
        id: 'user-1',
        username: 'test',
        name: 'Test User',
        role: 'user',
        status: 'active',
        department_id: 'dept-1',
        department_name: 'Tech',
      }])
      .mockImplementationOnce(() => [{ department_id: 'dept-1' }]);
    const request = new NextRequest('http://localhost/api/users/user-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(200);
  });

  it('should deny leader access to other department users', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql
      .mockImplementationOnce(() => [{
        id: 'user-1',
        username: 'test',
        name: 'Test User',
        role: 'user',
        status: 'active',
        department_id: 'dept-2',
        department_name: 'Sales',
      }])
      .mockImplementationOnce(() => [{ department_id: 'dept-1' }]);
    const request = new NextRequest('http://localhost/api/users/user-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(403);
  });

  it('should allow user to view themselves', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockImplementation(() => [{
      id: 'user-1',
      username: 'test',
      name: 'Test User',
      role: 'user',
      status: 'active',
      department_id: null,
      department_name: null,
    }]);
    const request = new NextRequest('http://localhost/api/users/user-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(200);
  });

  it('should deny user access to other users', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockImplementation(() => [{
      id: 'user-2',
      username: 'other',
      name: 'Other User',
      role: 'user',
      status: 'active',
      department_id: null,
      department_name: null,
    }]);
    const request = new NextRequest('http://localhost/api/users/user-2');
    const response = await GET(request, { params: Promise.resolve({ id: 'user-2' }) });
    expect(response.status).toBe(403);
  });
});

describe('PUT /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(defaultMock);
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 if user not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => []);
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(404);
  });

  it('should return 403 if non-admin tries to change role', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql.mockImplementation(() => [{ id: 'user-1', department_id: 'dept-1' }]);
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 400 if no fields to update', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => [{ id: 'user-1', department_id: null }]);
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(400);
  });

  it('should return 409 if username already exists', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      const queryStr = strings[0];
      if (queryStr.includes('SELECT id, department_id FROM users WHERE id')) {
        return [{ id: 'user-1', department_id: null }];
      }
      if (queryStr.includes('SELECT id FROM users WHERE username')) {
        return [{ id: 'existing-user' }];
      }
      return [];
    });
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ username: 'existing' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(409);
  });
});

describe('DELETE /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(defaultMock);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 404 if user not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => []);
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'user-1' }) });
    expect(response.status).toBe(404);
  });

  it('should delete user successfully', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => [{ id: 'user-1' }]);
    const request = new NextRequest('http://localhost/api/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'user-1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
