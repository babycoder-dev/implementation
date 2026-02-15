# SSR06 报表统计实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现报表统计后端API，包括部门管理、任务完成率、部门报表、个人学习明细和文件数据统计，测试覆盖率80%+

**Architecture:** 使用Drizzle ORM查询数据库，新增departments表和users.departmentId字段，实现4个报表API接口

**Tech Stack:** Next.js 14, Drizzle ORM, PostgreSQL, Vitest

---

## Task 1: 添加部门表到Schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/` migration

**Step 1: 添加departments表**

在 schema.ts 文件末尾添加：

```typescript
// 部门表
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 2: 添加departmentId到users表**

在 users 表定义中添加：

```typescript
departmentId: uuid('department_id').references(() => departments.id),
```

**Step 3: 生成迁移**

```bash
npm run db:generate
```

---

## Task 2: 创建部门管理API

**Files:**
- Create: `src/app/api/admin/departments/route.ts`
- Create: `src/app/api/admin/departments/[id]/route.ts`
- Create: `src/app/api/admin/departments/__tests__/route.test.ts`

### Task 2a: GET /api/admin/departments - 获取部门列表

**Step 1: 写测试**

```typescript
// src/app/api/admin/departments/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock validateRequest
vi.mock('@/lib/auth/middleware', () => ({
  validateRequest: vi.fn().mockResolvedValue({ userId: 'admin-id' })
}))

// Mock db
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: '1', name: '技术部', userCount: 10 }])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '1', name: '技术部' }])
      })
    })
  }
}))

describe('GET /api/admin/departments', () => {
  it('应返回部门列表', async () => {
    const request = new NextRequest('http://localhost/api/admin/departments')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

**Step 2: 写实现**

创建基本的CRUD路由...

---

## Task 3: 创建报表API

**Files:**
- Create: `src/app/api/reports/tasks/route.ts`
- Create: `src/app/api/reports/departments/route.ts`
- Create: `src/app/api/reports/users/route.ts`
- Create: `src/app/api/reports/files/route.ts`

### Task 3a: GET /api/reports/tasks - 任务完成率

**Step 1: 写测试**

```typescript
// src/app/api/reports/tasks/__tests__/route.test.ts
describe('GET /api/reports/tasks', () => {
  it('应返回任务完成率统计', async () => {
    const request = new NextRequest('http://localhost/api/reports/tasks')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.tasks).toBeDefined()
  })

  it('应支持时间范围过滤', async () => {
    const request = new NextRequest('http://localhost/api/reports/tasks?startDate=2024-01-01&endDate=2024-12-31')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('未授权应返回401', async () => {
    vi.mock('@/lib/auth/middleware', () => ({
      validateRequest: vi.fn().mockResolvedValue(null)
    }))
    const request = new NextRequest('http://localhost/api/reports/tasks')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('非管理员应返回403', async () => {
    vi.mock('@/lib/auth/middleware', () => ({
      validateRequest: vi.fn().mockResolvedValue({ userId: 'user-id' })
    }))
    // Mock user role as non-admin
    const request = new NextRequest('http://localhost/api/reports/tasks')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })
})
```

**Step 2: 写实现**

```typescript
// src/app/api/reports/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, taskAssignments, users, quizSubmissions } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { count, eq, sql, and, gte, lte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    // 获取所有任务及其完成情况
    const taskStats = await db
      .select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        deadline: tasks.deadline,
        assigned: count(taskAssignments.id),
        completed: sql<number>`COALESCE(SUM(CASE WHEN ${quizSubmissions.passed} THEN 1 ELSE 0 END), 0)`,
      })
      .from(tasks)
      .leftJoin(taskAssignments, eq(taskAssignments.taskId, tasks.id))
      .leftJoin(quizSubmissions, and(
        eq(quizSubmissions.taskId, tasks.id),
        eq(quizSubmissions.userId, taskAssignments.userId)
      ))
      .groupBy(tasks.id, tasks.title, tasks.deadline)

    const data = taskStats.map(t => ({
      taskId: t.taskId,
      taskTitle: t.taskTitle,
      deadline: t.deadline?.toISOString(),
      assigned: Number(t.assigned) || 0,
      completed: Number(t.completed) || 0,
      completionRate: t.assigned > 0 ? Math.round((Number(t.completed) / Number(t.assigned)) * 100) : 0,
    }))

    return NextResponse.json({
      success: true,
      data: { tasks: data },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get task report:', error)
    return NextResponse.json({ success: false, error: '获取任务报表失败' }, { status: 500 })
  }
}
```

---

## Task 4: 部门报表 API

### Task 4a: GET /api/reports/departments

**Step 1: 写测试**

编写测试用例覆盖：
- 正常返回部门报表数据
- 时间范围过滤
- 权限检查

**Step 2: 写实现**

查询逻辑：
- 按部门分组统计
- 计算部门内用户完成率
- 计算平均分

---

## Task 5: 个人学习明细 API

### Task 5a: GET /api/reports/users

**Step 1: 写测试**

**Step 2: 写实现**

查询逻辑：
- 支持部门过滤
- 支持搜索用户名
- 统计每个用户的学习时长、任务完成数、平均分

---

## Task 6: 文件数据统计 API

### Task 6a: GET /api/reports/files

**Step 1: 写测试**

**Step 2: 写实现**

查询逻辑：
- 统计每个文件的访问次数
- 计算平均学习时长
- 计算完成率

---

## Task 7: 运行测试并确保覆盖率80%+

**Step 1: 运行所有报表测试**

```bash
npm test -- --run src/app/api/reports
```

**Step 2: 检查覆盖率**

```bash
npm test -- --run --coverage src/app/api/reports
```

**Step 3: 如不达标，补充测试用例**

---

## 执行顺序

1. Task 1: 修改schema + 生成迁移 + 应用迁移
2. Task 2: 部门管理API (先测试后实现)
3. Task 3: 任务完成率报表API
4. Task 4: 部门报表API
5. Task 5: 个人学习明细API
6. Task 6: 文件数据统计API
7. Task 7: 测试覆盖率检查

---

**Plan complete and saved to `docs/plans/2026-02-15-ssr06-reports-design.md`. Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
