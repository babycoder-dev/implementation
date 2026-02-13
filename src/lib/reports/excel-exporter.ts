import * as XLSX from 'xlsx';

export interface LearningRecordData {
  userName: string;
  taskTitle: string;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
  duration: number | null;
}

export interface LearningReportData {
  exportDate: string;
  statistics: {
    totalUsers: number;
    totalTasks: number;
    completedTasks: number;
    averageScore: number;
  };
  learningRecords: LearningRecordData[];
}

export interface QuizScoreData {
  userName: string;
  taskTitle: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  submittedAt: string;
}

/**
 * Generate a formatted Excel file with learning report data
 * Contains multiple sheets: Statistics, Learning Records, Quiz Scores
 */
export function generateLearningReport(data: LearningReportData): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Overall Statistics
  const statisticsSheet = XLSX.utils.aoa_to_sheet([
    ['学习系统报表', ''],
    ['导出日期', data.exportDate],
    ['', ''],
    ['总体统计', ''],
    ['总用户数', data.statistics.totalUsers],
    ['总任务数', data.statistics.totalTasks],
    ['已完成任务数', data.statistics.completedTasks],
    ['平均分数', data.statistics.averageScore.toFixed ? data.statistics.averageScore.toFixed(2) : String(data.statistics.averageScore)],
    ['完成率', `${((data.statistics.completedTasks / data.statistics.totalTasks) * 100).toFixed(2)}%`],
  ]);

  // Set column widths for statistics sheet
  statisticsSheet['!cols'] = [{ wch: 20 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, statisticsSheet, '总体统计');

  // Sheet 2: Learning Records
  const learningRecordsHeader = [
    '用户名',
    '任务标题',
    '完成时间',
    '分数',
    '是否通过',
    '学习时长(分钟)',
  ];

  const learningRecordsData = [
    learningRecordsHeader,
    ...data.learningRecords.map((record) => [
      record.userName,
      record.taskTitle,
      record.completedAt ? new Date(record.completedAt).toLocaleString('zh-CN') : '未完成',
      record.score !== null ? String(record.score) : '-',
      record.passed !== null ? (record.passed ? '通过' : '未通过') : '-',
      record.duration !== null ? String(Math.round(record.duration / 60)) : '-',
    ]),
  ];

  const learningRecordsSheet = XLSX.utils.aoa_to_sheet(learningRecordsData);

  // Set column widths for learning records sheet
  learningRecordsSheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
  ];

  // Add header styling (bold)
  const range = XLSX.utils.decode_range(learningRecordsSheet['!ref']!);
  for (let col = 0; col <= range.e.c; col++) {
    const cell = learningRecordsSheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }

  XLSX.utils.book_append_sheet(workbook, learningRecordsSheet, '学习记录');

  // Sheet 3: Quiz Scores (filtered from learning records with scores)
  const quizRecords = data.learningRecords.filter((r) => r.score !== null);

  if (quizRecords.length > 0) {
    const quizScoresHeader = [
      '用户名',
      '任务标题',
      '得分',
      '是否通过',
      '完成时间',
    ];

    const quizScoresData = [
      quizScoresHeader,
      ...quizRecords.map((record) => [
        record.userName,
        record.taskTitle,
        record.score !== null ? String(record.score) : '-',
        record.passed ? '通过' : '未通过',
        record.completedAt ? new Date(record.completedAt).toLocaleString('zh-CN') : '-',
      ]),
    ];

    const quizScoresSheet = XLSX.utils.aoa_to_sheet(quizScoresData);

    // Set column widths for quiz scores sheet
    quizScoresSheet['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
    ];

    // Add header styling (bold)
    const quizRange = XLSX.utils.decode_range(quizScoresSheet['!ref']!);
    for (let col = 0; col <= quizRange.e.c; col++) {
      const cell = quizScoresSheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) {
        cell.s = { font: { bold: true } };
      }
    }

    XLSX.utils.book_append_sheet(workbook, quizScoresSheet, '测验成绩');
  }

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

/**
 * Generate Excel file with quiz scores only
 */
export function generateQuizScoresReport(quizData: QuizScoreData[]): Uint8Array {
  const workbook = XLSX.utils.book_new();

  const header = [
    '用户名',
    '任务标题',
    '得分',
    '总题数',
    '正确答案数',
    '是否通过',
    '提交时间',
  ];

  const data = [
    header,
    ...quizData.map((quiz) => [
      quiz.userName,
      quiz.taskTitle,
      quiz.score.toFixed(0),
      quiz.totalQuestions.toString(),
      quiz.correctAnswers.toString(),
      quiz.passed ? '通过' : '未通过',
      new Date(quiz.submittedAt).toLocaleString('zh-CN'),
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  sheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 20 },
  ];

  // Add header styling
  const range = XLSX.utils.decode_range(sheet['!ref']!);
  for (let col = 0; col <= range.e.c; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }

  XLSX.utils.book_append_sheet(workbook, sheet, '测验成绩');

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}
