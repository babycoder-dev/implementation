import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, Mock } from 'vitest';
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

// Mock auth module
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth');
  return {
    ...actual,
    getUserFromHeaders: vi.fn().mockReturnValue({
      userId: 'test-user-id',
      username: 'testuser',
      role: 'user',
    }),
  };
});

// Lazy import route after mocks are applied
let POST: typeof import('../../quiz/submit/route').POST;

beforeAll(async () => {
  const route = await import('../../quiz/submit/route');
  POST = route.POST;
});

describe('Quiz Submit API', () => {
  const mockDb: Record<string, unknown[]> = {
    taskResult: [],
    questionsResult: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock to return our query function
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('SELECT id, passing_score FROM tasks')) {
          return mockDb.taskResult;
        }
        if (queryStr.includes('SELECT * FROM quiz_questions')) {
          return mockDb.questionsResult;
        }
        if (queryStr.includes('INSERT INTO quiz_submissions')) {
          return [];
        }
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully submit quiz answers and return correct score', async () => {
    mockDb.taskResult = [{ id: 'task-1', passing_score: 60 }];
    mockDb.questionsResult = [
      { id: 'q1', task_id: 'task-1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correct_answer: 0 },
      { id: 'q2', task_id: 'task-1', question: 'Q2', options: ['A', 'B', 'C', 'D'], correct_answer: 1 },
      { id: 'q3', task_id: 'task-1', question: 'Q3', options: ['A', 'B', 'C', 'D'], correct_answer: 2 },
    ];

    const request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'task-1',
        answers: [
          { questionId: 'q1', answer: 0 },
          { questionId: 'q2', answer: 1 },
          { questionId: 'q3', answer: 2 },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.score).toBe(100);
    expect(data.data.passed).toBe(true);
    expect(data.data.total_questions).toBe(3);
    expect(data.data.correct_answers).toBe(3);
  });

  it('should calculate correct score for partial answers', async () => {
    mockDb.taskResult = [{ id: 'task-1', passing_score: 70 }];
    mockDb.questionsResult = [
      { id: 'q1', task_id: 'task-1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correct_answer: 0 },
      { id: 'q2', task_id: 'task-1', question: 'Q2', options: ['A', 'B', 'C', 'D'], correct_answer: 1 },
      { id: 'q3', task_id: 'task-1', question: 'Q3', options: ['A', 'B', 'C', 'D'], correct_answer: 2 },
      { id: 'q4', task_id: 'task-1', question: 'Q4', options: ['A', 'B', 'C', 'D'], correct_answer: 3 },
    ];

    const request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'task-1',
        answers: [
          { questionId: 'q1', answer: 0 },
          { questionId: 'q2', answer: 1 },
          { questionId: 'q3', answer: 0 },
          { questionId: 'q4', answer: 3 },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.score).toBe(75);
    expect(data.data.correct_answers).toBe(3);
    expect(data.data.passed).toBe(true);
  });

  it('should handle failing grade when score below passing threshold', async () => {
    mockDb.taskResult = [{ id: 'task-1', passing_score: 80 }];
    mockDb.questionsResult = [
      { id: 'q1', task_id: 'task-1', question: 'Q1', options: ['A', 'B', 'C', 'D'], correct_answer: 0 },
      { id: 'q2', task_id: 'task-1', question: 'Q2', options: ['A', 'B', 'C', 'D'], correct_answer: 1 },
      { id: 'q3', task_id: 'task-1', question: 'Q3', options: ['A', 'B', 'C', 'D'], correct_answer: 2 },
      { id: 'q4', task_id: 'task-1', question: 'Q4', options: ['A', 'B', 'C', 'D'], correct_answer: 3 },
      { id: 'q5', task_id: 'task-1', question: 'Q5', options: ['A', 'B', 'C', 'D'], correct_answer: 0 },
    ];

    const request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'task-1',
        answers: [
          { questionId: 'q1', answer: 0 },
          { questionId: 'q2', answer: 0 },
          { questionId: 'q3', answer: 0 },
          { questionId: 'q4', answer: 0 },
          { questionId: 'q5', answer: 1 },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.score).toBe(20);
    expect(data.data.passed).toBe(false);
  });

  it('should validate required request parameters', async () => {
    // Test missing taskId
    let request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ answers: [] }),
    });
    let response = await POST(request);
    let data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);

    // Test missing answers
    request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-1' }),
    });
    response = await POST(request);
    data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);

    // Test empty answers array
    request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-1', answers: [] }),
    });
    response = await POST(request);
    data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 404 when task does not exist', async () => {
    mockDb.taskResult = [];
    mockDb.questionsResult = [];

    const request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'nonexistent-task',
        answers: [{ questionId: 'q1', answer: 0 }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('should use default passing score when not set', async () => {
    mockDb.taskResult = [{ id: 'task-1', passing_score: null }];
    mockDb.questionsResult = [
      { id: 'q1', task_id: 'task-1', question: 'Q1', options: ['A', 'B'], correct_answer: 0 },
      { id: 'q2', task_id: 'task-1', question: 'Q2', options: ['A', 'B'], correct_answer: 0 },
    ];

    const request = new NextRequest('http://localhost/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'task-1',
        answers: [
          { questionId: 'q1', answer: 0 },
          { questionId: 'q2', answer: 1 },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.passing_score).toBe(60);
    expect(data.data.passed).toBe(false);
  });
});
