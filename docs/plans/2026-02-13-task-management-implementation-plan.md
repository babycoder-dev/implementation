# 任务管理模块后端实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现符合 SRS-02 规范的任务管理模块后端 API

**Architecture:** 基于现有的 Next.js App Router 结构，使用 PostgreSQL + sql 模板字符串，遵循现有代码风格

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, sql 模板

---

## 实现范围

需要实现的 API：

| 路径 | 方法 | 描述 |
|-----|------|------|
| /api/tasks | GET | 获取任务列表 |
| /api/tasks | POST | 创建任务 |
| /api/tasks/[id] | GET | 获取任务详情 |
| /api/tasks/[id] | PUT | 更新任务 |
| /api/tasks/[id] | DELETE | 删除任务（软删除） |
| /api/tasks/[id]/files | GET | 获取文件列表 |
| /api/tasks/[id]/files | POST | 上传文件 |
| /api/tasks/[id]/files/[fileId] | DELETE | 删除文件 |
| /api/tasks/[id]/files/order | PUT | 更新文件排序 |
| /api/tasks/[id]/assignments | GET | 获取分配列表 |
| /api/tasks/[id]/assignments | POST | 添加分配 |
| /api/tasks/[id]/assignments | DELETE | 移除分配 |
| /api/tasks/[id]/quiz | GET | 获取测验题目 |
| /api/tasks/[id]/quiz | POST | 添加测验题目 |
| /api/tasks/[id]/quiz/[questionId] | PUT | 更新测验题目 |
| /api/tasks/[id]/quiz/[questionId] | DELETE | 删除测验题目 |

---

## 现有代码分析

现有路由结构（有问题）：
- `/api/tasks/route.ts` - 任务列表
- `/api/tasks/[id]/route.ts` - 任务详情
- `/api/tasks/[id]/[taskId]/files/route.ts` - 文件管理（路由结构错误）
- `/api/tasks/[id]/[taskId]/assignments/route.ts` - 分配管理（路由结构错误）

需要修改为：
- `/api/tasks/[id]/files/route.ts`
- `/api/tasks/[id]/assignments/route.ts`
- `/api/tasks/[id]/quiz/route.ts`

---

## Task 1: 更新任务列表 API

**Files:**
- Modify: `src/app/api/tasks/route.ts`

**Step 1: 读取并分析现有代码**

现有代码缺少以下字段：
- `file_count` - 文件数量
- `assignment_count` - 分配人数
- `strict_mode`
- `enable_quiz`
- `search` - 搜索功能

**Step 2: 更新 GET /api/tasks**

