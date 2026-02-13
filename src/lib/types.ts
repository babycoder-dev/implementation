/**
 * ===========================================
 * 学习管理系统 - 类型定义
 * ===========================================
 */

// ============ 部门相关 ============

/** 部门实体 */
export interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null; // 上级部门，支持层级结构
  leader_id: string | null; // 部门负责人
  created_at: Date;
  updated_at: Date | null;
}

/** 部门创建输入 */
export interface DepartmentCreateInput {
  name: string;
  description?: string;
  parent_id?: string;
  leader_id?: string;
}

/** 部门更新输入 */
export interface DepartmentUpdateInput {
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  leader_id?: string | null;
}

/** 部门树节点（用于层级显示）- SRS-04 */
export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
  userCount: number;
  leader?: {
    id: string;
    name: string;
  };
}

// ============ 用户相关 ============

/** 用户角色 - SRS-04 */
export type UserRole = 'admin' | 'leader' | 'user';

/** 用户状态 - SRS-04 */
export type UserStatus = 'active' | 'disabled';

/** 用户实体 */
export interface User {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  department_id: string | null; // 所属部门
  created_at: Date;
  updated_at: Date | null;
}

/** 用户创建输入 */
export interface UserCreateInput {
  username: string;
  password: string;
  name: string;
  role?: UserRole;
  department_id?: string;
}

/** 用户更新输入 */
export interface UserUpdateInput {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
  department_id?: string | null;
}

// ============ 任务相关 ============

/** 任务状态 - SRS-02 */
export type TaskStatus = 'draft' | 'published' | 'completed' | 'archived' | 'deadline_passed';

/** 任务实体 - SRS-02 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  status: TaskStatus;
  passing_score: number;
  strict_mode: boolean;
  enable_quiz: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date | null;
}

/** 任务创建输入 - SRS-02 */
export interface TaskCreateInput {
  title: string;
  description?: string;
  deadline?: Date;
  passing_score?: number;
  strict_mode?: boolean;
  enable_quiz?: boolean;
}

/** 任务更新输入 - SRS-02 */
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  deadline?: Date | null;
  status?: TaskStatus;
  passing_score?: number;
  strict_mode?: boolean;
  enable_quiz?: boolean;
}

/** 任务详情（含文件列表） - SRS-02 */
export interface TaskWithFiles extends Task {
  files: TaskFile[];
  assignments: TaskAssignment[];
  questions: QuizQuestion[];
  creator?: {
    id: string;
    name: string;
  };
}

/** 用户任务状态（含进度） */
export interface UserTaskStatus {
  task: Task;
  userAssignment: TaskAssignment;
  fileProgress: Map<string, TaskFileProgress>;
  quizSubmitted: boolean;
  quizScore: number | null;
  isCompleted: boolean;
}

// ============ 文件相关 ============

/** 文件类型 - SRS-02 */
export type FileType = 'pdf' | 'video' | 'office';

/** 完成条件类型 - SRS-02 */
export type RequiredCompletion = 'last_page' | 'entire_file';

/** 任务文件实体 - SRS-02 */
export interface TaskFile {
  id: string;
  task_id: string;
  title: string;
  file_url: string;
  original_url: string | null;
  file_type: FileType;
  file_size: number;
  duration: number | null; // 视频时长（秒）
  required_completion: RequiredCompletion;
  order: number;
  converted: boolean;
  created_at: Date;
}

/** 文件上传输入 - SRS-02 */
export interface FileUploadInput {
  title: string;
  file_type: FileType;
  order?: number;
  required_completion?: RequiredCompletion;
}

/** 用户文件学习进度 - SRS-03 */
export interface TaskFileProgress {
  file: TaskFile;
  progress: number; // 0-100
  effective_time: number;
  is_completed: boolean;
  completed_at: Date | null;
  last_accessed: Date | null;
}

// ============ 任务分配相关 ============

/** 任务分配实体 - SRS-02 */
export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assignment_type: 'department' | 'user';
  assigned_by: string | null;
  assigned_at: Date;
  submitted_at: Date | null;
  is_completed: boolean;
}

/** 任务分配创建输入 - SRS-02 */
export interface TaskAssignmentCreateInput {
  task_id: string;
  assignment_type: 'department' | 'user';
  ids: string[];
}

// ============ 测验相关 ============

/** 测验题目实体 */
export interface QuizQuestion {
  id: string;
  task_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order: number;
}

/** 测验题目创建输入 */
export interface QuizQuestionCreateInput {
  question: string;
  options: string[];
  correct_answer: number;
  order?: number;
}

/** 单个答案 */
export interface QuizAnswerInput {
  question_id: string;
  answer: number;
}

/** 测验提交输入 */
export interface QuizSubmitInput {
  task_id: string;
  answers: QuizAnswerInput[];
}

/** 测验提交记录 - SRS-05 */
export interface QuizSubmission {
  id: string;
  task_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  attempt_count: number;
  answers: Record<string, number>; // question_id -> answer
  submitted_at: Date;
}

/** 测验提交输入 - SRS-05 */
export interface QuizSubmitInput {
  task_id: string;
  answers: QuizAnswerInput[];
}

/** 测验结果响应 - SRS-05 */
export interface QuizResult {
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  attempt_count: number;
  questions: {
    id: string;
    question: string;
    options: string[];
    correct_answer: number;
    user_answer: number;
    is_correct: boolean;
  }[];
}

// ============ 学习记录相关 - SRS-03 ============

/** PDF 学习日志动作类型 - SRS-03 */
export type PdfActionType = 'open' | 'page_change' | 'scroll' | 'focus_lost' | 'focus_gained';

