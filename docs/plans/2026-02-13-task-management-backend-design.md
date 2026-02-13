# 任务管理模块后端设计文档

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档名称 | 任务管理模块后端设计 |
| 版本 | v1.0 |
| 状态 | 已确认 |
| 日期 | 2026-02-13 |

---

## 1. 概述

本文档描述学习管理系统中任务管理模块的后端 API 设计，完全基于 SRS-01-总体规格.md 和 SRS-02-任务管理.md 需求文档。

---

## 2. API 接口清单

### 2.1 任务 CRUD

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | /api/tasks | 获取任务列表 |
| POST | /api/tasks | 创建任务 |
| GET | /api/tasks/[id] | 获取任务详情 |
| PUT | /api/tasks/[id] | 更新任务 |
| DELETE | /api/tasks/[id] | 删除任务 |

### 2.2 文件管理

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | /api/tasks/[id]/files | 获取文件列表 |
| POST | /api/tasks/[id]/files | 上传文件 |
| DELETE | /api/tasks/[id]/files/[fileId] | 删除文件 |
| PUT | /api/tasks/[id]/files/order | 更新文件排序 |

### 2.3 任务分配

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | /api/tasks/[id]/assignments | 获取分配列表 |
| POST | /api/tasks/[id]/assignments | 添加分配 |
| DELETE | /api/tasks/[id]/assignments | 移除分配 |

### 2.4 测验题目

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | /api/tasks/[id]/quiz | 获取测验题目 |
| POST | /api/tasks/[id]/quiz | 添加测验题目 |
| PUT | /api/tasks/[id]/quiz/[questionId] | 更新测验题目 |
| DELETE | /api/tasks/[id]/quiz/[questionId] | 删除测验题目 |

---

## 3. 接口详细设计

### 3.1 GET /api/tasks

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| status | string | 否 | 状态筛选 |
| search | string | 否 | 搜索关键词 |

**响应示例**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "新员工入职培训",
      "description": "帮助新员工快速了解公司文化和工作流程",
      "status": "published",
      "deadline": "2024-01-31T23:59:59Z",
      "passing_score": 60,
      "strict_mode": true,
      "enable_quiz": true,
      "file_count": 3,
      "assignment_count": 50,
      "created_by": "user-uuid",
      "created_by_name": "管理员",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "timestamp": "2024-01-20T12:00:00Z"
}
```

### 3.2 POST /api/tasks

**请求体**

```json
{
  "title": "新员工入职培训",
  "description": "帮助新员工快速了解公司",
  "deadline": "2024-01-31T23:59:59Z",
  "assignment_type": "department",
  "assignment_ids": ["dept-uuid-1", "dept-uuid-2"],
  "enable_quiz": true,
  "passing_score": 60,
  "strict_mode": true
}
```

**验证规则**

| 字段 | 规则 |
|-----|------|
| title | 1-200字符，必填 |
| description | 最多2000字符 |
| assignment_type | all/department/user，必填 |
| assignment_ids | assignment_type 不为 all 时必填 |
| enable_quiz | 布尔值，默认 false |
| passing_score | 0-100，默认 100 |
| strict_mode | 布尔值，默认 true |

**业务规则**

1. 任务状态默认为 'draft'
2. assignment_type = 'all' 时，分配给所有用户
3. assignment_type = 'department' 时，为部门下所有用户创建分配记录
4. assignment_type = 'user' 时，直接分配给指定用户

### 3.3 GET /api/tasks/[id]

**响应示例**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "新员工入职培训",
    "description": "帮助新员工快速了解公司文化和工作流程",
    "status": "published",
    "deadline": "2024-01-31T23:59:59Z",
    "passing_score": 60,
    "strict_mode": true,
    "enable_quiz": true,
    "created_by": {
      "id": "user-uuid",
      "name": "管理员"
    },
    "files": [
      {
        "id": "file-uuid",
        "title": "公司介绍.pdf",
        "file_type": "pdf",
        "file_size": 1258291,
        "duration": null,
        "order": 1,
        "converted": true
      }
    ],
    "assignments": [
      {
        "user_id": "user-uuid",
        "user_name": "张三",
        "department_name": "技术部",
        "assigned_at": "2024-01-15T10:30:00Z",
        "is_completed": false
      }
    ],
    "quiz_questions": [
      {
        "id": "question-uuid",
        "question": "公司成立于哪一年？",
        "options": ["2010", "2015", "2018", "2020"],
        "correct_answer": 2,
        "order": 1
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-20T12:00:00Z"
}
```

