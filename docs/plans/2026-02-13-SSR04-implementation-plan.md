# SSR04 用户认证模块 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现完整的用户认证、用户管理、部门管理 API，响应格式改为 snake_case，支持 admin/leader/user 三种角色权限矩阵，测试覆盖率达到 80%。

**Architecture:** 基于现有 Next.js App Router 架构，修改现有 API 响应格式为 snake_case，新增缺失的 DELETE 方法，添加 leader 角色权限支持。

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, Vitest, bcryptjs, JWT

---

## 阶段一：修改响应格式为 snake_case

### Task 1: 修改 auth/login 响应格式

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/auth/login/route.ts
```

**Step 2: 修改响应字段为 snake_case**

将第 71-77 行的 user 对象改为：
```typescript
user: {
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  department_id: user.department_id,
},
```

**Step 3: 运行测试**
```bash
npm test -- --run src/app/api/auth/login/__tests__/route.test.ts
```

**Step 4: 提交**
```bash
git add src/app/api/auth/login/route.ts
git commit -m "fix(auth): use snake_case in login response"
```

---

### Task 2: 修改 auth/me 响应格式

**Files:**
- Modify: `src/app/api/auth/me/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/auth/me/route.ts
```

**Step 2: 修改响应字段为 snake_case**

将返回的用户对象字段改为 snake_case 格式（id, username, name, role, department_id, created_at）

**Step 3: 提交**
```bash
git add src/app/api/auth/me/route.ts
git commit -m "fix(auth): use snake_case in me response"
```

---

### Task 3: 修改 users 列表响应格式

**Files:**
- Modify: `src/app/api/users/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/users/route.ts
```

**Step 2: 修改 UserResponse 接口和映射**

将 UserResponse 中的字段改为 snake_case：
```typescript
interface UserResponse {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'leader' | 'user';
  status: 'active' | 'disabled';
  department_id: string | null;
  department_name: string | null;
  created_at: string;
}
```

**Step 3: 提交**
```bash
git add src/app/api/users/route.ts
git commit -m "fix(users): use snake_case in list response"
```

---

### Task 4: 修改 users/[id] 响应格式

**Files:**
- Modify: `src/app/api/users/[id]/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/users/[id]/route.ts
```

**Step 2: 修改所有响应字段为 snake_case**

**Step 3: 提交**
```bash
git add src/app/api/users/[id]/route.ts
git commit -m "fix(users): use snake_case in detail response"
```

---

### Task 5: 修改 departments 响应格式

**Files:**
- Modify: `src/app/api/departments/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/departments/route.ts
```

**Step 2: 修改返回的部门字段为 snake_case**

**Step 3: 提交**
```bash
git add src/app/api/departments/route.ts
git commit -m "fix(departments): use snake_case in list response"
```

---

### Task 6: 修改 departments/[id] 响应格式

**Files:**
- Modify: `src/app/api/departments/[id]/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/departments/[id]/route.ts
```

**Step 2: 修改所有响应字段为 snake_case**

**Step 3: 提交**
```bash
git add src/app/api/departments/[id]/route.ts
git commit -m "fix(departments): use snake_case in detail response"
```

---

### Task 7: 修改 departments/[id]/users 响应格式

**Files:**
- Modify: `src/app/api/departments/[id]/users/route.ts`

**Step 1: 读取当前文件**
```bash
cat src/app/api/departments/[id]/users/route.ts
```

**Step 2: 修改用户字段为 snake_case**

**Step 3: 提交**
```bash
git add src/app/api/departments/[id]/users/route.ts
git commit -m "fix(departments): use snake_case in users response"
```

---

## 阶段二：添加 leader 角色支持

### Task 8: 添加 leader 角色类型定义

**Files:**
- Modify: `src/lib/types.ts` (或创建)

**Step 1: 检查现有类型定义**
```bash
cat src/lib/types.ts 2>/dev/null || echo "File not found"
```

**Step 2: 添加角色类型**
```typescript
export type UserRole = 'admin' | 'leader' | 'user';
export type UserStatus = 'active' | 'disabled';
```

**Step 3: 提交**
```bash
git add src/lib/types.ts
git commit -m "types: add UserRole and UserStatus types"
```

---

### Task 9: 修改 users API 支持 leader 角色

**Files:**
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/api/users/[id]/route.ts`

**Step 1: 修改 role 验证允许 'leader'**

在创建和更新用户的 Zod 验证中，将 role 改为：
```typescript
role: z.enum(['admin', 'leader', 'user']).default('user'),
```

**Step 2: 提交**
```bash
git add src/app/api/users/route.ts src/app/api/users/[id]/route.ts
git commit -m "feat(users): add leader role support"
```

---

### Task 10: 修改部门成员 API 支持 leader

**Files:**
- Modify: `src/app/api/departments/[id]/users/route.ts`

**Step 1: 修改权限检查**