/** PDF 学习日志 - SRS-03 */
export interface PdfLearningLog {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  page_num: number;
  scroll_position: number;
  timestamp: Date;
  action_type: PdfActionType;
  session_duration: number; // 会话时长（秒）
  is_active_session: boolean;
}

/** 视频日志动作类型 - SRS-03 */
export type VideoLogAction = 'play' | 'pause' | 'seek' | 'speed_changed' | 'time_update' | 'finish';

/** 视频播放日志 - SRS-03 */
export interface VideoLog {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  timestamp: Date;
  action: VideoLogAction;
  current_time: number;
  playback_speed: number | null;
  is_muted: boolean | null;
  session_duration: number;
}

/** 视频播放进度 - SRS-03 */
export interface VideoProgress {
  id: string;
  user_id: string;
  file_id: string;
  task_id: string;
  current_time: number;
  duration: number;
  progress: number;
  effective_time: number;
  last_updated: Date;
  completed_at: Date | null;
}

/** 学习日志输入 - SRS-03 */
export interface LearningLogInput {
  fileId: string;
  taskId: string;
  pageNum?: number;
  currentTime?: number;
  action: string;
  timeGap?: number;
  isMuted?: boolean;
  playbackRate?: number;
  isHidden?: boolean;
}

/** 学习页面响应 - SRS-03 */
export interface LearningPageResponse {
  task: {
    id: string;
    title: string;
    description: string | null;
    deadline: Date | null;
  };
  files: Array<{
    id: string;
    title: string;
    file_type: FileType;
    file_size: number;
    duration: number | null;
    progress: {
      current_page?: number;
      current_time?: number;
      progress_percent: number;
      effective_time: number;
      is_completed: boolean;
      completed_at: Date | null;
    };
  }>;
  assignment: {
    is_completed: boolean;
    submitted_at: Date | null;
  };
  quiz: {
    enabled: boolean;
    completed: boolean;
    passed: boolean | null;
  };
}

/** 视频验证结果 */
export interface VideoValidationResult {
  isValid: boolean;
  totalWatchTime: number;
  totalVideoDuration: number;
  completionPercentage: number;
  pauseCount: number;
  seekCount: number;
  suspiciousActivities: SuspiciousActivity[];
}

/** PDF 验证结果 */
export interface PdfValidationResult {
  isValid: boolean;
  totalTime: number;
  pagesViewed: number;
  totalPages: number;
  completionPercentage: number;
  suspiciousActivities: SuspiciousActivity[];
}

// ============ 可疑活动相关 ============

/** 可疑活动类型 */
export type SuspiciousActivityType =
  | 'page_switch'
  | 'video_muted'
  | 'video_fast_forward'
  | 'tab_hidden'
  | 'time_gap_anomaly'
  | 'multiple_violations';

/** 可疑活动记录 */
export interface SuspiciousActivity {
  id: string;
  user_id: string;
  file_id: string | null;
  activity_type: SuspiciousActivityType;
  reason: string;
  evidence: Record<string, unknown>;
  created_at: Date;
}

// ============ 报表相关 - SRS-06 ============

/** 报表概览数据 - SRS-06 */
export interface ReportOverview {
  totalUsers: number;
  totalTasks: number;
  completedAssignments: number;
  totalAssignments: number;
  completionRate: number;
  averageScore: number | null;
}

/** 部门报表数据 - SRS-06 */
export interface DepartmentReport {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  assignmentCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number | null;
}

/** 任务报表数据 - SRS-06 */
export interface TaskReport {
  id: string;
  title: string;
  status: TaskStatus;
  deadline: Date | null;
  assignmentCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number | null;
  passRate: number | null;
}

/** 个人学习报表 - SRS-06 */
export interface UserReport {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department_name: string | null;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  latestScore: number | null;
  averageScore: number | null;
  passedQuizzes: number;
}

/** 文件报表数据 - SRS-06 */
export interface FileReport {
  id: string;
  title: string;
  file_type: FileType;
  averageDuration: number; // 秒
  completionRate: number;
  accessCount: number;
}

/** 学习报表导出数据 - SRS-06 */
export interface LearningReportData {
  exportDate: string;
  statistics: {
    totalUsers: number;
    totalTasks: number;
    completedTasks: number;
    averageScore: number;
  };
  learningRecords: LearningRecord[];
}

/** 学习记录 - SRS-06 */
export interface LearningRecord {
  userName: string;
  taskTitle: string;
  completedAt: Date | null;
  score: number | null;
  passed: boolean | null;
  duration: number | null; // 秒
}

/** 测验成绩报表 - SRS-06 */
export interface QuizScoreData {
  userName: string;
  taskTitle: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  submittedAt: Date | null;
}

// ============ API 响应相关 ============

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    message?: string;
  };
  timestamp?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** 认证响应 - SRS-04 */
export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'password_hash'>;
  error?: string;
  token?: string;
}

/** 登录凭据 - SRS-04 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** JWT Payload - SRS-04 */
export interface JWTPayload {
  sub: string; // user id
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** 当前用户信息 - SRS-04 */
export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department_id: string | null;
  department_name?: string;
}

// ============ 工具类型 ============

/** 通用 ID 类型 */
export type Id = string;

/** 通用时间戳 */
export type Timestamp = Date;

/** 可选字段类型 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============ 事件相关 ============

/** 页面可见性状态 */
export type VisibilityState = 'visible' | 'hidden' | 'prerender' | 'unloaded';

/** 用户活动上下文 */
export interface ActivityContext {
  userId: string;
  fileId: string;
  fileType: FileType;
  startTime: Date;
  events: ActivityEvent[];
}

export interface ActivityEvent {
  type: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}
