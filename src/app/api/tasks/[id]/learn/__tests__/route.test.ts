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
import { GET } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;
const mockSuccessResponse = successResponse as ReturnType<typeof vi.fn>;
const mockErrorResponse = errorResponse as ReturnType<typeof vi.fn>;

describe('GET /api/tasks/[id]/learn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not logged in', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/tasks/123/learn');
    const params = Promise.resolve({ id: '123' });

    const response = await GET(request, { params });

    expect(response).toEqual({ success: false, error: '未登录', status: 401 });
    expect(mockErrorResponse).toHaveBeenCalledWith('未登录', 401);
  });

  it('should return 404 if task does not exist', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tasks/123/learn');
    const params = Promise.resolve({ id: '123' });

    const response = await GET(request, { params });

    expect(response).toEqual({ success: false, error: '任务不存在', status: 404 });
  });

  it('should return 403 if task is not published', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([{
      id: 'task-1',
      title: 'Test Task',
      description: 'Test',
      deadline: null,
      status: 'draft',
      passing_score: 100,
      strict_mode: true,
      enable_quiz: false,
      created_at: '2024-01-01',
    }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/learn');
    const params = Promise.resolve({ id: 'task-1' });

    const response = await GET(request, { params });

    expect(response).toEqual({ success: false, error: '任务未发布', status: 403 });
  });

  it('should return learning details for published task', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });

    mockSql
      .mockResolvedValueOnce([{
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        deadline: '2024-12-31T23:59:59Z',
        status: 'published',
        passing_score: 100,
        strict_mode: true,
        enable_quiz: false,
        created_at: '2024-01-01',
      }])
      .mockResolvedValueOnce([{
        id: 'file-1',
        task_id: 'task-1',
        title: 'Test PDF',
        file_url: '/files/test.pdf',
        original_url: null,
        file_type: 'pdf',
        file_size: 1024,
        duration: null,
        total_pages: 10,
        order: 1,
        converted: true,
      }])
      .mockResolvedValueOnce([{
        id: 'assign-1',
        task_id: 'task-1',
        user_id: 'user-1',
        assigned_at: '2024-01-01',
        submitted_at: null,
        is_completed: false,
      }])
      .mockResolvedValueOnce([{
        id: 'progress-1',
        user_id: 'user-1',
        file_id: 'file-1',
        task_id: 'task-1',
        current_page: 5,
        total_pages: 10,
        scroll_position: 0.5,
        current_time: 0,
        duration: 0,
        progress: 50,
        effective_time: 300,
        started_at: '2024-01-01',
        completed_at: null,
        last_accessed: '2024-01-01',
      }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/learn');
    const params = Promise.resolve({ id: 'task-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0]).toHaveProperty('task');
    expect(callArgs[0]).toHaveProperty('files');
    expect(callArgs[0]).toHaveProperty('assignment');
    expect(callArgs[0]).toHaveProperty('quiz');
  });

  it('should handle task with quiz enabled', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });

    mockSql
      .mockResolvedValueOnce([{
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        deadline: '2024-12-31T23:59:59Z',
        status: 'published',
        passing_score: 100,
        strict_mode: true,
        enable_quiz: true,
        created_at: '2024-01-01',
      }])
      .mockResolvedValueOnce([{
        id: 'file-1',
        task_id: 'task-1',
        title: 'Test PDF',
        file_url: '/files/test.pdf',
        original_url: null,
        file_type: 'pdf',
        file_size: 1024,
        duration: null,
        total_pages: 10,
        order: 1,
        converted: true,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'quiz-1',
        task_id: 'task-1',
        user_id: 'user-1',
        score: 80,
        passed: true,
        total_questions: 5,
        submitted_at: '2024-01-02',
      }]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/learn');
    const params = Promise.resolve({ id: 'task-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0].quiz.enabled).toBe(true);
    expect(callArgs[0].quiz.completed).toBe(true);
  });

  it('should return empty progress for files without progress records', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });

    mockSql
      .mockResolvedValueOnce([{
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        deadline: '2024-12-31T23:59:59Z',
        status: 'published',
        passing_score: 100,
        strict_mode: true,
        enable_quiz: false,
        created_at: '2024-01-01',
      }])
      .mockResolvedValueOnce([{
        id: 'file-1',
        task_id: 'task-1',
        title: 'Test PDF',
        file_url: '/files/test.pdf',
        original_url: null,
        file_type: 'pdf',
        file_size: 1024,
        duration: null,
        total_pages: 10,
        order: 1,
        converted: true,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/tasks/task-1/learn');
    const params = Promise.resolve({ id: 'task-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0].files[0].progress.progress_percent).toBe(0);
    expect(callArgs[0].files[0].progress.is_completed).toBe(false);
  });

  it('should handle error and return 500', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/tasks/task-1/learn');
    const params = Promise.resolve({ id: 'task-1' });

    const response = await GET(request, { params });

    expect(mockErrorResponse).toHaveBeenCalledWith('获取学习详情失败', 500);
  });
});
