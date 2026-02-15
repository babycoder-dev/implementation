# SSR06 报表统计模块设计

## 概述

实现报表统计后端API，包括部门管理、任务完成率、部门报表、个人学习明细和文件数据统计功能。

## 数据库设计

### 新增表：departments（部门）

```sql
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp DEFAULT now()
);
```

### 修改表：users

添加 `departmentId` 字段关联部门：

```sql
ALTER TABLE users ADD COLUMN department_id uuid REFERENCES departments(id);
```

## API 接口设计

### 1. 部门管理

| 接口 | 方法 | 描述 |
|-----|------|------|
| GET /api/admin/departments | 获取部门列表 | 包含用户统计 |
| POST /api/admin/departments | 创建部门 | |
| PUT /api/admin/departments/[id] | 更新部门 | |
| DELETE /api/admin/departments/[id] | 删除部门 | |

### 2. 报表接口

| 接口 | 方法 | 描述 |
|-----|------|------|
| GET /api/reports/tasks | 任务完成率 | 支持时间范围过滤 |
| GET /api/reports/departments | 部门报表 | 支持时间范围过滤 |
| GET /api/reports/users | 个人学习明细 | 支持部门/搜索过滤 |
| GET /api/reports/files | 文件数据总览 | 支持任务/时间过滤 |

## 响应格式

```json
{
  "success": true,
  "data": { },
  "timestamp": "2024-01-20T12:00:00Z"
}
```

## 统计规则

- **完成率** = (已完成数 / 应学数) * 100
- **平均分** = 测验分数总和 / 测验提交次数
- **时长显示**：秒/分/小时自动转换

## 权限

所有报表接口仅管理员可访问。

## 实现顺序

1. 创建部门相关API（管理+报表）
2. 实现任务完成率报表
3. 实现个人学习明细报表
4. 实现文件数据统计
5. 编写测试，覆盖率80%+
