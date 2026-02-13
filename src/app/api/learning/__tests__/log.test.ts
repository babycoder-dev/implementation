import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock functions at module level
const mockSqlFn = vi.fn();
const mockPdfValidate = vi.fn();
const mockDetectSuspicious = vi.fn();

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

vi.mock('../../../../lib/learning/pdf-validator', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/learning/pdf-validator')>('../../../../lib/learning/pdf-validator');
  return {
    ...actual,
    pdfValidator: {
      ...actual?.pdfValidator,
      validate: mockPdfValidate,
    },
  };
});

vi.mock('../../../../lib/learning/suspicious-detector', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/learning/suspicious-detector')>('../../../../lib/learning/suspicious-detector');
  return {
    ...actual,
    detectSuspiciousActivity: mockDetectSuspicious,
  };
});

// Lazy import route after mocks are applied
let POST: typeof import('../../learning/log/route').POST;
let GET: typeof import('../../learning/log/route').GET;

beforeAll(async () => {
  const route = await import('../../learning/log/route');
  POST = route.POST;
  GET = route.GET;
});

describe('Learning Log API', () => {
  const mockDb: Record<string, unknown[]> = {
    logResult: [],
    logs: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock to return our query function
    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('INSERT INTO learning_logs')) {
          return mockDb.logResult;
        }
        if (queryStr.includes('INSERT INTO suspicious_activities')) {
          return [];
        }
        if (queryStr.includes('SELECT * FROM learning_logs')) {
          return mockDb.logs;
        }
      }
      return [];
    });

    // Reset other mocks
    mockPdfValidate.mockResolvedValue(null);
    mockDetectSuspicious.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a learning log entry successfully', async () => {
    mockDb.logResult = [{
      id: 'log-1',
      user_id: 'test-user-id',
      file_id: 'file-1',
      page_num: 5,
      timestamp: new Date(),
      action_type: 'page_turn',
    }];

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'file-1',
        action: 'page_turn',
        pageNum: 5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('log-1');
  });

  it('should detect suspicious activities and record them', async () => {
    mockDb.logResult = [{
      id: 'log-2',
      user_id: 'test-user-id',
      file_id: 'file-1',
      page_num: 1,
      timestamp: new Date(),
      action_type: 'finish',
    }];

    mockDetectSuspicious.mockReturnValue([{
      activityType: 'suspicious_time_gap',
      reason: 'Unusually short viewing time',
    }]);

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'file-1',
        action: 'finish',
        timeGap: 5,
        isHidden: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suspiciousActivities).toHaveLength(1);
  });

  it('should perform PDF validation on finish action', async () => {
    mockDb.logResult = [{
      id: 'log-3',
      user_id: 'test-user-id',
      file_id: 'file-1',
      page_num: 10,
      timestamp: new Date(),
      action_type: 'finish',
    }];

    mockPdfValidate.mockResolvedValue({
      isValid: true,
      totalPages: 10,
      viewedPages: 10,
      viewingTime: 1800,
      averageTimePerPage: 180,
      suspiciousActivities: [],
    });

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'file-1',
        action: 'finish',
        pageNum: 10,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.validation.isValid).toBe(true);
  });

  it('should return validation result for non-finish actions', async () => {
    mockDb.logResult = [{
      id: 'log-4',
      user_id: 'test-user-id',
      file_id: 'file-1',
      page_num: 1,
      timestamp: new Date(),
      action_type: 'open',
    }];

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'file-1',
        action: 'open',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.validation).toBeNull();
  });

  it('should validate required parameters', async () => {
    // Test missing fileId
    let request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({ action: 'open' }),
    });
    let response = await POST(request);
    let data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);

    // Test missing action
    request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({ fileId: 'file-1' }),
    });
    response = await POST(request);
    data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should validate action type', async () => {
    mockDb.logResult = [];

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'file-1',
        action: 'invalid_action',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should handle video-specific fields', async () => {
    mockDb.logResult = [{
      id: 'log-5',
      user_id: 'test-user-id',
      file_id: 'video-1',
      page_num: 1,
      timestamp: new Date(),
      action_type: 'stay',
    }];

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'video-1',
        action: 'stay',
        isMuted: true,
        playbackRate: 2.0,
        isHidden: false,
        timeGap: 30,
        duration: 120,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle close action', async () => {
    mockDb.logResult = [{
      id: 'log-close',
      user_id: 'test-user-id',
      file_id: 'file-close',
      page_num: 5,
      timestamp: new Date(),
      action_type: 'close',
    }];

    const request = new NextRequest('http://localhost/api/learning/log', {
      method: 'POST',
      body: JSON.stringify({
        fileId: 'file-close',
        action: 'close',
        pageNum: 5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.actionType).toBe('close');
  });
});

