# SSR2 测试覆盖率提升计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**目标：** 将 app/api/tasks 目录的测试覆盖率从 76.19% 提升至 80%

**当前未覆盖代码：**
- route.ts:93 - admin 用户 roleFilter 分支
- route.ts:199 - 批量插入任务分配
- route.ts:236-237 - POST 错误处理
- [id]/route.ts:425 - DELETE 404 错误路径
- [id]/route.ts:430-431 - DELETE 错误处理

**技术方案：**
在现有测试文件中添加单元测试用例，覆盖未测试的代码路径

---

### Task 1: 修复 route.ts:93 admin roleFilter 覆盖率

**文件:** src/app/api/tasks/__tests__/route.test.ts

**Step 1: 添加 admin 用户 GET 测试 (带 status 过滤)**

```typescript
it('admin user can see all status tasks', async () => {
  setupMockImplementation((query) => {
    if (query.includes('COUNT(*)')) {
      return [{ count: '1' }];
    }
    // 检测是否不包含 t.status = 'published' 过滤 (admin 使用 1=1)
    if (query.includes('SELECT') && query.includes('tasks') && query.includes('LEFT JOIN users')) {
      // Admin 用户应该不使用 status 过滤
      if (query.includes("1=1") || !query.includes("t.status = 'published'")) {
        return [mockTask];
      }
    }
    return [];
  });

  const request = createAuthenticatedRequest('http://localhost/api/tasks?status=draft', {
    user: mockAdminUser,
  });

  const response = await GET(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
});
```

**Step 2: 运行测试验证**

运行: `npm test -- src/app/api/tasks/__tests__/route.test.ts --run`
预期: 测试通过

---

### Task 2: 添加 route.ts:199 批量插入覆盖

**文件:** src/app/api/tasks/__tests__/route.test.ts

**Step 1: 添加测试 assignmentType='all'**

```typescript
it('creates task with all users assigned', async () => {
  setupMockImplementation((query) => {
    // Insert task
    if (query.includes('INSERT INTO tasks')) {
      return [mockTask];
    }
    // Get all active users for 'all' assignment
    if (query.includes('SELECT id FROM users') && query.includes("status = 'active'")) {
      return [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' }
      ];
    }
    // Batch insert assignments (使用 UNNEST)
    if (query.includes('INSERT INTO task_assignments') && query.includes('unnest')) {
      return [{ task_id: mockTask.id, user_id: 'user-1' }];
    }
    // File count
    if (query.includes('SELECT COUNT(*)') && query.includes('task_files')) {
      return [{ count: '0' }];
    }
    // Assignment count
    if (query.includes('SELECT COUNT(*)') && query.includes('task_assignments')) {
      return [{ count: '3' }];
    }
    return [];
  });

  const request = createAuthenticatedRequest('http://localhost/api/tasks', {
    method: 'POST',
    body: {
      title: 'Task with all users',
      assignmentType: 'all',
    },
    user: mockAdminUser,
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(201);
  expect(data.success).toBe(true);
});
```

**Step 2: 运行测试验证**

运行: `npm test -- src/app/api/tasks/__tests__/route.test.ts --run`
预期: 测试通过

---

### Task 3: 添加 POST 错误处理覆盖 (route.ts:236-237)

**文件:** src/app/api/tasks/__tests__/route.test.ts

**Step 1: 添加数据库错误测试**

```typescript
it('returns 500 when database error occurs on create', async () => {
  setupMockImplementation((query) => {
    // Insert task - simulate database error
    if (query.includes('INSERT INTO tasks')) {
      throw new Error('Database connection failed');
    }
    return [];
  });

  const request = createAuthenticatedRequest('http://localhost/api/tasks', {
    method: 'POST',
    body: {
      title: 'Test Task',
    },
    user: mockAdminUser,
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(500);
  expect(data.success).toBe(false);
});
```

**Step 2: 运行测试验证**

运行: `npm test -- src/app/api/tasks/__tests__/route.test.ts --run`
预期: 测试通过

---

### Task 4: 修复 [id]/route.ts:425 DELETE 404 覆盖

**文件:** src/app/api/tasks/__tests__/route.test.ts

**Step 1: 修改现有 404 测试确保覆盖正确路径**

检查现有测试的 mock 是否正确触发 404 路径。需要确保 UPDATE 返回空数组。

```typescript
it('returns 404 for non-existing task on DELETE', async () => {
  setupMockImplementation((query) => {
    // SELECT for existing check
    if (query.includes('SELECT') && query.includes('FROM tasks')) {
      return [];  // 任务不存在
    }
    return [];
  });

  const request = createAuthenticatedRequest('http://localhost/api/tasks/non-existing', {
    method: 'DELETE',
    user: mockAdminUser,
  });

  const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existing' }) });
  const data = await response.json();

  expect(response.status).toBe(404);
  expect(data.success).toBe(false);
});
```

**Step 2: 运行测试验证**

运行: `npm test -- src/app/api/tasks/__tests__/route.test.ts --run`
预期: 测试通过

---

### Task 5: 添加 DELETE 错误处理覆盖 ([id]/route.ts:430-431)

**文件:** src/app/api/tasks/__tests__/route.test.ts

**Step 1: 添加数据库错误测试**

```typescript
it('returns 500 when database error occurs on delete', async () => {
  setupMockImplementation((query) => {
    // SELECT task
    if (query.includes('SELECT') && query.includes('FROM tasks')) {
      return [mockTask];
    }
    // UPDATE - simulate error
    if (query.includes('UPDATE tasks')) {
      throw new Error('Database connection failed');
    }
    return [];
  });

  const request = createAuthenticatedRequest('http://localhost/api/tasks/task-123', {
    method: 'DELETE',
    user: mockAdminUser,
  });

  const response = await DELETE(request, { params: Promise.resolve({ id: 'task-123' }) });
  const data = await response.json();

  expect(response.status).toBe(500);
  expect(data.success).toBe(false);
});
```

**Step 2: 运行测试验证**

运行: `npm test -- src/app/api/tasks/__tests__/route.test.ts --run`
预期: 测试通过

---

### Task 6: 运行完整测试并验证覆盖率

**Step 1: 运行完整测试套件**

运行: `npm test -- --run --coverage`

**Step 2: 验证覆盖率**

预期: app/api/tasks 目录达到 80% 以上

**Step 3: 如果未达标，继续添加测试**
