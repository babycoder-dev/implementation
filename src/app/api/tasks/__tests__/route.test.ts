import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock function at module level
const mockSqlFn = vi.fn();

// Mock the postgres module - include unsafe method
vi.mock('postgres', () => ({
  default: vi.fn(() => mockSqlFn),
}));

// Also mock the db module to return our mock (with unsafe)
const mockSql = Object.assign(mockSqlFn, {
  unsafe: mockSqlFn,
});
vi.mock('@/lib/db', () => ({
  sql: mockSql,
  database: mockSql,
}));

// Mock jose for JWT verification
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
}));

// Helper function to create request with auth headers
function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    user?: {
      userId: string;
      username: string;
      role: string;
    };
  } = {}
): NextRequest {
  const { method = 'GET', body, user } = options;
  const headers = new Headers();

  if (user) {
    headers.set('x-user-id', user.userId);
    headers.set('x-user-name', user.username);
    headers.set('x-user-role', user.role);
  }

  const request = new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
}

// Mock data
const mockAdminUser = {
  userId: 'admin-user-id',
  username: 'admin',
  role: 'admin',
};

const mockRegularUser = {
  userId: 'regular-user-id',
  username: 'user',
  role: 'user',
};

const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'Test description',
  deadline: '2024-12-31T23:59:59Z',
  status: 'draft',
  passing_score: 100,
  strict_mode: true,
  enable_quiz: false,
  created_by: 'admin-user-id',
  created_by_name: 'Admin User',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: null,
};

let GET: typeof import('../route').GET;
let POST: typeof import('../route').POST;
let GET_DETAIL: typeof import('../[id]/route').GET;
let PUT: typeof import('../[id]/route').PUT;
let DELETE: typeof import('../[id]/route').DELETE;

// Setup mock implementation - sql is used as a template tag function
function setupMockImplementation(queryHandler: (query: string) => unknown[]) {
  // Mock the tagged template function behavior
  mockSqlFn.mockImplementation((strings: TemplateStringsArray, ...args: unknown[]) => {
    // Simply join all template parts to reconstruct query
    const queryStr = strings.join('__ARG__');
    return queryHandler(queryStr) ?? [];
  });
  // Also mock unsafe to use the same handler
  mockSql.unsafe = (query: string) => queryHandler(query) ?? [];
}