```typescript
// src/app/api/tasks/route.ts - GET 方法更新

// 获取任务列表（带 file_count, assignment_count）
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const db = sql;

    // 构建查询条件
    let whereClause = '';
    const params: any[] = [];

    if (status) {
      whereClause += ` WHERE status = $${params.length + 1}`;
      params.push(status);
    }

    if (search) {
      if (whereClause) {
        whereClause += ` AND title ILIKE $${params.length + 1}`;
      } else {
        whereClause += ` WHERE title ILIKE $${params.length + 1}`;
      }
      params.push(`%${search}%`);
    }

    // 非管理员只能看到已发布任务
    if (currentUser.role !== 'admin') {
      const condition = whereClause ? ' AND status = \'published\'' : ' WHERE status = \'published\'';
      whereClause = (whereClause || ' WHERE ') + condition;
    }

    // 获取总数
    const countResult = await db`
      SELECT COUNT(*) as count FROM tasks ${db(whereClause ? db.unsafe(whereClause) : db``)}
    `;
    // 注意：上述模板字符串查询需要调整，下面使用更简单的方式

    // 简化版查询
    let countSql = 'SELECT COUNT(*) as count FROM tasks';
    let queryParams: any[] = [];

    if (currentUser.role !== 'admin') {
      countSql += " WHERE status = 'published'";
    } else if (status) {
      countSql += ` WHERE status = $1`;
      queryParams = [status];
    }

    const totalResult = await db.unsafe(countSql, queryParams);
    const total = parseInt(totalResult[0].count);

    // 获取任务列表（带聚合字段）
    const result = await db`
      SELECT
        t.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM task_files WHERE task_id = t.id) as file_count,
        (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignment_count
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause ? db.unsafe(whereClause) : db``}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return successResponse(result);
  } catch (error) {
    console.error('Get tasks error:', error);
    return errorResponse('获取任务列表失败', 500);
  }
}
```

**Step 3: 更新 POST /api/tasks**

添加新字段支持：
- `assignment_type` - 分配类型 (all/department/user)
- `assignment_ids` - 分配ID列表
- `enable_quiz` - 是否启用测验
- `strict_mode` - 严格模式

```typescript
// POST - 创建任务
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限创建任务', 403);
    }

    const body = await request.json();
    const {
      title,
      description,
      deadline,
      assignment_type = 'all',
      assignment_ids = [],
      enable_quiz = false,
      passing_score = 100,
      strict_mode = true
    } = body;

    // 验证必填字段
    if (!title || title.length < 1 || title.length > 200) {
      return errorResponse('任务标题不能为空，且不能超过200字符', 400);
    }

    if (!assignment_type || !['all', 'department', 'user'].includes(assignment_type)) {
      return errorResponse('分配类型无效', 400);
    }

    if (assignment_type !== 'all' && (!assignment_ids || assignment_ids.length === 0)) {
      return errorResponse('请选择分配对象', 400);
    }

    const db = sql;

    // 创建任务
    const taskResult = await db`
      INSERT INTO tasks (title, description, deadline, passing_score, strict_mode, enable_quiz, created_by)
      VALUES (${title}, ${description || null}, ${deadline || null}, ${passing_score}, ${strict_mode}, ${enable_quiz}, ${currentUser.userId})
      RETURNING *
    `;

    const task = taskResult[0];

    // 处理任务分配
    if (assignment_type === 'all') {
      // 分配给所有用户
      const allUsers = await db`SELECT id FROM users WHERE status = 'active'`;
      for (const user of allUsers) {
        await db`
          INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
          VALUES (${task.id}, ${user.id}, 'user', ${currentUser.userId})
          ON CONFLICT (task_id, user_id) DO NOTHING
        `;
      }
    } else if (assignment_type === 'department') {
      // 分配给部门下所有用户
      const deptUsers = await db`
        SELECT id FROM users
        WHERE department_id = ANY(${assignment_ids}) AND status = 'active'
      `;
      for (const user of deptUsers) {
        await db`
          INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
          VALUES (${task.id}, ${user.id}, 'department', ${currentUser.userId})
          ON CONFLICT (task_id, user_id) DO NOTHING
        `;
      }
    } else if (assignment_type === 'user') {
      // 分配给指定用户
      for (const userId of assignment_ids) {
        await db`
          INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
          VALUES (${task.id}, ${userId}, 'user', ${currentUser.userId})
          ON CONFLICT (task_id, user_id) DO NOTHING
        `;
      }
    }

    return successResponse(task, { message: '任务创建成功' }, 201);
  } catch (error) {
    console.error('Create task error:', error);
    return errorResponse('创建任务失败', 500);
  }
}
```

---

## Task 2: 更新任务详情 API

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

**Step 1: 更新 GET /api/tasks/[id]**

需要返回：
- files 列表
- assignments 列表（含部门信息）
- quiz_questions 列表

```typescript
// GET /api/tasks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id } = await params;
    const db = sql;

    // 获取任务
    const taskResult = await db`
      SELECT t.*, u.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ${id}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    // 获取文件列表
    const filesResult = await db`
      SELECT * FROM task_files
      WHERE task_id = ${id}
      ORDER BY "order"
    `;

    // 获取分配列表（含部门信息）
    const assignmentsResult = await db`
      SELECT
        a.*,
        u.name as user_name,
        u.username,
        d.name as department_name
      FROM task_assignments a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE a.task_id = ${id}
    `;

    // 获取测验题目
    const questionsResult = await db`
      SELECT * FROM quiz_questions
      WHERE task_id = ${id}
      ORDER BY "order"
    `;

    const response = {
      ...task,
      files: filesResult,
      assignments: assignmentsResult.map(a => ({
        user_id: a.user_id,
        user_name: a.user_name,
        department_name: a.department_name,
        assigned_at: a.assigned_at,
        is_completed: a.is_completed
      })),
      quiz_questions: questionsResult,
      created_by: {
        id: task.created_by,
        name: task.created_by_name
      }
    };

    return successResponse(response);
  } catch (error) {
    console.error('Get task error:', error);
    return errorResponse('获取任务详情失败', 500);
  }
}
```

