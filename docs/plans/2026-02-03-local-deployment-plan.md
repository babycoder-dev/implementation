# 本地部署方案 - 学习管理系统

## 概述

使用 Docker Compose 在本地部署学习管理系统，包含 PostgreSQL 数据库、MinIO 文件存储和 Next.js Web 应用。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Docker Host                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │   MinIO    │  │  Next.js   │    │
│  │   :5432    │  │   :9000    │  │   :3000    │    │
│  │             │  │             │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│        │                │                │             │
│        └────────────────┴────────────────┘             │
│                   docker网络                      │
└─────────────────────────────────────────────────────────────┘
```

## 服务组件

### 1. PostgreSQL (数据库)

- **镜像**: postgres:16-alpine
- **端口**: 5432
- **环境变量**:
  - POSTGRES_DB: learning_system
  - POSTGRES_USER: postgres
  - POSTGRES_PASSWORD: postgres
- **持久化**: docker volume `postgres-data`

### 2. MinIO (文件存储)

- **镜像**: minio/minio:latest
- **端口**: 9000 (API), 9001 (Console)
- **环境变量**:
  - MINIO_ROOT_USER: minioadmin
  - MINIO_ROOT_PASSWORD: minioadmin
- **持久化**: docker volume `minio-data`

### 3. Next.js 应用

- **镜像**: 基于 node:20-alpine 构建
- **端口**: 3000
- **环境变量**:
  - DATABASE_URL: postgresql://postgres:postgres@postgres:5432/learning_system
  - MINIO_ENDPOINT: minio
  - MINIO_PORT: 9000
  - MINIO_ACCESS_KEY: minioadmin
  - MINIO_SECRET_KEY: minioadmin
  - MINIO_BUCKET: learning-files
  - MINIO_USE_SSL: false
  - SESSION_SECRET: (随机生成)

## 部署步骤

### 1. 创建配置文件

```bash
# 复制环境变量模板
cp .env.example .env
```

### 2. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 3. 初始化数据库

```bash
# 运行数据库迁移
npm run db:push

# 创建管理员账户
npm run create-admin
```

### 4. 访问应用

- **应用**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
  - 用户名: minioadmin
  - 密码: minioadmin

## 数据持久化

所有数据存储在 Docker volumes 中：
- `postgres-data`: 数据库数据
- `minio-data`: 文件存储数据

删除容器不会丢失数据。如需完全清理：
```bash
docker-compose down -v
```

## 管理命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs [service-name]

# 重建并启动
docker-compose up -d --build

# 进入容器
docker-compose exec nextjs sh
docker-compose exec postgres psql -U postgres -d learning_system
```

## 初始管理员账户

使用 `npm run create-admin` 创建的账户：
- 默认用户名: admin
- 默认密码: Admin@123（可在脚本中修改）
- 角色: admin

## 注意事项

1. **首次部署**: 确保 `.env` 文件存在且包含正确的环境变量
2. **端口冲突**: 如端口被占用，修改 docker-compose.yml 中的端口映射
3. **浏览器缓存**: MinIO Console 可能需要清除缓存才能正常加载
4. **生产环境**:
   - 修改默认密码
   - 使用强 SESSION_SECRET（至少 32 字符）
   - 配置 HTTPS
   - 使用外部 PostgreSQL 和 S3 服务