describe('Tasks API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Default mock returns empty arrays
    setupMockImplementation(() => []);

    // Dynamic import to get route handlers
    const route = await import('../route');
    const detailRoute = await import('../[id]/route');

    GET = route.GET;
    POST = route.POST;
    GET_DETAIL = detailRoute.GET;
    PUT = detailRoute.PUT;
    DELETE = detailRoute.DELETE;
  });

  describe('GET /api/tasks', () => {
    it('returns 401 if not authenticated', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        user: undefined,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('returns task list for authenticated user', async () => {
      setupMockImplementation((query) => {
        // Count query
        if (query.includes('COUNT(*)')) {
          return [{ count: '1' }];
        }
        // Tasks query
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [mockTask];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        user: mockAdminUser,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('admin user can see all status tasks', async () => {
      setupMockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return [{ count: '1' }];
        }
        // Admin user should use 1=1 instead of status filter
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          // Admin uses 1=1 filter, not t.status = 'published'
          if (query.includes('1=1') || !query.includes("t.status = 'published'")) {
            return [mockTask];
          }
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks?status=draft', {
        user: mockAdminUser,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('supports pagination parameters', async () => {
      setupMockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return [{ count: '20' }];
        }
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [];
        }
        return [];
      });

      const request = createAuthenticatedRequest(
        'http://localhost/api/tasks?page=2&limit=20',
        { user: mockAdminUser }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.page).toBe(2);
      expect(data.meta.limit).toBe(20);
      expect(data.meta.total).toBe(20);
      expect(data.meta.totalPages).toBe(1); // 20/20 = 1
    });

    it('returns correct totalPages for multiple pages', async () => {
      setupMockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return [{ count: '55' }];
        }
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [];
        }
        return [];
      });

      const request = createAuthenticatedRequest(
        'http://localhost/api/tasks?page=1&limit=10',
        { user: mockAdminUser }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.total).toBe(55);
      expect(data.meta.totalPages).toBe(6); // 55/10 = 5.5 -> ceil = 6
    });

    it('supports search parameter', async () => {
      setupMockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return [{ count: '0' }];
        }
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [];
        }
        return [];
      });

      const request = createAuthenticatedRequest(
        'http://localhost/api/tasks?search=test',
        { user: mockAdminUser }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('supports status filter', async () => {
      setupMockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return [{ count: '0' }];
        }
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [];
        }
        return [];
      });

      const request = createAuthenticatedRequest(
        'http://localhost/api/tasks?status=published',
        { user: mockAdminUser }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/tasks', () => {
    it('returns 403 if not admin', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: { title: 'Test Task' },
        user: mockRegularUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('returns 403 if not authenticated', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: { title: 'Test Task' },
        user: undefined,
      });

      const response = await POST(request);
      const data = await response.json();

      // Since no auth headers means no user, it should check role which would be undefined
      // The code returns 403 when role !== 'admin', so we expect 403 here
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('creates task with valid data', async () => {
      setupMockImplementation((query) => {
        // Insert task
        if (query.includes('INSERT INTO tasks')) {
          return [mockTask];
        }
        // Get active users for assignment
        if (query.includes('SELECT id FROM users') && !query.includes('department_id')) {
          return [];
        }
        // File count
        if (query.includes('SELECT COUNT(*)') && query.includes('task_files')) {
          return [{ count: '0' }];
        }
        // Assignment count
        if (query.includes('SELECT COUNT(*)') && query.includes('task_assignments')) {
          return [{ count: '0' }];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: {
          title: 'Test Task',
          description: 'Test description',
          passingScore: 100,
          strictMode: true,
          enableQuiz: false,
          assignmentType: 'all',
          assignmentIds: [],
        },
        user: mockAdminUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Test Task');
    });

    it('creates task with all users assigned via batch insert', async () => {
      setupMockImplementation((query) => {
        // Insert task
        if (query.includes('INSERT INTO tasks')) {
          return [mockTask];
        }
        // Get all active users for 'all' assignment
        if (query.includes('SELECT id FROM users') && query.includes("status = 'active'")) {
          return [
            { id: 'user-1' },
            { id: 'user-2' },
            { id: 'user-3' }
          ];
        }
        // Batch insert assignments (using UNNEST)
        if (query.includes('INSERT INTO task_assignments') && query.includes('unnest')) {
          return [{ task_id: mockTask.id, user_id: 'user-1' }];
        }
        // File count
        if (query.includes('SELECT COUNT(*)') && query.includes('task_files')) {
          return [{ count: '0' }];
        }
        // Assignment count
        if (query.includes('SELECT COUNT(*)') && query.includes('task_assignments')) {
          return [{ count: '3' }];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: {
          title: 'Task with all users',
          assignmentType: 'all',
        },
        user: mockAdminUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('validates required title field', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: {
          description: 'Test description',
        },
        user: mockAdminUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('validates title max length', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: {
          title: 'a'.repeat(256),
        },
        user: mockAdminUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 500 when database error occurs on create', async () => {
      setupMockImplementation((query) => {
        // Insert task - simulate database error
        if (query.includes('INSERT INTO tasks')) {
          throw new Error('Database connection failed');
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: {
          title: 'Test Task',
        },
        user: mockAdminUser,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/tasks/[id]', () => {
    it('returns 401 if not authenticated', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        user: undefined,
      });

      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('returns task detail for existing task', async () => {
      const mockTaskWithDetails = {
        ...mockTask,
        created_by_name: 'Admin User',
      };

      setupMockImplementation((query) => {
        // Task query
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [mockTaskWithDetails];
        }
        // Files query
        if (query.includes('SELECT') && query.includes('task_files')) {
          return [];
        }
        // Assignments query
        if (query.includes('SELECT') && query.includes('task_assignments')) {
          return [];
        }
        // Quiz questions query
        if (query.includes('SELECT') && query.includes('quiz_questions')) {
          return [];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        user: mockAdminUser,
      });

      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('task-123');
      expect(data.data.title).toBe('Test Task');
    });

    it('returns 404 for non-existing task', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/non-existing', {
        user: mockAdminUser,
      });

      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: 'non-existing' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('returns 403 for non-admin trying to view draft task', async () => {
      const draftTask = {
        ...mockTask,
        status: 'draft',
      };

      setupMockImplementation((query) => {
        if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
          return [draftTask];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        user: mockRegularUser,
      });

      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    it('returns 403 if not authenticated', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { title: 'Updated Title' },
        user: undefined,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      // When no user is provided, currentUser is null, and role check fails, returns 403
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('returns 403 if not admin', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { title: 'Updated Title' },
        user: mockRegularUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('updates task title successfully', async () => {
      const updatedTask = {
        ...mockTask,
        title: 'Updated Title',
        updated_at: '2024-01-02T00:00:00Z',
      };

      setupMockImplementation((query) => {
        // Select task
        if (query.includes('SELECT') && query.includes('FROM tasks')) {
          return [mockTask];
        }
        // Update task (using unsafe query - need to mock sql.unsafe separately)
        if (query.includes('UPDATE tasks')) {
          return [updatedTask];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { title: 'Updated Title' },
        user: mockAdminUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
    });

    it('validates state transition', async () => {
      setupMockImplementation((query) => {
        if (query.includes('SELECT') && query.includes('FROM tasks')) {
          return [{ ...mockTask, status: 'draft' }];
        }
        return [];
      });

      // Try invalid transition: draft -> archived (not allowed, should be draft -> published first)
      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { status: 'archived' },
        user: mockAdminUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('allows valid state transition draft -> published', async () => {
      const draftTask = { ...mockTask, status: 'draft' };
      const publishedTask = { ...mockTask, status: 'published', updated_at: '2024-01-02T00:00:00Z' };

      setupMockImplementation((query) => {
        // Select task
        if (query.includes('SELECT') && query.includes('FROM tasks') && !query.includes('COUNT')) {
          return [draftTask];
        }
        // Update task
        if (query.includes('UPDATE tasks')) {
          return [publishedTask];
        }
        // File count check for publishing
        if (query.includes('SELECT COUNT(*)') && query.includes('task_files')) {
          return [{ count: '1' }];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { status: 'published' },
        user: mockAdminUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('published');
    });

    it('allows valid state transition completed -> deleted', async () => {
      const completedTask = { ...mockTask, status: 'completed' };
      const deletedTask = { ...mockTask, status: 'deleted', updated_at: '2024-01-02T00:00:00Z' };

      setupMockImplementation((query) => {
        // Select task
        if (query.includes('SELECT') && query.includes('FROM tasks') && !query.includes('COUNT')) {
          return [completedTask];
        }
        // Update task
        if (query.includes('UPDATE tasks')) {
          return [deletedTask];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { status: 'deleted' },
        user: mockAdminUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('deleted');
    });

    it('returns 404 for non-existing task', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/non-existing', {
        method: 'PUT',
        body: { title: 'Updated Title' },
        user: mockAdminUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'non-existing' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('returns 400 when validation error occurs', async () => {
      setupMockImplementation((query) => {
        if (query.includes('SELECT') && query.includes('FROM tasks')) {
          return [mockTask];
        }
        return [];
      });

      // Send invalid data that will fail Zod validation
      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'PUT',
        body: { title: '' },  // Empty title violates min(1)
        user: mockAdminUser,
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('returns 403 if not authenticated', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'DELETE',
        user: undefined,
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      // When no user is provided, currentUser is null, and role check fails, returns 403
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('returns 403 if not admin', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'DELETE',
        user: mockRegularUser,
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('soft deletes task successfully', async () => {
      const deletedTask = { ...mockTask, status: 'deleted' };

      setupMockImplementation((query) => {
        // Select task
        if (query.includes('SELECT') && query.includes('FROM tasks')) {
          return [mockTask];
        }
        // Update task (soft delete)
        if (query.includes('UPDATE tasks')) {
          return [deletedTask];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'DELETE',
        user: mockAdminUser,
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 404 for non-existing task', async () => {
      setupMockImplementation(() => []);

      const request = createAuthenticatedRequest('http://localhost/api/tasks/non-existing', {
        method: 'DELETE',
        user: mockAdminUser,
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existing' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('prevents deletion of already deleted task', async () => {
      const alreadyDeletedTask = { ...mockTask, status: 'deleted' };

      setupMockImplementation((query) => {
        if (query.includes('SELECT') && query.includes('FROM tasks')) {
          return [alreadyDeletedTask];
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'DELETE',
        user: mockAdminUser,
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 500 when database error occurs on delete', async () => {
      setupMockImplementation((query) => {
        // SELECT task
        if (query.includes('SELECT') && query.includes('FROM tasks')) {
          return [mockTask];
        }
        // UPDATE - simulate error
        if (query.includes('UPDATE tasks')) {
          throw new Error('Database connection failed');
        }
        return [];
      });

      const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
        method: 'DELETE',
        user: mockAdminUser,
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'task-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
