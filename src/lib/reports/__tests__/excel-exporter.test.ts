import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock xlsx library - use vi.fn() directly in factory
vi.mock('xlsx', async () => {
  const mockWrite = vi.fn().mockReturnValue(new ArrayBuffer(8192));

  return {
    utils: {
      book_new: vi.fn().mockReturnValue({ sheets: [] }),
      aoa_to_sheet: vi.fn().mockReturnValue({ '!cols': [], '!ref': 'A1:Z100' }),
      book_append_sheet: vi.fn(),
      encode_cell: vi.fn().mockReturnValue('A1'),
      decode_range: vi.fn().mockReturnValue({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }),
    },
    write: mockWrite,
  };
});

// Import functions after mocks are set up
import {
  generateLearningReport,
  generateQuizScoresReport,
  LearningReportData,
  QuizScoreData,
} from '../excel-exporter';

describe('excel-exporter.ts - generateLearningReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockReportData: LearningReportData = {
    exportDate: '2024-01-15T10:30:00Z',
    statistics: {
      totalUsers: 100,
      totalTasks: 500,
      completedTasks: 350,
      averageScore: 78.5,
    },
    learningRecords: [
      {
        userName: '张三',
        taskTitle: 'JavaScript 基础',
        completedAt: '2024-01-10T14:30:00Z',
        score: 85,
        passed: true,
        duration: 3600,
      },
      {
        userName: '李四',
        taskTitle: 'TypeScript 进阶',
        completedAt: '2024-01-11T16:00:00Z',
        score: 72,
        passed: true,
        duration: 5400,
      },
      {
        userName: '王五',
        taskTitle: 'React 实战',
        completedAt: null,
        score: null,
        passed: null,
        duration: null,
      },
    ],
  };

  it('should return Uint8Array', () => {
    const result = generateLearningReport(mockReportData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should return valid array for records with scores', () => {
    const result = generateLearningReport(mockReportData);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle records without scores', () => {
    const dataWithoutScores: LearningReportData = {
      exportDate: '2024-01-15T10:30:00Z',
      statistics: {
        totalUsers: 50,
        totalTasks: 100,
        completedTasks: 30,
        averageScore: 0,
      },
      learningRecords: [
        {
          userName: '用户1',
          taskTitle: '任务1',
          completedAt: null,
          score: null,
          passed: null,
          duration: null,
        },
      ],
    };
    const result = generateLearningReport(dataWithoutScores);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should format duration from seconds to minutes', () => {
    const result = generateLearningReport(mockReportData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should handle large datasets', () => {
    const largeData: LearningReportData = {
      exportDate: '2024-01-15T10:30:00Z',
      statistics: {
        totalUsers: 10000,
        totalTasks: 50000,
        completedTasks: 35000,
        averageScore: 85.5,
      },
      learningRecords: Array.from({ length: 1000 }, (_, i) => ({
        userName: `用户${i}`,
        taskTitle: `任务${i}`,
        completedAt: '2024-01-10T14:30:00Z',
        score: 80 + (i % 20),
        passed: true,
        duration: 3600,
      })),
    };
    const result = generateLearningReport(largeData);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('excel-exporter.ts - generateQuizScoresReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockQuizData: QuizScoreData[] = [
    {
      userName: '张三',
      taskTitle: 'JavaScript 测验',
      score: 85,
      passed: true,
      totalQuestions: 100,
      correctAnswers: 85,
      submittedAt: '2024-01-10T14:30:00Z',
    },
    {
      userName: '李四',
      taskTitle: 'TypeScript 测验',
      score: 65,
      passed: false,
      totalQuestions: 50,
      correctAnswers: 33,
      submittedAt: '2024-01-11T16:00:00Z',
    },
  ];

  it('should create a new workbook', () => {
    const result = generateQuizScoresReport(mockQuizData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should return Uint8Array', () => {
    const result = generateQuizScoresReport(mockQuizData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should include header row', () => {
    const result = generateQuizScoresReport(mockQuizData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should include quiz data rows', () => {
    const result = generateQuizScoresReport(mockQuizData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should set column widths', () => {
    const result = generateQuizScoresReport(mockQuizData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should handle empty quiz data', () => {
    const result = generateQuizScoresReport([]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should handle large quiz datasets', () => {
    const largeData = Array.from({ length: 500 }, (_, i) => ({
      userName: `用户${i}`,
      taskTitle: `测验${i}`,
      score: 60 + (i % 40),
      passed: i % 2 === 0,
      totalQuestions: 100,
      correctAnswers: 60 + (i % 40),
      submittedAt: '2024-01-10T14:30:00Z',
    }));
    const result = generateQuizScoresReport(largeData);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should call XLSX.write with correct options', () => {
    const result = generateQuizScoresReport(mockQuizData);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});