允许 admin 和 leader 角色访问：
```typescript
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**Step 2: 提交**
```bash
git add src/app/api/departments/[id]/users/route.ts
git commit -m "feat(departments): allow leader to manage department users"
```

---

## 阶段三：新增缺失 API

### Task 11: 新增 DELETE /api/departments/[id]/users

**Files:**
- Modify: `src/app/api/departments/[id]/users/route.ts`

**Step 1: 添加 DELETE 方法**

在文件末尾添加：
```typescript
// DELETE /api/departments/[id]/users - Remove user from department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId } = await params;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Verify user belongs to this department
    const userDept = await sql`SELECT department_id FROM users WHERE id = ${user_id}`;
    if (userDept.length === 0 || userDept[0].department_id !== departmentId) {
      return NextResponse.json({ success: false, error: 'User not in this department' }, { status: 404 });
    }

    // Remove user from department (set department_id to null)
    await sql`UPDATE users SET department_id = NULL WHERE id = ${user_id}`;

    return NextResponse.json({ success: true, message: 'User removed from department' });
  } catch (error) {
    console.error('Error removing user from department:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove user from department' }, { status: 500 });
  }
}
```

**Step 2: 提交**
```bash
git add src/app/api/departments/[id]/users/route.ts
git commit -m "feat(departments): add DELETE method to remove user from department"
```

---

## 阶段四：编写测试

### Task 12: 编写 users API 单元测试

**Files:**
- Create: `src/app/api/users/__tests__/route.test.ts`

**Step 1: 创建测试文件**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromHeaders: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
}));

import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { GET, POST } from '../route';

const mockSql = sql as ReturnType<typeof vi.fn>;
const mockGetUserFromHeaders = getUserFromHeaders as ReturnType<typeof vi.fn>;

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('should return 403 if not admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'user-1', role: 'user' });
    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('should return users list for admin', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([
      { id: 'user-1', username: 'test', name: 'Test User', role: 'user', status: 'active', department_id: null, department_name: null, created_at: '2024-01-01' }
    ]);

    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUserFromHeaders.mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should create user successfully', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql
      .mockResolvedValueOnce([]) // Check username exists
      .mockResolvedValueOnce([]) // Check department exists
      .mockResolvedValueOnce([{ id: 'new-user', username: 'test', name: 'Test', role: 'user', status: 'active', department_id: null, created_at: '2024-01-01' }]);

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'password123', name: 'Test User' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 409 if username exists', async () => {
    mockGetUserFromHeaders.mockReturnValue({ userId: 'admin-1', role: 'admin' });
    mockSql.mockResolvedValue([{ id: 'existing-user' }]);

    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'existing', password: 'password', name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
```

**Step 2: 运行测试**
```bash
npm test -- --run src/app/api/users/__tests__/route.test.ts
```

**Step 3: 提交**
```bash
git add src/app/api/users/__tests__/route.test.ts
git commit -m "test(users): add unit tests for users API"
```

---

### Task 13: 编写 departments API 单元测试

**Files:**
- Create: `src/app/api/departments/__tests__/route.test.ts`

**Step 1: 创建测试文件**

参考 users 测试模式，创建 departments 的 GET 和 POST 测试

**Step 2: 运行测试**
```bash
npm test -- --run src/app/api/departments/__tests__/route.test.ts
```

**Step 3: 提交**
```bash
git add src/app/api/departments/__tests__/route.test.ts
git commit -m "test(departments): add unit tests for departments API"
```

---

### Task 14: 补充 auth 测试

**Files:**
- Modify: `src/app/api/auth/login/__tests__/route.test.ts`

**Step 1: 添加更多测试用例**

添加测试：登录成功、用户名不存在、密码错误、响应格式验证

**Step 2: 提交**
```bash
git add src/app/api/auth/login/__tests__/route.test.ts
git commit -m "test(auth): add more login tests"
```

---

### Task 15: 补充 lib/auth 测试

**Files:**
- Modify: `src/lib/__tests__/auth.test.ts`

**Step 1: 添加更多测试用例**

测试 getUserFromHeaders、verifyPassword 等函数

**Step 2: 提交**
```bash
git add src/lib/__tests__/auth.test.ts
git commit -m "test(auth): add auth utility tests"
```

---

## 阶段五：验证覆盖率

### Task 16: 运行覆盖率检查

**Step 1: 运行测试并查看覆盖率**
```bash
npm test -- --coverage --run 2>&1 | tail -30
```

**Step 2: 检查是否达到 80%**

如果未达标，添加更多测试用例补充覆盖率

**Step 3: 提交**
```bash
git commit -m "test: update test coverage for SSR04"
```

---

## 总结

完成所有任务后，确保：
1. 所有 API 响应使用 snake_case
2. 支持 admin/leader/user 三种角色
3. 实现权限矩阵规则
4. 测试覆盖率达到 80%
