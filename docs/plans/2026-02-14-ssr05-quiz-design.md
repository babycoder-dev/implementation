# SSR05 测验考核模块 - 设计文档

> **日期**: 2026-02-14
> **版本**: v1.0
> **模块**: SSR05 测验考核

---

## 1. 功能概述

为学习任务添加测验考核功能，检验员工学习效果，支持单选题目、自动评分和及格判定。

## 2. 数据库变更

### 2.1 tasks 表扩展

```sql
ALTER TABLE tasks ADD COLUMN passing_score INT DEFAULT 100;
ALTER TABLE tasks ADD COLUMN strict_mode BOOLEAN DEFAULT TRUE;
```

### 2.2 quiz_submissions 表

```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 3. 业务规则

### 3.1 及格判定

| strict_mode | 及格条件 |
|------------|---------|
| TRUE（默认） | score == 100 |
| FALSE | score >= passing_score |

### 3.2 提交限制

| 规则 | 说明 |
|-----|------|
| 最大次数 | 同一任务最多 3 次 |
| 及格后 | 无需再次提交 |

## 4. API 变更

### 4.1 修改 API

| API | 变更 |
|-----|------|
| POST /api/quiz/submit | 添加及格判定、次数限制 |

### 4.2 新增 API

| API | 说明 |
|-----|------|
| GET /api/tasks/[id]/quiz | 获取测验信息（含 passing_score, strict_mode） |

## 5. 测试覆盖率目标

- 单元测试覆盖率: 80%+
- API 端点测试覆盖
