# 系统功能测试清单

> **目标**：对照最初需求，全面测试所有功能模块

## 测试方法

```bash
# 完整测试流程
1. docker-compose down  # 停止所有容器
2. docker-compose up -d --build  # 完全重建并启动
3. wait for containers to be healthy
4. 执行以下测试用例
```

## 测试用例

### 认证模块

| 用例 | 步骤 | 预期结果 |
|------|------|----------|
| 用户注册 | POST /api/auth/register | 返回用户信息，设置 session cookie |
| 用户登录 | POST /api/auth/login | 返回 token 和用户信息 |
| 用户登出 | POST /api/auth/logout | 清除 session cookie |
| 获取当前用户 | GET /api/users/me | 返回当前登录用户信息 |

### 用户管理模块 (管理员)

| 用例 | 步骤 | 预期结果 |
|------|------|----------|
| 获取用户列表 | GET /api/admin/users | 返回所有用户 |
| 创建用户 | POST /api/admin/users | 创建新用户 |
| 更新用户 | PUT /api/admin/users/[id] | 更新用户信息 |
| 删除用户 | DELETE /api/admin/users/[id] | 删除用户 |
| 切换用户状态 | PUT /api/admin/users/[id]/toggle-status | 启用/禁用用户 |

### 任务管理模块

| 用例 | 步骤 | 预期结果 |
|------|------|----------|
| 创建任务 | POST /api/tasks | 创建任务，返回任务ID |
| 获取任务列表 | GET /api/tasks | 返回所有任务 |
| 获取单个任务 | GET /api/tasks/[id] | 返回任务详情 |
| 更新任务 | PUT /api/tasks/[id] | 更新任务 |
| 删除任务 | DELETE /api/tasks/[id] | 删除任务 |
| 任务分配 | POST /api/tasks/[id]/assign | 分配任务给用户 |
| 上传任务文件 | POST /api/tasks/[id]/files | 上传文件 |

### 学习模块

| 用例 | 步骤 | 预期结果 |
|------|------|----------|
| PDF 阅读记录 | POST /api/learning/log | 记录阅读进度 |
| 视频进度 | GET/PUT /api/learning/progress | 获取/更新进度 |
| 视频日志 | POST /api/learning/video/log | 记录视频操作 |

### 测验模块

| 用例 | 步骤 | 预期结果 |
|------|------|----------|
| 获取题目 | GET /api/quiz/questions?taskId=xxx | 返回题目列表 |
| 提交答案 | POST /api/quiz/submit | 返回正确答案/分数 |
| 获取结果 | GET /api/quiz/results | 返回测验结果 |

### 管理后台页面

| 用例 | URL | 预期结果 |
|------|-----|----------|
| 管理主页 | /admin | 显示统计信息 |
| 任务列表 | /admin/tasks | 显示任务列表 |
| 创建任务 | /admin/tasks/create | 显示创建表单 |
| 编辑任务 | /admin/tasks/[id] | 显示编辑表单 |
| 用户列表 | /admin/users | 显示用户列表 |
| 创建用户 | /admin/users/create | 显示创建表单 |
| 编辑用户 | /admin/users/[id] | 显示编辑表单 |
| 报表页面 | /admin/reports | 显示统计报表 |
| 设置页面 | /admin/settings | 显示设置表单 |

## 快速测试命令

```bash
# 1. 登录获取 token
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. 创建任务
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: session-token=$TOKEN" \
  -d '{"title":"测试任务","description":"测试","assignedUserIds":[],"files":[]}'

# 3. 获取任务列表
curl "http://localhost:3000/api/tasks" \
  -H "Cookie: session-token=$TOKEN"
```

## 常见问题排查

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 500 错误 | Docker 容器未更新 | `docker-compose down && docker-compose up -d --build` |
| 401 未授权 | Session 过期或无效 | 重新登录获取新 token |
| 403 无权限 | 不是管理员 | 使用 admin 账号 |
| 数据库连接失败 | Postgres 未启动 | `docker-compose up -d postgres` |
| 文件上传失败 | MinIO 未启动 | `docker-compose up -d minio` |

## 验证命令

```bash
# 检查所有服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app

# 查看数据库日志
docker-compose logs postgres

# 验证 API 健康
curl http://localhost:3000/api/admin/dashboard \
  -H "Cookie: session-token=$(get_token)"
```
