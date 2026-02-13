import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// Create mock functions at module level
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

// Lazy import route after mocks are applied
let GET: typeof import('../../admin/dashboard/route').GET;

beforeAll(async () => {
  const route = await import('../../admin/dashboard/route');
  GET = route.GET;
});

describe('Admin Dashboard API', () => {
  const mockDb: Record<string, unknown[]> = {
    userCountResult: [],
    taskCountResult: [],
    completedCountResult: [],
    pendingTaskResult: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock to return our query function
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      // Handle tagged template strings
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('COUNT(*) as count FROM users')) {
          return mockDb.userCountResult;
        }
        if (queryStr.includes('COUNT(*) as count FROM tasks')) {
          if (queryStr.includes("status = 'completed'")) {
            return mockDb.completedCountResult;
          }
          if (queryStr.includes("status = 'pending'")) {
            return mockDb.pendingTaskResult;
          }
          return mockDb.taskCountResult;
        }
        return [];
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct dashboard statistics', async () => {
    mockDb.userCountResult = [{ count: '100' }];
    mockDb.taskCountResult = [{ count: '50' }];
    mockDb.completedCountResult = [{ count: '30' }];
    mockDb.pendingTaskResult = [{ count: '20' }];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.userCount).toBe(100);
    expect(data.data.taskCount).toBe(50);
    expect(data.data.completionRate).toBe(60);
    expect(data.data.pendingTaskCount).toBe(20);
  });

  it('should handle empty database with zero counts', async () => {
    mockDb.userCountResult = [{ count: '0' }];
    mockDb.taskCountResult = [{ count: '0' }];
    mockDb.completedCountResult = [{ count: '0' }];
    mockDb.pendingTaskResult = [{ count: '0' }];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.userCount).toBe(0);
    expect(data.data.taskCount).toBe(0);
    expect(data.data.completionRate).toBe(0);
    expect(data.data.pendingTaskCount).toBe(0);
  });

  it('should calculate completion rate correctly for partial completion', async () => {
    mockDb.userCountResult = [{ count: '50' }];
    mockDb.taskCountResult = [{ count: '100' }];
    mockDb.completedCountResult = [{ count: '25' }];
    mockDb.pendingTaskResult = [{ count: '75' }];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.completionRate).toBe(25);
  });

  it('should round completion rate to nearest integer', async () => {
    mockDb.userCountResult = [{ count: '10' }];
    mockDb.taskCountResult = [{ count: '100' }];
    mockDb.completedCountResult = [{ count: '33' }];
    mockDb.pendingTaskResult = [{ count: '67' }];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.completionRate).toBe(33);
  });

  it('should return 0 completion rate when no tasks exist', async () => {
    mockDb.userCountResult = [{ count: '0' }];
    mockDb.taskCountResult = [{ count: '0' }];
    mockDb.completedCountResult = [{ count: '0' }];
    mockDb.pendingTaskResult = [{ count: '0' }];

    const response = await GET();
    const data = await response.json();

    expect(data.data.completionRate).toBe(0);
  });

  it('should handle large numbers correctly', async () => {
    mockDb.userCountResult = [{ count: '10000' }];
    mockDb.taskCountResult = [{ count: '5000' }];
    mockDb.completedCountResult = [{ count: '2500' }];
    mockDb.pendingTaskResult = [{ count: '2500' }];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.userCount).toBe(10000);
    expect(data.data.taskCount).toBe(5000);
    expect(data.data.completionRate).toBe(50);
  });

  it('should return success response with proper data structure', async () => {
    mockDb.userCountResult = [{ count: '5' }];
    mockDb.taskCountResult = [{ count: '10' }];
    mockDb.completedCountResult = [{ count: '5' }];
    mockDb.pendingTaskResult = [{ count: '5' }];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('userCount');
    expect(data.data).toHaveProperty('taskCount');
    expect(data.data).toHaveProperty('completionRate');
    expect(data.data).toHaveProperty('pendingTaskCount');
    expect(typeof data.data.userCount).toBe('number');
    expect(typeof data.data.taskCount).toBe('number');
  });
});