**Step 2: 更新 PUT /api/tasks/[id]**

添加状态流转控制和字段更新。

```typescript
// PUT /api/tasks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, deadline, status, passing_score, strict_mode, enable_quiz } = body;
    const db = sql;

    // 检查任务是否存在
    const existingTask = await db`SELECT * FROM tasks WHERE id = ${id}`;
    if (existingTask.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // 状态流转校验
    const currentStatus = existingTask[0].status;
    if (status) {
      const validTransitions: Record<string, string[]> = {
        'draft': ['published', 'deleted'],
        'published': ['archived', 'deleted', 'deadline_passed'],
        'deadline_passed': ['archived'],
        'archived': ['deleted']
      };

      if (!validTransitions[currentStatus]?.includes(status)) {
        return errorResponse(`状态不能从 ${currentStatus} 转为 ${status}`, 400);
      }

      // 发布任务时检查是否有文件
      if (status === 'published') {
        const fileCount = await db`SELECT COUNT(*) as count FROM task_files WHERE task_id = ${id}`;
        if (parseInt(fileCount[0].count) === 0) {
          return errorResponse('发布任务前必须上传至少一个文件', 400);
        }
      }
    }

    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }
    if (deadline !== undefined) {
      updateFields.push(`deadline = $${paramIndex++}`);
      updateValues.push(deadline);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }
    if (passing_score !== undefined) {
      updateFields.push(`passing_score = $${paramIndex++}`);
      updateValues.push(passing_score);
    }
    if (strict_mode !== undefined) {
      updateFields.push(`strict_mode = $${paramIndex++}`);
      updateValues.push(strict_mode);
    }
    if (enable_quiz !== undefined) {
      updateFields.push(`enable_quiz = $${paramIndex++}`);
      updateValues.push(enable_quiz);
    }

    if (updateFields.length === 0) {
      return errorResponse('没有需要更新的字段', 400);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await db.unsafe(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    return successResponse(result[0], { message: '任务更新成功' });
  } catch (error) {
    console.error('Update task error:', error);
    return errorResponse('更新任务失败', 500);
  }
}
```

**Step 3: 更新 DELETE /api/tasks/[id]**

软删除：更新状态为 deleted。

