-- 学习管理系统 - 数据库 Schema
-- 基于 SRS-01~06 需求规格文档
-- PostgreSQL 15+
-- 日期: 2026-02-12

-- ============================================
-- 1. 扩展安装
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. 部门表
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- ============================================
-- 3. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- 4. 任务表
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  passing_score INT DEFAULT 100,
  strict_mode BOOLEAN DEFAULT TRUE,
  enable_quiz BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

-- ============================================
-- 5. 任务文件表
-- ============================================
CREATE TABLE IF NOT EXISTS task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  original_url VARCHAR(500),
  file_type VARCHAR(20) NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT,
  required_completion VARCHAR(20) DEFAULT 'last_page',
  "order" INT NOT NULL DEFAULT 0,
  converted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_order ON task_files(task_id, "order");

-- ============================================
-- 6. 任务分配表
-- ============================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(20) NOT NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(is_completed);

-- ============================================
-- 7. 测验题目表
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_task_id ON quiz_questions(task_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(task_id, "order");

-- ============================================
-- 8. 测验提交表
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_task_user ON quiz_submissions(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted ON quiz_submissions(submitted_at);

-- ============================================
-- 9. 文件学习进度表
-- ============================================
CREATE TABLE IF NOT EXISTS file_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES task_files(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- PDF 进度
  current_page INT DEFAULT 0,
  total_pages INT DEFAULT 0,
  scroll_position DECIMAL(5,2) DEFAULT 0,

  -- 视频进度
  "current_time" INT DEFAULT 0,
  duration INT DEFAULT 0,

  -- 通用进度
  progress DECIMAL(5,2) NOT NULL DEFAULT 0,
  effective_time INT NOT NULL DEFAULT 0,

  -- 时间戳
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_file_progress_user_id ON file_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_file_progress_file_id ON file_progress(file_id);
CREATE INDEX IF NOT EXISTS idx_file_progress_task_id ON file_progress(task_id);

-- ============================================
-- 10. 学习日志表
-- ============================================
CREATE TABLE IF NOT EXISTS learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES task_files(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  log_type VARCHAR(20) NOT NULL,
  page_num INT,
  "current_time" INT,
  action VARCHAR(20),
  session_duration INT NOT NULL,
  is_active_session BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_logs_user_id ON learning_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_file_id ON learning_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_task_id ON learning_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_created ON learning_logs(created_at);

-- ============================================
-- 11. 可疑活动记录表
-- ============================================
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  file_id UUID REFERENCES task_files(id),
  activity_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_created ON suspicious_activities(created_at);

-- ============================================
-- 12. 触发器函数
-- ============================================

-- 更新时间戳的通用函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用触发器到所有需要自动更新updated_at的表
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. 初始数据
-- ============================================

-- 创建默认管理员账户（如果不存在）
INSERT INTO users (username, password_hash, name, role, status)
SELECT 'admin', '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '系统管理员', 'admin', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 创建示例部门（如果不存在）
INSERT INTO departments (name, description)
SELECT '技术部', '技术研发部门'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = '技术部');

INSERT INTO departments (name, description)
SELECT '市场部', '市场营销部门'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = '市场部');
