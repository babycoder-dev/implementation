import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromHeaders: vi.fn(),
}));

vi.mock('@/lib/api-response', () => ({
  successResponse: vi.fn((data, meta) => ({ success: true, data, meta })),
  errorResponse: vi.fn((error, status) => ({ success: false, error, status })),
}));

import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { POST } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;
const mockSuccessResponse = successResponse as ReturnType<typeof vi.fn>;
const mockErrorResponse = errorResponse as ReturnType<typeof vi.fn>;

describe('POST /api/tasks/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not logged in', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '未登录', status: 401 });
  });

  it('should return 404 if task does not exist', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '任务不存在', status: 404 });
  });

  it('should return 403 if task is not published', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([{ id: 'task-1', status: 'draft', enable_quiz: false, deadline: null }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '任务未发布', status: 403 });
  });

  it('should return 403 if user is not assigned to task', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: false, deadline: null }])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '您未被分配此任务', status: 403 });
  });

  it('should return 400 if task is already completed', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: false, deadline: null }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        is_completed: true,
        submitted_at: '2024-01-01',
      }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '任务已完成', status: 400 });
  });

  it('should validate confirmed must be true', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: false }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(mockErrorResponse).toHaveBeenCalled();
  });

  it('should return 400 if task deadline has passed', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([{
      id: 'task-1',
      status: 'published',
      enable_quiz: false,
      deadline: '2020-01-01'
    }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '任务已过期', status: 400 });
  });

  it('should return 400 if files are not completed', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: false, deadline: null }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        is_completed: false,
        submitted_at: null,
      }])
      .mockResolvedValueOnce([{ id: 'file-1', task_id: 'task-1' }])
      .mockResolvedValueOnce([{ file_id: 'file-1', completed_at: null }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '还有 1 个文件未完成', status: 400 });
  });

  it('should return 400 if quiz is not taken', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: true, deadline: null }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        is_completed: false,
        submitted_at: null,
      }])
      .mockResolvedValueOnce([])  // files query (no files)
      .mockResolvedValueOnce([]);  // quiz submission query (empty - no submission)

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '请先完成测验', status: 400 });
  });

  it('should return 400 if quiz is not passed', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: true, deadline: null }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        is_completed: false,
        submitted_at: null,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'quiz-1', passed: false }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(response).toEqual({ success: false, error: '测验未通过，无法提交任务', status: 400 });
  });

  it('should successfully complete task without quiz', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: false, deadline: null }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        is_completed: false,
        submitted_at: null,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        is_completed: true,
        submitted_at: '2024-01-01T00:00:00Z'
      }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        is_completed: true,
        submitted_at: '2024-01-01T00:00:00Z',
      }),
      { message: '任务已完成' }
    );
  });

  it('should successfully complete task with quiz passed', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'task-1', status: 'published', enable_quiz: true, deadline: null }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        is_completed: false,
        submitted_at: null,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'quiz-1', passed: true }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        is_completed: true,
        submitted_at: '2024-01-01T00:00:00Z'
      }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
    const params = Promise.resolve({ id: 'task-1' });

    const response = await POST(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        is_completed: true,
        submitted_at: '2024-01-01T00:00:00Z',
      }),
      { message: '任务已完成' }
    );
  });
});
