# SSR05 测验考核模块 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为学习任务添加测验考核功能，包括及格判定和提交次数限制。

**Architecture:** 在现有 quiz 功能基础上，添加 tasks 表扩展字段和 quiz_submissions 表，修改提交 API 实现业务规则。

**Tech Stack:** Next.js 14, Drizzle ORM, PostgreSQL, Vitest

---

## Task 1: 更新数据库 Schema

**Files:**
- Modify: `src/db/schema.ts:14-21`
- Modify: `src/lib/validations/task.ts:1-22`

**Step 1: 更新 tasks 表添加新字段**

```typescript
// src/db/schema.ts - 在 tasks 表中添加
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  deadline: timestamp('deadline'),
  passingScore: integer('passing_score').default(100),
  strictMode: boolean('strict_mode').default(true),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 2: 添加 quiz_submissions 表**

```typescript
// src/db/schema.ts - 在文件末尾添加
export const quizSubmissions = pgTable('quiz_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score').notNull(),
  passed: boolean('passed').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').notNull(),
  attemptCount: integer('attempt_count').default(1).notNull(),
  answers: jsonb('answers').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
})
```

**Step 3: 更新任务验证 Schema**

```typescript
// src/lib/validations/task.ts
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
  passingScore: z.number().min(0).max(100).default(100),
  strictMode: z.boolean().default(true),
  assignedUserIds: z.array(z.string()).default([]),
  files: z.array(z.object({
    title: z.string().min(1),
    fileType: z.enum(['pdf', 'docx', 'xlsx', 'pptx', 'video']),
    fileUrl: z.string().url(),
    fileSize: z.number().min(0),
  })).default([]),
  questions: z.array(z.object({
    question: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    correctAnswer: z.number().min(0),
  })).optional(),
})
```

**Step 4: 运行测试验证**

Run: `npm test -- --run src/app/api/tasks/__tests__/create.test.ts`
Expected: PASS (测试不依赖新字段)

---

## Task 2: 修改测验提交 API 实现及格判定

**Files:**
- Modify: `src/app/api/quiz/submit/route.ts:1-127`
- Create: `src/app/api/quiz/submit/__tests__/submit.test.ts`

**Step 1: 编写失败的测试用例**

```typescript
// src/app/api/quiz/submit/__tests__/submit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

// Mock 数据库
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock 认证
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn(),
}))

describe('POST /api/quiz/submit - 及格判定', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('strict_mode=true 时必须100分才能及格', async () => {
    // 测试 80 分在 strict_mode=true 时应该不通过
  })

  it('strict_mode=false 时分数 >= passing_score 即可及格', async () => {
    // 测试 80 分在 passing_score=60, strict_mode=false 时应该通过
  })

  it('提交次数超过3次应返回错误', async () => {
    // 测试第4次提交应该被拒绝
  })

  it('已及格的用户不能再提交', async () => {
    // 测试已通过的用户不能再次提交
  })
})
```

**Step 2: 运行测试验证失败**

Run: `npm test -- --run src/app/api/quiz/submit/__tests__/submit.test.ts`
Expected: FAIL (功能未实现)

**Step 3: 实现及格判定逻辑**

修改 `src/app/api/quiz/submit/route.ts`:
1. 查询任务的 passing_score 和 strict_mode
2. 查询用户已提交次数
3. 检查是否已及格
4. 计算分数并判定是否及格
5. 记录提交到 quiz_submissions 表
6. 返回完整结果（含 passed 字段）

**Step 4: 运行测试验证通过**

Run: `npm test -- --run src/app/api/quiz/submit/__tests__/submit.test.ts`
Expected: PASS

---

## Task 3: 创建获取测验信息 API

**Files:**
- Create: `src/app/api/tasks/[id]/quiz/route.ts`
- Create: `src/app/api/tasks/[id]/quiz/__tests__/route.test.ts`

**Step 1: 编写失败的测试用例**

```typescript
// src/app/api/tasks/[id]/quiz/__tests__/route.test.ts
describe('GET /api/tasks/[id]/quiz', () => {
  it('应返回测验信息包含 passing_score 和 strict_mode', async () => {})
  it('未授权应返回401', async () => {})
  it('任务不存在应返回404', async () => {})
})
```

**Step 2: 运行测试验证失败**

Run: `npm test -- --run src/app/api/tasks/[id]/quiz/__tests__/route.test.ts`
Expected: FAIL (路由不存在)

**Step 3: 实现 API**

创建 `src/app/api/tasks/[id]/quiz/route.ts`:
- GET: 返回任务的测验信息（题目数量、passing_score、strict_mode、用户提交次数、是否已及格）

**Step 4: 运行测试验证通过**

Run: `npm test -- --run src/app/api/tasks/[id]/quiz/__tests__/route.test.ts`
Expected: PASS

---

## Task 4: 更新任务创建 API 支持新字段

**Files:**
- Modify: `src/app/api/tasks/route.ts:32-42`

**Step 1: 更新任务创建逻辑**

在创建任务时支持 passing_score 和 strict_mode 字段：

```typescript
const [createdTask] = await tx
  .insert(tasks)
  .values({
    title: validated.title,
    description: validated.description,
    deadline: validated.deadline ? new Date(validated.deadline) : null,
    passingScore: validated.passingScore,
    strictMode: validated.strictMode,
    createdBy: auth.userId,
  })
  .returning()
```

**Step 2: 运行测试验证**

Run: `npm test -- --run src/app/api/tasks/__tests__/create.test.ts`
Expected: PASS

---

## Task 5: 更新前端测验页面 (可选，后端优先)

此任务可后续处理，暂不包含在当前计划中。

---

## Task 6: 验证整体测试覆盖率

**Step 1: 运行所有测试**

Run: `npm test -- --run`
Expected: 所有测试通过

**Step 2: 检查覆盖率**

Run: `npm test -- --run --coverage`
Expected: 80%+ 覆盖率

---

## 执行方式选择

**Plan complete and saved to `docs/plans/2026-02-14-ssr05-quiz-implementation.md`. Two execution options:**

1. **Subagent-Driven (当前会话)** - 我为每个任务分配子代理，任务间进行代码审查，快速迭代
2. **Parallel Session (新会话)** - 在新会话中使用 executing-plans，分批执行并设置检查点

您希望选择哪种方式？
