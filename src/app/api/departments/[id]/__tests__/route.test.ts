/**
 * Departments [id] API Tests - SRS-04
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
import { GET, PUT, DELETE } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

const defaultMock = () => [];
mockSql.mockImplementation(defaultMock);

describe('GET /api/departments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(defaultMock);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/departments/dept-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 403 if leader', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    const request = new NextRequest('http://localhost/api/departments/dept-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 404 if department not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => []);
    const request = new NextRequest('http://localhost/api/departments/dept-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(404);
  });

  it('should return department with members for admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockImplementationOnce(() => [{
        id: 'dept-1',
        name: 'Tech',
        description: 'Tech Dept',
        parent_id: null,
        leader_id: null,
        user_count: '5',
        created_at: '2024-01-01',
      }])
      .mockImplementationOnce(() => [
        { id: 'user-1', username: 'dev1', name: 'Dev One', role: 'user', status: 'active', created_at: '2024-01-01' },
      ]);
    const request = new NextRequest('http://localhost/api/departments/dept-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'dept-1' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('dept-1');
  });
});

describe('PUT /api/departments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(defaultMock);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 403 if leader', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 404 if department not found', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockImplementation(() => []);
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(404);
  });

  it('should return 400 if department sets itself as parent', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockImplementationOnce(() => [{ id: 'dept-1', parent_id: null }])
      .mockImplementationOnce(() => [{ name: 'Tech', description: null, parent_id: null, leader_id: null }]);
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'PUT',
      body: JSON.stringify({ parent_id: 'dept-1' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(400);
  });

  it('should return 400 if no fields to update', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockImplementationOnce(() => [{ id: 'dept-1', parent_id: null }])
      .mockImplementationOnce(() => [{ name: 'Tech', description: null, parent_id: null, leader_id: null }]);
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(400);
  });

});

describe('DELETE /api/departments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(defaultMock);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(403);
  });

  it('should return 400 if has child departments', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockImplementationOnce(() => [{ id: 'dept-1' }])
      .mockImplementationOnce(() => [{ id: 'child-dept' }]);
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(400);
  });

  it('should return 400 if has users', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockImplementationOnce(() => [{ id: 'dept-1' }])
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [{ id: 'user-1' }]);
    const request = new NextRequest('http://localhost/api/departments/dept-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'dept-1' }) });
    expect(response.status).toBe(400);
  });

});