### 3.4 PUT /api/tasks/[id]

**请求体**（可选字段）

```json
{
  "title": "新员工入职培训（2024版）",
  "description": "更新后的描述",
  "deadline": "2024-02-28T23:59:59Z",
  "status": "published",
  "enable_quiz": false,
  "passing_score": 80,
  "strict_mode": false
}
```

**业务规则**

1. 状态流转：draft → published → deadline_passed → archived
2. 发布任务时，必须至少有一个文件
3. 删除任务时，状态变为 deleted（软删除）

### 3.5 POST /api/tasks/[id]/files

**请求**：multipart/form-data

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| file | File | 是 | 上传的文件 |
| title | string | 否 | 文件标题（默认文件名） |
| order | number | 否 | 排序序号 |
| required_completion | string | 否 | 完成条件（默认last_page） |

### 3.6 POST /api/tasks/[id]/assignments

**请求体**

```json
{
  "assignment_type": "department",
  "ids": ["dept-uuid-1", "dept-uuid-2"]
}
```

或

```json
{
  "assignment_type": "user",
  "ids": ["user-uuid-1", "user-uuid-2"]
}
```

### 3.7 POST /api/tasks/[id]/quiz

**请求体**

```json
{
  "question": "公司成立于哪一年？",
  "options": ["2010", "2015", "2018", "2020"],
  "correct_answer": 2,
  "order": 1
}
```

---

## 4. 任务状态流转

```
┌─────────┐                              ┌─────────┐
│  draft  │--- [发布] --->                │published│
└─────────┘              │              └────┬────┘
                        │                   │
                        │                   │--- [超过截止日期] --->
                        │                   │
                       │               ┌────▼────┐
                       │               │deadline_│
                       │               │ passed  │
                       │               └────┬────┘
                       │                    │
                       │                    │--- [归档] --->
┌─────────┐              │               ┌────▼────┐
│ deleted │<-- [删除] ---┘               │ archived│
└─────────┘              │               └─────────┘
                        │
                        │--- [恢复] --->
```

---

## 5. 数据模型

### 5.1 tasks 表（更新）

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  deadline TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  passing_score INT DEFAULT 100,
  strict_mode BOOLEAN DEFAULT TRUE,
  enable_quiz BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- 新增索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
```

### 5.2 task_files 表

```sql
CREATE TABLE task_files (
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
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 5.3 task_assignments 表

```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(20) NOT NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(task_id, user_id)
);
```

### 5.4 quiz_questions 表

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 6. 错误码

| 错误码 | 说明 |
|-------|------|
| 400 | 参数错误（必填项缺失、格式错误） |
| 401 | 未登录或登录已过期 |
| 403 | 无权限操作 |
| 404 | 任务/文件/题目不存在 |
| 409 | 任务名称重复或文件已存在 |
| 500 | 服务器内部错误 |

---

## 7. 权限控制

| 操作 | 管理员 | 部门主管 | 员工 |
|-----|-------|---------|------|
| 创建任务 | ✓ | - | - |
| 编辑任务 | ✓ | - | - |
| 删除任务 | ✓ | - | - |
| 分配任务 | ✓ | 本部门 | - |
| 查看任务 | ✓ | 本部门 | 分配给自己的 |
| 上传文件 | ✓ | - | - |

---

## 8. 验收标准

1. 任务 CRUD 功能完整
2. 文件上传、排序、删除功能正常
3. 任务分配（部门/用户）功能正常
4. 测验题目管理功能正常
5. 任务状态流转符合规范
6. 权限控制正确
7. 错误处理完善
