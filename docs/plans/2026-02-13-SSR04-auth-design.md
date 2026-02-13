# SSR04 用户认证模块 - 后端设计文档

## 1. 概述

本文档描述学习管理系统 SSR04（用户与认证模块）的后端设计与实现方案。

**目标：** 实现完整的用户认证、用户管理、部门管理 API，测试覆盖率达到 80%。

**参考文档：** SRS-04-用户认证.md

---

## 2. API 接口清单

### 2.1 认证接口

| 接口 | 方法 | 路径 | 描述 |
|-----|------|------|------|
| 用户登录 | POST | /api/auth/login | 用户登录系统 |
| 用户登出 | POST | /api/auth/logout | 用户退出系统 |
| 获取当前用户 | GET | /api/auth/me | 获取当前登录用户信息 |

### 2.2 用户管理接口

| 接口 | 方法 | 路径 | 描述 |
|-----|------|------|------|
| 获取用户列表 | GET | /api/users | 分页、筛选 |
| 创建用户 | POST | /api/users | 新增用户 |
| 获取用户详情 | GET | /api/users/[id] | 用户详情 |
| 更新用户 | PUT | /api/users/[id] | 更新用户 |
| 删除用户 | DELETE | /api/users/[id] | 删除用户 |

### 2.3 部门管理接口

| 接口 | 方法 | 路径 | 描述 |
|-----|------|------|------|
| 获取部门列表 | GET | /api/departments | 树形结构 |
| 创建部门 | POST | /api/departments | 新增部门 |
| 获取部门详情 | GET | /api/departments/[id] | 包含成员 |
| 更新部门 | PUT | /api/departments/[id] | 更新部门 |
| 删除部门 | DELETE | /api/departments/[id] | 删除部门 |
| 获取部门成员 | GET | /api/departments/[id]/users | 成员列表 |
| 添加成员 | POST | /api/departments/[id]/users | 添加成员 |
| 移除成员 | DELETE | /api/departments/[id]/users | 移除成员 |

---

## 3. 响应格式

### 3.1 统一响应格式

所有 API 响应采用 snake_case 格式：

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### 3.2 用户登录响应示例

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "admin",
      "name": "系统管理员",
      "role": "admin",
      "department_id": null
    }
  }
}
```

### 3.3 部门响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "dept-uuid",
      "name": "技术部",
      "description": "技术研发部门",
      "parent_id": null,
      "leader_id": null,
      "created_at": "2024-01-01T00:00:00Z",
      "user_count": "15"
    }
  ]
}
```

---

## 4. 权限矩阵

根据 SRS-04 第 5.1 节权限矩阵：

| 功能 | 管理员 | 部门主管 | 员工 |
|-----|-------|---------|------|
| 用户登录/登出 | ✅ | ✅ | ✅ |
| 查看用户列表 | ✅ | 仅本部门 | ❌ |
| 创建用户 | ✅ | ❌ | ❌ |
| 编辑用户 | ✅ | 仅本部门 | 仅本人 |
| 删除用户 | ✅ | ❌ | ❌ |
| 部门管理 | ✅ | ❌ | ❌ |
| 部门人员调整 | ✅ | ✅ | ❌ |

### 角色定义

- `admin` - 管理员：完全访问权限
- `leader` - 部门主管：受限访问
- `user` - 员工：受限访问

---

## 5. 数据模型

### 5.1 users 表

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

### 5.2 departments 表

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

---

## 6. 业务规则

### 6.1 用户规则

| 规则 | 说明 |
|-----|------|
| 用户名唯一 | 4-50字符，字母数字下划线 |
| 密码要求 | 最少6位 |
| 初始角色 | 默认"员工" |
| 登录锁定 | 连续失败5次锁定30分钟 |

### 6.2 部门规则

- 部门名称同级唯一
- 删除部门时，用户保留但部门ID设为NULL
- 部门负责人必须是该部门成员

---

## 7. 需要修改的文件清单

### 7.1 响应格式修改（snake_case）

1. `src/app/api/auth/login/route.ts` - user 对象字段
2. `src/app/api/auth/me/route.ts` - 用户信息字段
3. `src/app/api/users/route.ts` - 用户列表和创建响应
4. `src/app/api/users/[id]/route.ts` - 用户详情和更新响应
5. `src/app/api/departments/route.ts` - 部门列表和创建响应
6. `src/app/api/departments/[id]/route.ts` - 部门详情和更新响应
7. `src/app/api/departments/[id]/users/route.ts` - 部门成员响应

### 7.2 权限检查修改

- 所有 API 添加 leader 角色支持
- 实现权限矩阵规则

### 7.3 新增功能

- `src/app/api/departments/[id]/users/route.ts` - DELETE 方法

### 7.4 测试文件

1. `src/app/api/auth/login/__tests__/route.test.ts` - 已有，需补充
2. `src/app/api/users/__tests__/route.test.ts` - 新建
3. `src/app/api/departments/__tests__/route.test.ts` - 新建
4. `src/lib/__tests__/auth.test.ts` - 已有，需补充

---

## 8. 测试覆盖率目标

| 模块 | 目标覆盖率 |
|-----|----------|
| auth | 80%+ |
| users | 80%+ |
| departments | 80%+ |
| 全局 | 80%+ |

---

## 9. 实现顺序

1. 修改响应格式为 snake_case
2. 添加 leader 角色支持
3. 新增 DELETE /api/departments/[id]/users
4. 编写单元测试
5. 验证覆盖率达标
