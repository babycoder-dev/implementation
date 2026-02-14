/**
 * Auth Logout API Tests - SRS-04
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a mock response object
const createMockResponse = () => {
  const response = {
    success: true,
    data: null,
    meta: { message: '登出成功' },
    timestamp: new Date().toISOString(),
    cookies: {
      delete: vi.fn(),
      get: vi.fn(),
    },
  };
  return response;
};

vi.mock('@/lib/api-response', () => {
  return {
    successResponse: vi.fn((data, meta) => createMockResponse()),
  };
});

import { POST } from '@/app/api/auth/logout/route';

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success response', async () => {
    const response = await POST();

    expect(response).toBeDefined();
  });

  it('should clear auth token cookie', async () => {
    const response = await POST() as unknown as { cookies: { delete: vi.fn } };

    // Check that cookie delete was called
    expect(response.cookies.delete).toHaveBeenCalledWith('auth_token');
  });

  it('should return success response with message', async () => {
    const response = await POST() as any;

    expect(response.success).toBe(true);
    expect(response.meta?.message).toBe('登出成功');
    expect(response.timestamp).toBeDefined();
  });
});
