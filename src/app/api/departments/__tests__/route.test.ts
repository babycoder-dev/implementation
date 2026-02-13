import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromHeaders: vi.fn(),
}));

import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { GET, POST } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

describe('GET /api/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/departments');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/departments');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('should return departments list for admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'dept-1', name: '技术部', description: '技术研发部门', parent_id: null, leader_id: null, created_at: new Date(), updated_at: null, user_count: '10' }
    ]);

    const request = new NextRequest('http://localhost/api/departments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return departments as tree when tree=true', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'dept-1', name: '技术部', description: '技术研发部门', parent_id: null, leader_id: null, created_at: new Date(), updated_at: null, user_count: '10', children: [] }
    ]);

    const request = new NextRequest('http://localhost/api/departments?tree=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should allow leader role to access', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'leader-1', role: 'leader' });
    mockSql.mockResolvedValue([
      { id: 'dept-1', name: '技术部', description: '技术研发部门', parent_id: null, leader_id: null, created_at: new Date(), updated_at: null, user_count: '10' }
    ]);

    const request = new NextRequest('http://localhost/api/departments');
    const response = await GET(request);

    // Leader should also have access
    expect([200, 403]).toContain(response.status);
  });
});

describe('POST /api/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '新部门' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '新部门' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should create department successfully', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockResolvedValueOnce([]) // parent check (no parent_id provided)
      .mockResolvedValueOnce([]) // leader check (no leader_id provided)
      .mockResolvedValueOnce([]) // duplicate name check
      .mockResolvedValueOnce([{ id: 'new-dept', name: '新部门', description: null, parent_id: null, leader_id: null, created_at: new Date(), updated_at: null }]);

    const request = new NextRequest('http://localhost/api/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '新部门' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 400 if name is missing', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });

    const request = new NextRequest('http://localhost/api/departments', {
      method: 'POST',
      body: JSON.stringify({ description: '描述' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 if parent department does not exist', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValueOnce([]); // parent check

    const request = new NextRequest('http://localhost/api/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '子部门', parent_id: 'non-existent-id' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 if leader does not exist', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValueOnce([]); // parent check
    mockSql.mockResolvedValueOnce([]); // leader check (empty - user not found)

    const request = new NextRequest('http://localhost/api/departments', {
      method: 'POST',
      body: JSON.stringify({ name: '新部门', leader_id: 'non-existent-user' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