```typescript
// DELETE /api/tasks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id } = await params;
    const db = sql;

    // 软删除：更新状态为 deleted
    const result = await db`
      UPDATE tasks
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    return successResponse(null, { message: '任务删除成功' });
  } catch (error) {
    console.error('Delete task error:', error);
    return errorResponse('删除任务失败', 500);
  }
}
```

---

## Task 3: 修复文件管理 API 路由结构

**Files:**
- Create: `src/app/api/tasks/[id]/files/route.ts`
- Create: `src/app/api/tasks/[id]/files/[fileId]/route.ts`
- Delete: `src/app/api/tasks/[id]/[taskId]/files/route.ts`（旧路由）

**Step 1: 创建 GET/POST /api/tasks/[id]/files**

```typescript
// src/app/api/tasks/[id]/files/route.ts
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id: taskId } = await params;

    const result = await sql`
      SELECT * FROM task_files
      WHERE task_id = ${taskId}
      ORDER BY "order"
    `;

    return successResponse(result);
  } catch (error) {
    console.error('Get task files error:', error);
    return errorResponse('获取文件列表失败', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { title, fileUrl, originalUrl, fileType, fileSize, duration, required_completion } = body;

    if (!title || !fileUrl || !fileType) {
      return errorResponse('标题、文件URL和文件类型不能为空', 400);
    }

    // 获取最大排序号
    const maxOrder = await sql`
      SELECT COALESCE(MAX("order"), 0) + 1 as next_order
      FROM task_files WHERE task_id = ${taskId}
    `;

    const result = await sql`
      INSERT INTO task_files (task_id, title, file_url, original_url, file_type, file_size, duration, required_completion, "order")
      VALUES (${taskId}, ${title}, ${fileUrl}, ${originalUrl || null}, ${fileType}, ${fileSize || 0}, ${duration || null}, ${required_completion || 'last_page'}, ${maxOrder[0].next_order})
      RETURNING *
    `;

    return successResponse(result[0], { message: '文件添加成功' }, 201);
  } catch (error) {
    console.error('Add task file error:', error);
    return errorResponse('添加文件失败', 500);
  }
}
```

**Step 2: 创建 DELETE /api/tasks/[id]/files/[fileId]**

```typescript
// src/app/api/tasks/[id]/files/[fileId]/route.ts
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId, fileId } = await params;

    // 检查文件是否存在
    const existingFile = await sql`
      SELECT * FROM task_files WHERE id = ${fileId} AND task_id = ${taskId}
    `;

    if (existingFile.length === 0) {
      return errorResponse('文件不存在', 404);
    }

    await sql`DELETE FROM task_files WHERE id = ${fileId}`;

    return successResponse(null, { message: '文件删除成功' });
  } catch (error) {
    console.error('Delete task file error:', error);
    return errorResponse('删除文件失败', 500);
  }
}
```

**Step 3: 创建 PUT /api/tasks/[id]/files/order**

```typescript
// src/app/api/tasks/[id]/files/order/route.ts
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId } = await params;
    const { file_ids } = await request.json();

    if (!file_ids || !Array.isArray(file_ids)) {
      return errorResponse('文件ID列表不能为空', 400);
    }

    // 更新排序
    for (let i = 0; i < file_ids.length; i++) {
      await sql`
        UPDATE task_files SET "order" = ${i + 1} WHERE id = ${file_ids[i]} AND task_id = ${taskId}
      `;
    }

    return successResponse(null, { message: '排序更新成功' });
  } catch (error) {
    console.error('Update file order error:', error);
    return errorResponse('更新排序失败', 500);
  }
}
```

---

## Task 4: 修复任务分配 API 路由结构

**Files:**
- Create: `src/app/api/tasks/[id]/assignments/route.ts`
- Delete: `src/app/api/tasks/[id]/[taskId]/assignments/route.ts`（旧路由）

**Step 1: 更新分配管理 API**

```typescript
// src/app/api/tasks/[id]/assignments/route.ts
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id: taskId } = await params;

    const result = await sql`
      SELECT
        a.*,
        u.name as user_name,
        u.username,
        d.name as department_name
      FROM task_assignments a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE a.task_id = ${taskId}
    `;

    const assignments = result.map(a => ({
      user_id: a.user_id,
      user_name: a.user_name,
      username: a.username,
      department_name: a.department_name,
      assigned_at: a.assigned_at,
      is_completed: a.is_completed,
      submitted_at: a.submitted_at
    }));

    return successResponse(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    return errorResponse('获取分配列表失败', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId } = await params;
    const { assignment_type, ids } = await request.json();

    if (!assignment_type || !['department', 'user'].includes(assignment_type)) {
      return errorResponse('分配类型无效', 400);
    }

    if (!ids || ids.length === 0) {
      return errorResponse('请选择分配对象', 400);
    }

    const db = sql;
    let userIds: string[] = [];

    if (assignment_type === 'department') {
      // 获取部门下所有用户
      const deptUsers = await db`
        SELECT id FROM users
        WHERE department_id = ANY(${ids}) AND status = 'active'
      `;
      userIds = deptUsers.map(u => u.id);
    } else {
      userIds = ids;
    }

    // 过滤已存在的分配
    const existingAssignments = await db`
      SELECT user_id FROM task_assignments WHERE task_id = ${taskId}
    `;
    const existingUserIds = new Set(existingAssignments.map(a => a.user_id));

    const newUserIds = userIds.filter(id => !existingUserIds.has(id));

    // 创建分配
    for (const userId of newUserIds) {
      await db`
        INSERT INTO task_assignments (task_id, user_id, assignment_type, assigned_by)
        VALUES (${taskId}, ${userId}, ${assignment_type}, ${currentUser.userId})
        ON CONFLICT (task_id, user_id) DO NOTHING
      `;
    }

    return successResponse(null, { message: `成功分配给 ${newUserIds.length} 个用户` });
  } catch (error) {
    console.error('Create assignment error:', error);
    return errorResponse('分配失败', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId } = await params;
    const { user_ids } = await request.json();

    if (!user_ids || user_ids.length === 0) {
      return errorResponse('请选择要移除的用户', 400);
    }

    await sql`
      DELETE FROM task_assignments
      WHERE task_id = ${taskId} AND user_id = ANY(${user_ids})
    `;

    return successResponse(null, { message: '取消分配成功' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return errorResponse('取消分配失败', 500);
  }
}
```

---

## Task 5: 修复测验题目 API 路由结构

**Files:**
- Create: `src/app/api/tasks/[id]/quiz/route.ts`
- Create: `src/app/api/tasks/[id]/quiz/[questionId]/route.ts`
- Delete: `src/app/api/tasks/[id]/[taskId]/quiz/route.ts`（旧路由）

**Step 1: 创建 GET/POST /api/tasks/[id]/quiz**

```typescript
// src/app/api/tasks/[id]/quiz/route.ts
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }

    const { id: taskId } = await params;

    // 获取任务配置
    const taskResult = await sql`
      SELECT passing_score, strict_mode, enable_quiz FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    const task = taskResult[0];

    // 获取测验题目（不返回正确答案）
    const questionsResult = await sql`
      SELECT id, question, options, "order"
      FROM quiz_questions
      WHERE task_id = ${taskId}
      ORDER BY "order"
    `;

    return successResponse({
      enable_quiz: task.enable_quiz,
      passing_score: task.passing_score,
      strict_mode: task.strict_mode,
      questions: questionsResult
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    return errorResponse('获取测验失败', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { question, options, correct_answer, order } = body;

    if (!question || !options || correct_answer === undefined) {
      return errorResponse('题目、选项和正确答案不能为空', 400);
    }

    if (!Array.isArray(options) || options.length < 2) {
      return errorResponse('至少需要2个选项', 400);
    }

    if (correct_answer < 0 || correct_answer >= options.length) {
      return errorResponse('正确答案索引无效', 400);
    }

    // 获取最大排序号
    const maxOrder = await sql`
      SELECT COALESCE(MAX("order"), 0) + 1 as next_order
      FROM quiz_questions WHERE task_id = ${taskId}
    `;

    const result = await sql`
      INSERT INTO quiz_questions (task_id, question, options, correct_answer, "order")
      VALUES (${taskId}, ${question}, ${JSON.stringify(options)}, ${correct_answer}, ${order || maxOrder[0].next_order})
      RETURNING *
    `;

    // 更新任务的 enable_quiz 字段
    await sql`
      UPDATE tasks SET enable_quiz = TRUE, updated_at = NOW() WHERE id = ${taskId}
    `;

    return successResponse(result[0], { message: '题目添加成功' }, 201);
  } catch (error) {
    console.error('Add quiz question error:', error);
    return errorResponse('添加题目失败', 500);
  }
}
```