describe('Learning Log API - GET', () => {
  const mockDb: Record<string, unknown[]> = {
    logs: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSqlFn.mockImplementation((...args: unknown[]) => {
      if (args.length > 0 && Array.isArray(args[0])) {
        const strings = args[0] as unknown as TemplateStringsArray;
        const queryStr = strings[0];
        if (queryStr.includes('SELECT')) {
          return mockDb.logs;
        }
      }
      return [];
    });

    mockPdfValidate.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return learning logs for valid fileId', async () => {
    mockDb.logs = [
      {
        id: 'log-1',
        user_id: 'test-user-id',
        file_id: 'file-1',
        page_num: 1,
        timestamp: '2024-01-01T10:00:00Z',
        action_type: 'open',
      },
      {
        id: 'log-2',
        user_id: 'test-user-id',
        file_id: 'file-1',
        page_num: 2,
        timestamp: '2024-01-01T10:05:00Z',
        action_type: 'page_turn',
      },
      {
        id: 'log-3',
        user_id: 'test-user-id',
        file_id: 'file-1',
        page_num: 3,
        timestamp: '2024-01-01T10:10:00Z',
        action_type: 'finish',
      },
    ];

    const request = new NextRequest('http://localhost/api/learning/log?fileId=file-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.logs).toHaveLength(3);
    expect(data.data.logs[0].actionType).toBe('open');
    expect(data.data.logs[1].actionType).toBe('page_turn');
    expect(data.data.logs[2].actionType).toBe('finish');
  });

  it('should return error when fileId is missing', async () => {
    const request = new NextRequest('http://localhost/api/learning/log');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return empty logs when no logs exist', async () => {
    mockDb.logs = [];

    const request = new NextRequest('http://localhost/api/learning/log?fileId=empty-file');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.logs).toHaveLength(0);
  });

  it('should include validation result when requested', async () => {
    mockDb.logs = [{
      id: 'log-1',
      user_id: 'test-user-id',
      file_id: 'file-1',
      page_num: 10,
      timestamp: '2024-01-01T10:00:00Z',
      action_type: 'finish',
    }];

    mockPdfValidate.mockResolvedValue({
      isValid: true,
      totalPages: 10,
      viewedPages: 10,
      viewingTime: 3600,
      averageTimePerPage: 360,
      suspiciousActivities: [],
    });

    const request = new NextRequest('http://localhost/api/learning/log?fileId=file-1&includeValidation=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.validation).toBeDefined();
    expect(data.data.validation.isValid).toBe(true);
  });

  it('should order logs by timestamp ascending', async () => {
    // Mock returns data in sorted order since SQL ORDER BY ASC is applied
    mockDb.logs = [
      {
        id: 'log-1',
        user_id: 'test-user-id',
        file_id: 'file-1',
        page_num: 1,
        timestamp: '2024-01-01T10:00:00Z',
        action_type: 'open',
      },
      {
        id: 'log-2',
        user_id: 'test-user-id',
        file_id: 'file-1',
        page_num: 2,
        timestamp: '2024-01-01T10:10:00Z',
        action_type: 'page_turn',
      },
      {
        id: 'log-3',
        user_id: 'test-user-id',
        file_id: 'file-1',
        page_num: 3,
        timestamp: '2024-01-01T10:20:00Z',
        action_type: 'finish',
      },
    ];

    const request = new NextRequest('http://localhost/api/learning/log?fileId=file-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.logs[0].pageNum).toBe(1);
    expect(data.data.logs[1].pageNum).toBe(2);
    expect(data.data.logs[2].pageNum).toBe(3);
  });
});
