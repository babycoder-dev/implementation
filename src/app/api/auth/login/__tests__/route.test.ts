import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock function at module level
const mockSqlFn = vi.fn();

// Mock the postgres module
vi.mock('postgres', () => ({
  default: vi.fn(() => mockSqlFn),
}));

// Also mock the db module to return our mock
vi.mock('@/lib/db', () => ({
  sql: mockSqlFn,
  database: mockSqlFn,
}));

// Mock bcrypt for password hashing
vi.mock('bcryptjs', async () => {
  return {
    default: {
      hash: vi.fn(),
      compare: vi.fn(),
    },
    compare: vi.fn(),
    hash: vi.fn(),
  };
});

// Mock auth middleware for createToken
vi.mock('@/lib/auth-middleware', async () => {
  const actual = await vi.importActual('@/lib/auth-middleware');
  return {
    ...actual,
    createToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  };
});

let POST: typeof import('../route').POST;

beforeEach(async () => {
  vi.clearAllMocks();
  const bcrypt = await import('bcryptjs');
  // Default: bcrypt.compare returns false for invalid passwords
  (bcrypt.compare as unknown as Mock).mockResolvedValue(false);
  (bcrypt.hash as unknown as Mock).mockResolvedValue('hashed_password');

  const route = await import('../route');
  POST = route.POST;
});

describe('POST /api/auth/login', () => {
  it('returns error for non-existent user', async () => {
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('SELECT id, username, password_hash')) {
          return []; // No user found
        }
      }
      return [];
    });

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nonexistent', password: 'password123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('returns success for valid demo user', async () => {
    const bcrypt = await import('bcryptjs');
    // Mock bcrypt.compare to return true for 'demo123'
    (bcrypt.compare as unknown as Mock).mockResolvedValue(true);

    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('SELECT id, username, password_hash')) {
          return [{
            id: 'demo-user-id',
            username: 'demo',
            password_hash: '$2a$10$dummy_hash_for_testing',
            name: '测试用户',
            role: 'admin',
            department_id: null,
          }];
        }
      }
      return [];
    });

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo', password: 'demo123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.username).toBe('demo');
  });

  it('returns error for disabled user', async () => {
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('SELECT id, username, password_hash')) {
          return [{
            id: 'disabled-user-id',
            username: 'disabled',
            password_hash: '$2a$10$dummy_hash_for_testing',
            name: '禁用用户',
            role: 'user',
            department_id: null,
          }];
        }
      }
      return [];
    });

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'disabled', password: 'password123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('returns error for invalid credentials', async () => {
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('SELECT id, username, password_hash')) {
          return [{
            id: 'demo-user-id',
            username: 'demo',
            password_hash: '$2a$10$dummy_hash_for_testing',
            name: '测试用户',
            role: 'admin',
            department_id: null,
          }];
        }
      }
      return [];
    });

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo', password: 'wrongpw' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('returns error for missing username', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'demo123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 500 on database error', async () => {
    mockSqlFn.mockRejectedValueOnce(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