**Step 2: 创建 PUT/DELETE /api/tasks/[id]/quiz/[questionId]**

```typescript
// src/app/api/tasks/[id]/quiz/[questionId]/route.ts
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId, questionId } = await params;
    const body = await request.json();
    const { question, options, correct_answer, order } = body;

    // 检查题目是否存在
    const existing = await sql`
      SELECT * FROM quiz_questions WHERE id = ${questionId} AND task_id = ${taskId}
    `;

    if (existing.length === 0) {
      return errorResponse('题目不存在', 404);
    }

    const result = await sql`
      UPDATE quiz_questions
      SET question = ${question || existing[0].question},
          options = ${options ? JSON.stringify(options) : existing[0].options},
          correct_answer = ${correct_answer ?? existing[0].correct_answer},
          "order" = ${order ?? existing[0].order}
      WHERE id = ${questionId}
      RETURNING *
    `;

    return successResponse(result[0], { message: '题目更新成功' });
  } catch (error) {
    console.error('Update quiz question error:', error);
    return errorResponse('更新题目失败', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限', 403);
    }

    const { id: taskId, questionId } = await params;

    // 删除题目
    await sql`DELETE FROM quiz_questions WHERE id = ${questionId} AND task_id = ${taskId}`;

    // 检查是否还有其他题目，如果没有则更新任务
    const remainingQuestions = await sql`
      SELECT COUNT(*) as count FROM quiz_questions WHERE task_id = ${taskId}
    `;

    if (parseInt(remainingQuestions[0].count) === 0) {
      await sql`UPDATE tasks SET enable_quiz = FALSE, updated_at = NOW() WHERE id = ${taskId}`;
    }

    return successResponse(null, { message: '题目删除成功' });
  } catch (error) {
    console.error('Delete quiz question error:', error);
    return errorResponse('删除题目失败', 500);
  }
}
```

