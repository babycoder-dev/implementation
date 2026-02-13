import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock functions at module level
const mockQueryFn = vi.fn();
const mockVideoValidate = vi.fn();

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => mockQueryFn),
}));

vi.mock('../../../../lib/learning/video-validator', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/learning/video-validator')>('../../../../lib/learning/video-validator');
  return {
    ...actual,
    videoValidator: {
      ...actual?.videoValidator,
      validate: mockVideoValidate,
    },
  };
});

// Lazy import route after mocks are applied
let POST: typeof import('../../learning/video/progress/route').POST;
let PUT: typeof import('../../learning/video/progress/route').PUT;
let GET: typeof import('../../learning/video/progress/route').GET;

beforeAll(async () => {
  const route = await import('../../learning/video/progress/route');
  POST = route.POST;
  PUT = route.PUT;
  GET = route.GET;
});

describe('Video Progress API', () => {
  const mockDb: Record<string, unknown[]> = {
    logResult: [],
    progressResult: [],
    videoInfoResult: [],
    logsResult: [],
    taskResult: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock to return our query function
    mockQueryFn.mockImplementation((strings: TemplateStringsArray) => {
      const queryStr = strings[0];
      if (queryStr.includes('INSERT INTO video_logs')) {
        return mockDb.logResult;
      }
      if (queryStr.includes('INSERT INTO video_progress')) {
        return [];
      }
      if (queryStr.includes('UPDATE video_progress')) {
        return [];
      }
      if (queryStr.includes('SELECT id, user_id, file_id, current_time, duration')) {
        return mockDb.progressResult;
      }
      if (queryStr.includes('SELECT id, title, file_url')) {
        return mockDb.videoInfoResult;
      }
      if (queryStr.includes('SELECT id, action, current_time, playback_speed')) {
        return mockDb.logsResult;
      }
      if (queryStr.includes('SELECT task_id FROM task_files')) {
        return mockDb.taskResult;
      }
      return [];
    });

    // Reset other mocks
    mockVideoValidate.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/learning/video/progress', () => {
    it('should record video play event successfully', async () => {
      mockDb.logResult = [{ id: 'log-1', timestamp: new Date() }];

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'play',
          currentTime: 0,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logId).toBe('log-1');
    });

    it('should update progress on time_update action', async () => {
      mockDb.logResult = [{ id: 'log-2', timestamp: new Date() }];

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'time_update',
          currentTime: 120,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should calculate and return validation on finish action', async () => {
      mockDb.logResult = [{ id: 'log-3', timestamp: new Date() }];

      mockVideoValidate.mockResolvedValue({
        isValid: true,
        totalWatchTime: 1800,
        totalVideoDuration: 1800,
        completionPercentage: 100,
        pauseCount: 2,
        seekCount: 0,
        suspiciousActivities: [],
      });

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'finish',
          currentTime: 1800,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.validation.isValid).toBe(true);
    });

    it('should handle speed_changed action with playback speed', async () => {
      mockDb.logResult = [{ id: 'log-4', timestamp: new Date() }];

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'speed_changed',
          currentTime: 300,
          playbackSpeed: 1.5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should validate required parameters', async () => {
      // Test missing userId
      let request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({ videoId: 'video-1', action: 'play', currentTime: 0 }),
      });
      let response = await POST(request);
      let data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);

      // Test missing videoId
      request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-1', action: 'play', currentTime: 0 }),
      });
      response = await POST(request);
      data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);

      // Test missing action
      request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-1', videoId: 'video-1', currentTime: 0 }),
      });
      response = await POST(request);
      data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle pause action', async () => {
      mockDb.logResult = [{ id: 'log-5', timestamp: new Date() }];

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'pause',
          currentTime: 450,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle seek action', async () => {
      mockDb.logResult = [{ id: 'log-6', timestamp: new Date() }];

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'seek',
          currentTime: 600,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return validation failure when video not completed', async () => {
      mockDb.logResult = [{ id: 'log-7', timestamp: new Date() }];

      mockVideoValidate.mockResolvedValue({
        isValid: false,
        totalWatchTime: 600,
        totalVideoDuration: 1800,
        completionPercentage: 33,
        pauseCount: 5,
        seekCount: 3,
        suspiciousActivities: [{
          type: 'insufficient_watch_time',
          description: 'Watch time is less than 90% of video duration',
        }],
      });

      const request = new NextRequest('http://localhost/api/learning/video/progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          action: 'finish',
          currentTime: 600,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.validation.isValid).toBe(false);
    });
  });

  describe('PUT /api/learning/video/progress/finish', () => {
    it('should handle video finish with validation', async () => {
      mockDb.taskResult = [{ task_id: 'task-1' }];

      mockVideoValidate.mockResolvedValue({
        isValid: true,
        totalWatchTime: 1800,
        totalVideoDuration: 1800,
        completionPercentage: 100,
        pauseCount: 2,
        seekCount: 0,
        suspiciousActivities: [],
      });

      const request = new NextRequest('http://localhost/api/learning/video/progress/finish', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          finalTime: 1800,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.validation.isValid).toBe(true);
    });

    it('should return appropriate message for failed validation', async () => {
      mockDb.taskResult = [{ task_id: 'task-1' }];

      mockVideoValidate.mockResolvedValue({
        isValid: false,
        totalWatchTime: 900,
        totalVideoDuration: 1800,
        completionPercentage: 50,
        pauseCount: 10,
        seekCount: 5,
        suspiciousActivities: [],
      });

      const request = new NextRequest('http://localhost/api/learning/video/progress/finish', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'video-1',
          finalTime: 900,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.validation.isValid).toBe(false);
    });

    it('should validate required parameters', async () => {
      // Test missing userId
      let request = new NextRequest('http://localhost/api/learning/video/progress/finish', {
        method: 'PUT',
        body: JSON.stringify({ videoId: 'video-1', finalTime: 1800 }),
      });
      let response = await PUT(request);
      let data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);

      // Test missing videoId
      request = new NextRequest('http://localhost/api/learning/video/progress/finish', {
        method: 'PUT',
        body: JSON.stringify({ userId: 'user-1', finalTime: 1800 }),
      });
      response = await PUT(request);
      data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle finish without video file mapping', async () => {
      mockDb.taskResult = [];

      mockVideoValidate.mockResolvedValue({
        isValid: true,
        totalWatchTime: 1800,
        totalVideoDuration: 1800,
        completionPercentage: 100,
        pauseCount: 1,
        seekCount: 0,
        suspiciousActivities: [],
      });

      const request = new NextRequest('http://localhost/api/learning/video/progress/finish', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-1',
          videoId: 'orphaned-video',
          finalTime: 1800,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.validation.isValid).toBe(true);
    });
  });

  describe('GET /api/learning/video/progress', () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockQueryFn.mockImplementation((strings: TemplateStringsArray) => {
        const queryStr = strings[0];
        if (queryStr.includes('SELECT id, user_id, file_id, current_time, duration')) {
          return mockDb.progressResult;
        }
        if (queryStr.includes('SELECT id, title, file_url')) {
          return mockDb.videoInfoResult;
        }
        if (queryStr.includes('SELECT id, action, current_time, playback_speed')) {
          return mockDb.logsResult;
        }
        return [];
      });

      mockVideoValidate.mockResolvedValue(null);
    });

    it('should return video progress for valid userId and videoId', async () => {
      mockDb.progressResult = [{
        id: 'prog-1',
        user_id: 'user-1',
        file_id: 'video-1',
        current_time: 600,
        duration: 1800,
        last_updated: new Date(),
      }];
      mockDb.videoInfoResult = [{
        id: 'video-1',
        title: 'Introduction to React',
        file_url: 'https://example.com/video1.mp4',
        file_type: 'video',
        file_size: 1024000,
      }];
      mockDb.logsResult = [
        {
          id: 'log-1',
          action: 'play',
          current_time: 0,
          playback_speed: 1.0,
          timestamp: new Date(),
        },
        {
          id: 'log-2',
          action: 'pause',
          current_time: 300,
          playback_speed: 1.0,
          timestamp: new Date(),
        },
      ];

      const request = new NextRequest('http://localhost/api/learning/video/progress?userId=user-1&videoId=video-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress.currentTime).toBe(600);
      expect(data.data.video.title).toBe('Introduction to React');
      expect(data.data.logs).toHaveLength(2);
    });

    it('should return null progress when no progress exists', async () => {
      mockDb.progressResult = [];
      mockDb.videoInfoResult = [{
        id: 'video-1',
        title: 'New Video',
        file_url: 'https://example.com/video.mp4',
        file_type: 'video',
        file_size: 500000,
      }];
      mockDb.logsResult = [];

      const request = new NextRequest('http://localhost/api/learning/video/progress?userId=new-user&videoId=video-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress).toBeNull();
      expect(data.data.video.title).toBe('New Video');
      expect(data.data.logs).toHaveLength(0);
    });

    it('should return error when userId is missing', async () => {
      const request = new NextRequest('http://localhost/api/learning/video/progress?videoId=video-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return error when videoId is missing', async () => {
      const request = new NextRequest('http://localhost/api/learning/video/progress?userId=user-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should include validation result', async () => {
      mockDb.progressResult = [{
        id: 'prog-2',
        user_id: 'user-1',
        file_id: 'video-2',
        current_time: 1800,
        duration: 1800,
        last_updated: new Date(),
      }];
      mockDb.videoInfoResult = [{
        id: 'video-2',
        title: 'Complete Video',
        file_url: 'https://example.com/complete.mp4',
        file_type: 'video',
        file_size: 2000000,
      }];
      mockDb.logsResult = [];

      mockVideoValidate.mockResolvedValue({
        isValid: true,
        totalWatchTime: 1800,
        totalVideoDuration: 1800,
        completionPercentage: 100,
        pauseCount: 0,
        seekCount: 0,
        suspiciousActivities: [],
      });

      const request = new NextRequest('http://localhost/api/learning/video/progress?userId=user-1&videoId=video-2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.validation).toBeDefined();
      expect(data.data.validation.isValid).toBe(true);
      expect(data.data.validation.completionPercentage).toBe(100);
    });

    it('should limit logs to 50 entries', async () => {
      mockDb.progressResult = [];
      mockDb.videoInfoResult = [];
      // Create 60 logs
      mockDb.logsResult = Array.from({ length: 60 }, (_, i) => ({
        id: `log-${i}`,
        action: 'time_update',
        current_time: i * 30,
        playback_speed: 1.0,
        timestamp: new Date(),
      }));

      const request = new NextRequest('http://localhost/api/learning/video/progress?userId=user-1&videoId=video-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.logs).toHaveLength(60);
    });
  });
});
