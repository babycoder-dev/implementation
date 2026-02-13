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

describe('GET /api/learning/progress/[fileId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not logged in', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/learning/progress/file-1');
    const params = Promise.resolve({ fileId: 'file-1' });

    const response = await GET(request, { params });

    expect(response).toEqual({ success: false, error: '未登录', status: 401 });
  });

  it('should return 404 if file does not exist', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/learning/progress/file-1');
    const params = Promise.resolve({ fileId: 'file-1' });

    const response = await GET(request, { params });

    expect(response).toEqual({ success: false, error: '文件不存在', status: 404 });
  });

  it('should return empty progress if no progress exists', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'file-1', file_type: 'pdf' }])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/learning/progress/file-1');
    const params = Promise.resolve({ fileId: 'file-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0].progress_percent).toBe(0);
    expect(callArgs[0].is_completed).toBe(false);
    expect(callArgs[0].effective_time).toBe(0);
  });

  it('should return progress for PDF file', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'file-1', file_type: 'pdf' }])
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
        last_accessed: '2024-01-02',
      }]);

    const request = new NextRequest('http://localhost/api/learning/progress/file-1');
    const params = Promise.resolve({ fileId: 'file-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0].current_page).toBe(5);
    expect(callArgs[0].progress_percent).toBe(50);
  });

  it('should return progress for video file', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'file-1', file_type: 'video' }])
      .mockResolvedValueOnce([{
        id: 'progress-1',
        user_id: 'user-1',
        file_id: 'file-1',
        task_id: 'task-1',
        current_page: 0,
        total_pages: 0,
        scroll_position: 0,
        current_time: 300,
        duration: 600,
        progress: 50,
        effective_time: 300,
        started_at: '2024-01-01',
        completed_at: null,
        last_accessed: '2024-01-02',
      }]);

    const request = new NextRequest('http://localhost/api/learning/progress/file-1');
    const params = Promise.resolve({ fileId: 'file-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0].current_time).toBe(300);
    expect(callArgs[0].progress_percent).toBe(50);
  });

  it('should return completed status correctly', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    mockSql
      .mockResolvedValueOnce([{ id: 'file-1', file_type: 'pdf' }])
      .mockResolvedValueOnce([{
        id: 'progress-1',
        user_id: 'user-1',
        file_id: 'file-1',
        task_id: 'task-1',
        current_page: 10,
        total_pages: 10,
        scroll_position: 1,
        current_time: 0,
        duration: 0,
        progress: 100,
        effective_time: 600,
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T10:00:00Z',
        last_accessed: '2024-01-01T10:00:00Z',
      }]);

    const request = new NextRequest('http://localhost/api/learning/progress/file-1');
    const params = Promise.resolve({ fileId: 'file-1' });

    const response = await GET(request, { params });

    expect(mockSuccessResponse).toHaveBeenCalled();
    const callArgs = mockSuccessResponse.mock.calls[0];
    expect(callArgs[0].is_completed).toBe(true);
    expect(callArgs[0].completed_at).toBe('2024-01-01T10:00:00Z');
  });
});