---

## Task 6: 数据库迁移

**Files:**
- Create: `src/db/migrations/006-add-deleted-status.sql`

**Step 1: 创建迁移脚本**

```sql
-- src/db/migrations/006-add-deleted-status.sql
-- 添加 deleted 状态支持

-- 确保 tasks 表有 deleted 状态（如果还没有）
-- 注意：PostgreSQL 的 ALTER TYPE 需要使用 ALTER TABLE ... ALTER COLUMN

-- 为 tasks 表添加 status 索引（如果还不存在）
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- file_progress 表添加 task_id 字段（如果缺少）
-- ALTER TABLE file_progress ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
```

---

## Task 7: 测试验证

**Files:**
- Create: `src/app/api/tasks/__tests__/route.test.ts`

**Step 1: 创建测试文件**

```typescript
// src/app/api/tasks/__tests__/route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Tasks API', () => {
  const BASE_URL = 'http://localhost:3000';

  let adminToken: string;
  let taskId: string;

  beforeAll(async () => {
    // 登录获取 token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;
  });

  describe('GET /api/tasks', () => {
    it('should return task list', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      expect(res.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    it('should support search and filter', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks?search=test&status=published`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(res.ok).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a task with assignments', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: '测试任务',
          description: '测试描述',
          assignment_type: 'all',
          enable_quiz: false,
          passing_score: 100,
          strict_mode: true
        })
      });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      taskId = data.data.id;
    });

    it('should reject task without title', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          assignment_type: 'all'
        })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks/[id]', () => {
    it('should return task details with files and assignments', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      expect(res.ok).toBe(true);
      expect(data.data).toHaveProperty('files');
      expect(data.data).toHaveProperty('assignments');
      expect(data.data).toHaveProperty('quiz_questions');
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    it('should update task status', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'published' })
      });
      // 会失败因为没有文件，需要先添加文件
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('should soft delete task', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      expect(res.ok).toBe(true);
      expect(data.data.status).toBe('deleted');
    });
  });
});
```

---

## 执行说明

1. **按照 Task 顺序执行**
2. **每个 Task 先运行测试验证**
3. **完成所有任务后进行集成测试**
4. **提交代码**

---

## 验收标准

1. ✓ 任务 CRUD 功能完整
2. ✓ 文件上传、排序、删除功能正常
3. ✓ 任务分配（部门/用户/全体）功能正常
4. ✓ 测验题目管理功能正常
5. ✓ 任务状态流转符合规范（draft → published → deadline_passed → archived，deleted）
6. ✓ 权限控制正确（只有 admin 可以创建/编辑/删除）
7. ✓ 软删除功能正常
