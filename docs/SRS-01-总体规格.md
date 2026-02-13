# 学习管理系统 - 需求规格文档

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档名称 | 学习管理系统 - 总体规格 |
| 版本 | v1.1 |
| 状态 | 已确认 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [用户角色](#3-用户角色)
4. [功能模块概述](#4-功能模块概述)
5. [数据模型](#5-数据模型)
6. [API 接口概述](#6-api-接口概述)
7. [业务流程](#7-业务流程)
8. [非功能性需求](#8-非功能性需求)
9. [测验功能补充说明](#9-测验功能补充说明)

---

## 1. 项目概述

### 1.1 项目背景

企业内部员工日常学习培训管理系统，旨在帮助企业高效组织、管理和追踪员工的培训学习过程。系统支持任务分配、学习进度追踪、测验考核及数据分析，为企业培训提供完整的数字化解决方案。

### 1.2 项目目标

- **任务管理**：管理员可创建学习任务并分配给指定员工或部门
- **学习追踪**：记录员工学习行为，计算有效学习时长
- **测验考核**：支持添加测验题目，检验学习效果
- **数据分析**：提供部门/个人学习报表，追踪培训成效

### 1.3 适用范围

本需求规格文档适用于学习管理系统的设计、开发、测试及部署全生命周期。

---

## 2. 技术架构

### 2.1 技术栈

| 技术 | 用途 | 版本/配置 |
|-----|------|----------|
| Next.js 14 | 前端/后端框架（App Router） | 14.x |
| TypeScript | 类型安全 | 5.x |
| PostgreSQL | 关系型数据库（本地部署） | 15+ |
| MinIO | 对象存储（学习文件，本地 Docker 部署） | 最新版 |
| shadcn/ui | UI 组件库 | 最新版 |
| Tailwind CSS | 样式框架 | 3.x |
| Vitest | 单元测试 | 2.x |
| Playwright | E2E 测试 | 1.x |
| JWT | 认证令牌 | - |

### 2.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端层                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Web 浏览器                              │    │
│  │    (Chrome 109+ / Win7-32位 及以上兼容性)          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 应用层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  页面路由    │  │  API 路由   │  │  组件库     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   PostgreSQL  │  │     MinIO     │  │    本地部署   │
│  (本地 Docker │  │  (本地 Docker │  │              │
│   或直接安装)  │   │   或直接安装) │  │              │
└───────────────┘  └───────────────┘  └───────────────┘
```

### 2.3 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # 管理后台页面（需登录）
│   │   ├── departments/   # 部门管理
│   │   ├── users/         # 用户管理
│   │   ├── tasks/        # 任务管理
│   │   └── reports/       # 报表统计
│   ├── auth/             # 认证相关页面
│   │   └── login/        # 登录页
│   ├── tasks/            # 学习任务页面
│   │   └── [id]/         # 任务详情
│   │       └── learn/    # 学习页面
│   └── api/              # API 路由
│       ├── auth/         # 认证 API
│       ├── departments/  # 部门 API
│       ├── users/        # 用户 API
│       ├── tasks/        # 任务 API
│       ├── learning/     # 学习追踪 API
│       ├── quiz/         # 测验 API
│       └── reports/      # 报表 API
├── components/           # React 组件
│   ├── ui/              # shadcn/ui 组件
│   ├── navbar.tsx       # 导航栏
│   ├── PDFViewer.tsx    # PDF 查看器
│   └── VideoPlayer.tsx  # 视频播放器
├── lib/                  # 工具库
│   ├── types.ts         # TypeScript 类型定义
│   ├── utils.ts         # 通用工具函数
│   ├── db.ts            # 数据库连接
│   ├── auth.ts          # 认证相关
│   └── learning/        # 学习追踪模块
└── tests/               # 测试文件
```

### 2.4 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                     服务器（本地）                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │                    Docker Compose                   ││
│  │  ┌──────────────┐  ┌──────────────┐                ││
│  │  │  PostgreSQL  │  │    MinIO     │                ││
│  │  │   :5432      │  │  :9000 :9001 │                ││
│  │  └──────────────┘  └──────────────┘                ││
│  └─────────────────────────────────────────────────────┘│
│                        │                                │
│                        ▼                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Next.js 应用 (npm run start)           ││
│  │                   端口: 3000                        ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 3. 用户角色

### 3.1 角色定义

| 角色 | 标识 | 描述 |
|-----|------|------|
| 管理员 | admin | 最高权限，管理所有用户、部门、任务、文件 |
| 部门主管 | leader | 查看本部门员工学习进度和成绩 |
| 员工 | user | 查看分配的任务，完成学习 |

### 3.2 权限矩阵

| 功能 | 管理员 | 部门主管 | 员工 |
|-----|-------|---------|------|
| 部门管理（CRUD） | 全部 | - | - |
| 用户管理 | 全部 | 本部门人员调整 | - |
| 任务管理（创建/编辑/删除） | 全部 | - | - |
| 任务分配 | 全部 | 本部门 | - |
| 查看所有学习进度 | 全部 | 本部门 | 本人 |
| 部门报表 | 全部 | 本部门 | - |
| 个人学习报表 | 全部 | 全部 | 本人 |
| 学习任务 | 分配后可见 | 分配后可见 | 分配后可见 |
| 测验答题 | 分配后可见 | 分配后可见 | 分配后可见 |

### 3.3 用户属性

| 字段 | 类型 | 描述 |
|-----|------|------|
| id | UUID | 用户唯一标识 |
| username | string | 登录用户名 |
| password_hash | string | 密码哈希 |
| name | string | 真实姓名 |
| role | enum | 角色（admin/leader/user） |
| department_id | UUID | 所属部门 |
| status | enum | 状态（active/disabled） |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 3.4 部门属性

| 字段 | 类型 | 描述 |
|-----|------|------|
| id | UUID | 部门唯一标识 |
| name | string | 部门名称 |
| description | string | 部门描述 |
| parent_id | UUID | 上级部门（支持多级部门） |
| leader_id | UUID | 部门负责人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 4. 功能模块概述

### 4.1 功能清单

| 模块 | 功能点 | 优先级 | 描述 |
|-----|-------|-------|------|
| 用户认证 | 用户登录 | P0 | 用户登录系统 |
| 用户认证 | 用户登出 | P0 | 用户退出系统 |
| 用户认证 | 会话管理 | P0 | JWT Token 认证 |
| 部门管理 | 部门列表 | P0 | 查看所有部门 |
| 部门管理 | 创建部门 | P0 | 新增部门 |
| 部门管理 | 编辑部门 | P1 | 修改部门信息 |
| 部门管理 | 删除部门 | P1 | 删除部门 |
| 部门管理 | 部门人员调整 | P1 | 部门人员增删 |
| 用户管理 | 用户列表 | P0 | 查看所有用户 |
| 用户管理 | 创建用户 | P0 | 新增用户 |
| 用户管理 | 编辑用户 | P1 | 修改用户信息 |
| 用户管理 | 删除/禁用用户 | P1 | 管理用户状态 |
| 任务管理 | 创建任务 | P0 | 创建学习任务 |
| 任务管理 | 任务列表 | P0 | 查看任务列表 |
| 任务管理 | 编辑任务 | P1 | 修改任务信息 |
| 任务管理 | 删除任务 | P1 | 删除任务 |
| 任务管理 | 上传文件 | P0 | 上传学习资料 |
| 任务管理 | 分配任务 | P0 | 分配给用户/部门 |
| 任务管理 | 添加测验 | P1 | 添加考核题目 |
| 学习追踪 | 学习页面 | P0 | 学习主页面 |
| 学习追踪 | PDF 阅读 | P0 | PDF 文件阅读 |
| 学习追踪 | 视频播放 | P0 | 视频文件播放 |
| 学习追踪 | 进度记录 | P0 | 记录学习进度 |
| 学习追踪 | 有效时间计算 | P0 | 计算有效学习时长 |
| 学习追踪 | 提交完成任务 | P0 | 用户确认任务完成 |
| 测验考核 | 答题页面 | P1 | 测验答题界面 |
| 测验考核 | 提交测验 | P1 | 提交答案 |
| 测验考核 | 评分判定 | P1 | 自动评分 |
| 报表统计 | 任务完成率 | P0 | 任务完成统计 |
| 报表统计 | 部门报表 | P0 | 部门学习情况 |
| 报表统计 | 个人明细 | P0 | 个人学习记录 |
| 报表统计 | 文件数据总览 | P1 | 文件学习统计 |

### 4.2 优先级说明

| 优先级 | 说明 |
|-------|------|
| P0 | 核心功能，必须实现 |
| P1 | 重要功能，应该实现 |
| P2 | 增强功能，可以后续实现 |

---

## 5. 数据模型

### 5.1 实体关系图

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│ departments │       │   task_assignments │    │    tasks    │
└──────┬──────┘       └─────────────────┘       └──────┬──────┘
       │                                                  │
       │                     ┌─────────────┐              │
       │                     │    users   │◀─────────────┘
       │                     └──────┬──────┘
       │                            │
       │          ┌─────────────────┼─────────────────┐
       │          ▼                 ▼                 │
       │   ┌─────────────┐   ┌─────────────┐    ┌─────────────┐
       └──│ quiz_submissions │◀─│ file_progress │   │quiz_questions│
           └─────────────┘   └─────────────┘    └─────────────┘
```

### 5.2 核心表结构

#### 5.2.1 departments（部门表）

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES departments(id),
  leader_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### 5.2.2 users（用户表）

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  department_id UUID REFERENCES departments(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### 5.2.3 tasks（任务表）

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  deadline TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  passing_score INT DEFAULT 100,  -- 默认为100分（全部答对）
  strict_mode BOOLEAN DEFAULT TRUE,  -- TRUE=必须全对, FALSE=支持部分正确率
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### 5.2.4 task_files（任务文件表）

```sql
CREATE TABLE task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  original_url VARCHAR(500),
  file_type VARCHAR(20) NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT,  -- 视频时长（秒）
  required_completion VARCHAR(20) DEFAULT 'last_page',  -- last_page=最后一页/播放完
  "order" INT NOT NULL DEFAULT 0,
  converted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 5.2.5 task_assignments（任务分配表）

```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(20) NOT NULL,  -- 'department' | 'user'
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP,  -- 用户提交完成时间
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(task_id, user_id)
);
```

#### 5.2.6 file_progress（文件学习进度表）

```sql
CREATE TABLE file_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES task_files(id) ON DELETE CASCADE,
  progress DECIMAL(5,2) NOT NULL DEFAULT 0,  -- 0-100
  effective_time INT NOT NULL DEFAULT 0,  -- 有效学习时长（秒）
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);
```

#### 5.2.7 quiz_questions（测验题目表）

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,  -- ["选项1", "选项2", ...]
  correct_answer INT NOT NULL,  -- 正确答案索引
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 5.2.8 quiz_submissions（测验提交表）

```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 6. API 接口概述

### 6.1 API 基础信息

| 项目 | 内容 |
|-----|------|
| Base URL | /api |
| 认证方式 | JWT (httpOnly Cookie) |
| 响应格式 | JSON |
| 错误码 | 200 成功, 400 参数错误, 401 未认证, 403 无权限, 404 未找到, 500 服务器错误 |

### 6.2 API 路由结构

```
/api
├── auth
│   ├── login        POST   # 用户登录
│   ├── logout       POST   # 用户登出
│   └── me           GET    # 获取当前用户信息
├── departments
│   ├── GET           # 获取部门列表
│   ├── POST          # 创建部门
│   └── [id]
│       ├── GET       # 获取部门详情
│       ├── PUT       # 更新部门
│       ├── DELETE    # 删除部门
│       └── users     # 获取部门成员 / 调整成员
├── users
│   ├── GET           # 获取用户列表
│   ├── POST          # 创建用户
│   └── [id]
│       ├── GET       # 获取用户详情
│       ├── PUT       # 更新用户
│       └── DELETE    # 删除用户
├── tasks
│   ├── GET           # 获取任务列表
│   ├── POST          # 创建任务
│   └── [id]
│       ├── GET       # 获取任务详情
│       ├── PUT       # 更新任务
│       ├── DELETE    # 删除任务
│       ├── files/    # 任务文件管理
│       ├── assignments/  # 任务分配管理
│       ├── quiz/      # 测验题目管理
│       └── learn/    # 获取学习数据
├── learning
│   ├── log          POST   # 记录学习日志
│   ├── video-logs   POST   # 视频播放日志
│   ├── video-progress POST  # 视频进度更新
│   ├── progress     GET   # 获取学习进度
│   └── complete     POST  # 提交任务完成确认
├── quiz
│   ├── submit       POST   # 提交测验答案
│   └── [taskId]     GET   # 获取任务测验题目
└── reports
    ├── tasks        GET   # 任务完成率报表
    ├── department   GET   # 部门报表
    ├── user         GET   # 个人学习报表
    └── files        GET   # 文件学习统计
```

### 6.3 通用响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    message?: string;
  };
  timestamp: string;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}
```

---

## 7. 业务流程

### 7.1 任务分配与学习流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  管理员创建   │───▶│  上传学习    │───▶│  分配任务    │───▶│  员工登录    │
│   学习任务    │    │   文件资料   │    │  给员工/部门 │    │   系统       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  查看学习    │◀───│  测验考核    │◀───│  学习进度    │◀───│  进入学习    │
│   完成报表   │    │  （如有）    │    │   记录       │    │   页面       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
                                                  ┌─────────────────────┐
                                                  │  确认"任务已完成"    │
                                                  │  (用户主动提交)      │
                                                  └──────────┬──────────┘
                                                             │
                                                             ▼
                                                  ┌─────────────────────┐
                                                  │  更新任务状态为      │
                                                  │  "已完成"            │
                                                  └─────────────────────┘
```

### 7.2 文件完成判定标准

| 文件类型 | 完成条件 |
|---------|---------|
| PDF 文件 | 阅读到最后一页 |
| 视频文件 | 播放到结尾 |
| Office 文件 | 打开并完成阅读 |

### 7.3 任务完成判定流程

```
┌──────────────────────────────────────────────────────────────┐
│                        开始                                  │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │    用户点击"确认完成"     │
              │    (提交任务完成)         │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │  获取任务所有文件进度      │
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      ┌─────────────┐             ┌─────────────┐
      │  有测验题目?  │             │  无测验题目  │
      └──────┬──────┘             └──────┬──────┘
             │                           │
    ┌────────┴────────┐                 │
    ▼                 ▼                 ▼
┌─────────┐     ┌─────────┐    ┌─────────────────────┐
│ 测验    │     │ 测验    │    │  标记任务为"已完成"  │
│ 已通过?  │     │ 未通过   │    │  ✅ 任务完成        │
└────┬────┘     └─────────┘    └─────────────────────┘
     │
     ▼
┌─────────┐     ┌─────────────────────────────┐
│ ✅ 是   │────▶│  标记任务为"已完成"          │
└─────────┘     │  更新 completed_at 字段     │
                └─────────────────────────────┘
```

---

## 8. 非功能性需求

### 8.1 性能需求

| 指标 | 要求 |
|-----|------|
| 页面加载时间 | < 3 秒 |
| API 响应时间 | < 1 秒 |
| 并发用户数 | 支持 100+ 同时在线 |
| 文件上传 | 支持最大 500MB |

### 8.2 安全需求

| 项目 | 要求 |
|-----|------|
| 密码存储 | bcrypt 哈希 |
| 认证令牌 | JWT (httpOnly Cookie) |
| 权限控制 | 基于角色的访问控制 (RBAC) |
| SQL 注入 | 参数化查询 |
| XSS 攻击 | 输入过滤、输出编码 |

### 8.3 兼容性

| 项目 | 要求 |
|-----|------|
| 操作系统 | Windows 7 32位 及以上 |
| 浏览器 | Chrome 109 及以上版本 |
| 屏幕分辨率 | 1920x1080 及以上 |

---

## 9. 测验功能补充说明

### 9.1 及格判定规则

| 管理员设置 | 判定逻辑 |
|-----------|---------|
| strict_mode = TRUE（默认） | 必须全部答对（100分）才算及格 |
| strict_mode = FALSE | 按 passing_score 设定分数，及格即可 |

### 9.2 测验提交限制

| 场景 | 限制 |
|-----|------|
| 提交次数 | 同一任务最多提交 3 次 |
| 及格后 | 无需再次提交 |

---

## 附录

### 相关文档

| 文档名称 | 描述 |
|---------|------|
| SRS-02-任务管理.md | 任务管理模块详细规格 |
| SRS-03-学习追踪.md | 学习追踪模块详细规格 |
| SRS-04-用户认证.md | 用户与认证模块详细规格 |
| SRS-05-测验考核.md | 测验考核模块详细规格 |
| SRS-06-报表统计.md | 报表统计模块详细规格 |
| UI-DESIGN.md | UI/UX 设计规范 |
