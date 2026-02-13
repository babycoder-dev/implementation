import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

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
let GET: typeof import('../route').GET;

beforeAll(async () => {
  const route = await import('../route');
  GET = route.GET;
});

describe('Admin Reports API', () => {
  const mockDb: Record<string, unknown[]> = {
    overview: [],
    departments: [],
    users: [],
    tasks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock to return our query function
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      // Handle tagged template strings
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];

        // Overview queries
        if (queryStr.includes('COUNT(*) as count FROM users')) {
          return mockDb.overview;
        }
        if (queryStr.includes('COUNT(*) as count FROM tasks')) {
          return mockDb.overview;
        }
        if (queryStr.includes('task_assignments WHERE completed_at IS NOT NULL')) {
          return mockDb.overview;
        }
        if (queryStr.includes('COUNT(*) as count FROM task_assignments')) {
          return mockDb.overview;
        }
        if (queryStr.includes('AVG(score) as avg FROM quiz_submissions')) {
          return mockDb.overview;
        }

        // User queries - check this before department query
        if (queryStr.includes('users u') && queryStr.includes('department_name')) {
          return mockDb.users;
        }

        // Department queries
        if (queryStr.includes('departments d') && !queryStr.includes('department_name')) {
          return mockDb.departments;
        }

        // Task queries
        if (queryStr.includes('tasks t')) {
          return mockDb.tasks;
        }

        return [];
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Overview Report', () => {
    it('should return correct overview statistics', async () => {
      // Setup mock data
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          // Users count
          if (queryStr.includes('FROM users') && queryStr.includes('COUNT(*)')) {
            return [{ count: '100' }];
          }
          // Tasks count
          if (queryStr.includes('FROM tasks') && queryStr.includes('COUNT(*)')) {
            return [{ count: '50' }];
          }
          // Completed assignments - FROM task_assignments WHERE completed_at IS NOT NULL
          if (queryStr.includes('FROM task_assignments') && queryStr.includes('completed_at IS NOT NULL')) {
            return [{ count: '30' }];
          }
          // Total assignments - FROM task_assignments
          if (queryStr.includes('FROM task_assignments') && !queryStr.includes('completed_at')) {
            return [{ count: '50' }];
          }
          // Average score
          if (queryStr.includes('AVG(score)') && queryStr.includes('FROM quiz_submissions')) {
            return [{ avg: '85.5' }];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=overview');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview.totalUsers).toBe(100);
      expect(data.data.overview.totalTasks).toBe(50);
      expect(data.data.overview.completedAssignments).toBe(30);
      expect(data.data.overview.totalAssignments).toBe(50);
      expect(data.data.overview.completionRate).toBe(60);
      expect(data.data.overview.averageScore).toBe(85.5);
    });

    it('should handle empty database', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('COUNT(*)') || queryStr.includes('AVG(')) {
            return [{ count: '0' }];
          }
          if (queryStr.includes('AVG(score)')) {
            return [{ avg: null }];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=overview');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview.totalUsers).toBe(0);
      expect(data.data.overview.totalTasks).toBe(0);
      expect(data.data.overview.completionRate).toBe(0);
      expect(data.data.overview.averageScore).toBeNull();
    });

    it('should calculate completion rate correctly', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          // Users count
          if (queryStr.includes('FROM users') && queryStr.includes('COUNT(*)')) {
            return [{ count: '10' }];
          }
          // Tasks count
          if (queryStr.includes('FROM tasks') && queryStr.includes('COUNT(*)')) {
            return [{ count: '20' }];
          }
          // Completed assignments
          if (queryStr.includes('FROM task_assignments') && queryStr.includes('completed_at IS NOT NULL')) {
            return [{ count: '8' }];
          }
          // Total assignments
          if (queryStr.includes('FROM task_assignments') && !queryStr.includes('completed_at')) {
            return [{ count: '20' }];
          }
          // Average score
          if (queryStr.includes('AVG(score)') && queryStr.includes('FROM quiz_submissions')) {
            return [{ avg: '75' }];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=overview');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.overview.completionRate).toBe(40); // 8/20 = 40%
    });

    it('should default to overview when no type specified', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('COUNT(*) as count FROM users')) {
            return [{ count: '5' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks') && queryStr.includes("status = 'completed'")) {
            return [{ count: '1' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks') && queryStr.includes("status = 'pending'")) {
            return [{ count: '1' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks')) {
            return [{ count: '2' }];
          }
          if (queryStr.includes('AVG(score)')) {
            return [{ avg: '90' }];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview).toBeDefined();
    });
  });

  describe('Departments Report', () => {
    it('should return department statistics', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('departments d') && !queryStr.includes('department_name')) {
            return [
              {
                id: 'dept-1',
                name: '技术部',
                description: '技术部门',
                user_count: '10',
                assignment_count: '50',
                completed_count: '30',
                avg_score: '85.5',
              },
              {
                id: 'dept-2',
                name: '市场部',
                description: '市场部门',
                user_count: '5',
                assignment_count: '20',
                completed_count: '15',
                avg_score: '78.2',
              },
            ];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=departments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.departments).toHaveLength(2);
      expect(data.data.departments[0].name).toBe('技术部');
      expect(data.data.departments[0].userCount).toBe(10);
      expect(data.data.departments[0].completionRate).toBe(60);
    });

    it('should calculate department completion rates', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('departments d') && !queryStr.includes('department_name')) {
            return [
              {
                id: 'dept-1',
                name: 'HR部门',
                description: null,
                user_count: '20',
                assignment_count: '100',
                completed_count: '80',
                avg_score: '90',
              },
            ];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=departments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.departments[0].completionRate).toBe(80);
    });

    it('should handle departments with no assignments', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('departments d') && !queryStr.includes('department_name')) {
            return [
              {
                id: 'dept-empty',
                name: '新部门',
                description: '暂无数据',
                user_count: '5',
                assignment_count: '0',
                completed_count: '0',
                avg_score: null,
              },
            ];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=departments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.departments[0].completionRate).toBe(0);
      expect(data.data.departments[0].averageScore).toBeNull();
    });
  });

  describe('Users Report', () => {
    it('should return user statistics', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('users u') && queryStr.includes('department_name')) {
            return [
              {
                id: 'user-1',
                username: 'zhangsan',
                name: '张三',
                role: 'user',
                department_name: '技术部',
                total_assignments: '10',
                completed_assignments: '8',
                latest_score: '85',
                avg_score: '82.5',
                passed_quizzes: '5',
              },
            ];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].name).toBe('张三');
      expect(data.data.users[0].completionRate).toBe(80);
    });
  });

  describe('Tasks Report', () => {
    it('should return task statistics', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('tasks t')) {
            return [
              {
                id: 'task-1',
                title: '学习React基础',
                status: 'in_progress',
                deadline: '2026-03-01',
                assignment_count: '20',
                completed_count: '15',
                avg_score: '78.5',
                pass_rate: '0.75',
              },
            ];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tasks).toHaveLength(1);
      expect(data.data.tasks[0].title).toBe('学习React基础');
      expect(data.data.tasks[0].completionRate).toBe(75);
      expect(data.data.tasks[0].passRate).toBe(75);
    });

    it('should calculate task pass rates correctly', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('tasks t')) {
            return [
              {
                id: 'task-quiz',
                title: '测验任务',
                status: 'completed',
                deadline: null,
                assignment_count: '10',
                completed_count: '10',
                avg_score: '85',
                pass_rate: '0.8',
              },
            ];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tasks[0].passRate).toBe(80);
    });
  });

  describe('Invalid Report Type', () => {
    it('should return error for invalid report type', async () => {
      const request = new NextRequest('http://localhost/api/admin/reports?type=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('不支持的报告类型');
    });
  });

  describe('Response Structure', () => {
    it('should return proper API response format', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('COUNT(*) as count FROM users')) {
            return [{ count: '10' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks') && queryStr.includes("status = 'completed'")) {
            return [{ count: '2' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks') && queryStr.includes("status = 'pending'")) {
            return [{ count: '6' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks')) {
            return [{ count: '8' }];
          }
          if (queryStr.includes('AVG(score)')) {
            return [{ avg: '75' }];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=overview');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(typeof data.success).toBe('boolean');
    });

    it('should round average scores to 1 decimal place', async () => {
      mockSqlFn.mockImplementation((...args: unknown[]) => {
        if (args.length > 0 && Array.isArray(args[0])) {
          const strings = args[0] as unknown as TemplateStringsArray;
          const queryStr = strings[0];

          if (queryStr.includes('COUNT(*) as count FROM users')) {
            return [{ count: '10' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks') && queryStr.includes("status = 'completed'")) {
            return [{ count: '2' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks') && queryStr.includes("status = 'pending'")) {
            return [{ count: '6' }];
          }
          if (queryStr.includes('COUNT(*) as count FROM tasks')) {
            return [{ count: '8' }];
          }
          if (queryStr.includes('AVG(score)')) {
            return [{ avg: '85.56789' }];
          }
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/admin/reports?type=overview');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.overview.averageScore).toBe(85.6);
    });
  });
});
