import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, numeric } from 'drizzle-orm/pg-core'

// 用户表
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'), // admin | user
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 学习任务表
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  deadline: timestamp('deadline'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  passingScore: integer('passing_score').default(100),
  strictMode: boolean('strict_mode').default(false),
})

// 任务文件表
export const taskFiles = pgTable('task_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(), // pdf | docx | xlsx | pptx | video
  fileSize: integer('file_size').notNull(),
  order: integer('order').default(0).notNull(),
})

// 任务分配表
export const taskAssignments = pgTable('task_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
})

// 测试题目表
export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  options: jsonb('options').notNull().$type<string[]>(),
  correctAnswer: integer('correct_answer').notNull(), // options 数组中的索引
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 答题记录
// NOTE: isCorrect is computed at query time by comparing answer with correctAnswer from quizQuestions
export const quizAnswers = pgTable('quiz_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => quizQuestions.id, { onDelete: 'cascade' }).notNull(),
  answer: integer('answer').notNull(),
  answeredAt: timestamp('answered_at').defaultNow().notNull(),
})

// PDF 学习日志
export const learningLogs = pgTable('learning_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileId: uuid('file_id').references(() => taskFiles.id, { onDelete: 'cascade' }).notNull(),
  pageNum: integer('page_num').notNull(),
  actionType: text('action_type').notNull(), // open | next_page | finish | time
  duration: integer('duration').notNull().default(0), // 学习时长（秒）
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 视频播放进度
export const videoProgress = pgTable('video_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileId: uuid('file_id').references(() => taskFiles.id, { onDelete: 'cascade' }).notNull(),
  currentTime: integer('current_time').notNull().default(0),
  duration: integer('duration').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
})

// 视频操作日志
export const videoLogs = pgTable('video_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileId: uuid('file_id').references(() => taskFiles.id, { onDelete: 'cascade' }).notNull(),
  action: text('action').notNull(), // play | pause | seek | finish
  currentTime: integer('current_time').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

// 测验提交记录
export const quizSubmissions = pgTable('quiz_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  score: numeric('score', { precision: 5, scale: 2 }).notNull(),
  passed: boolean('passed').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').notNull(),
  attemptCount: integer('attempt_count').default(1).notNull(),
  answers: jsonb('answers').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
})
