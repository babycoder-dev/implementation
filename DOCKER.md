# Docker 部署指南

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 启动所有服务

```bash
# 构建并启动
npm run docker:up

# 或者使用 docker-compose 直接
docker-compose up -d --build
```

### 2. 初始化数据库

等待 PostgreSQL 健康检查通过后，在另一个终端运行：

```bash
# 使用 docker-compose exec 进入应用容器并运行迁移
docker-compose exec app npm run db:push

# 创建默认管理员账户
docker-compose exec app npm run create-admin
```

默认管理员账户：
- 用户名: `admin`
- 密码: `Admin@123`

### 3. 访问应用

- **Web 应用**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
  - 用户名: `minioadmin`
  - 密码: `minioadmin`

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs app
docker-compose logs postgres
docker-compose logs minio

# 跟踪日志输出
docker-compose logs -f

# 停止所有服务
npm run docker:down

# 停止并删除 volumes（清除所有数据）
docker-compose down -v

# 重建并启动
npm run docker:rebuild

# 进入应用容器
docker-compose exec app sh

# 进入数据库容器
docker-compose exec postgres psql -U postgres -d learning_system
```

## 环境变量

可以通过 `.env` 文件或 `docker-compose.yml` 中的 `environment` 部分配置环境变量。

### 默认配置（不安全，仅用于本地测试）

```yaml
environment:
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/learning_system
  MINIO_ENDPOINT: minio
  MINIO_PORT: '9000'
  MINIO_ACCESS_KEY: minioadmin
  MINIO_SECRET_KEY: minioadmin
  MINIO_BUCKET: learning-files
  MINIO_USE_SSL: 'false'
  SESSION_SECRET: default-session-secret-change-in-production
```

### 生产环境建议

修改 `.env` 文件，使用强密码和密钥：

```bash
SESSION_SECRET=生成至少32字符的随机字符串
MINIO_ACCESS_KEY=使用强密钥
MINIO_SECRET_KEY=使用强密钥
```

## 数据持久化

所有数据存储在 Docker volumes 中：

| Volume | 说明 |
|--------|------|
| `postgres-data` | PostgreSQL 数据库文件 |
| `minio-data` | MinIO 文件存储 |

删除容器不会丢失数据。如需完全清理：

```bash
docker-compose down -v
```

## 故障排查

### 服务无法启动

```bash
# 检查端口占用
netstat -tuln | grep -E ':(5432|9000|9001|3000)'

# 修改 docker-compose.yml 中的端口映射
ports:
  - '新端口:5432'
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 日志
docker-compose logs postgres

# 确认数据库就绪
docker-compose ps
# postgres 服务应该显示 "healthy"
```

### MinIO 无法访问

```bash
# 检查 MinIO 容器日志
docker-compose logs minio

# 确认 bucket 已创建
# 在 MinIO Console 中手动创建 bucket: learning-files
```

### 应用无法启动

```bash
# 查看应用日志
docker-compose logs app

# 检查环境变量
docker-compose exec app env | grep -E 'DATABASE|MINIO|SESSION'
```

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│               Docker Host                      │
│                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────┐    │
│  │ PostgreSQL  │  │   MinIO    │  │ App │    │
│  │   :5432    │  │   :9000    │  │:3000│    │
│  └─────────────┘  └─────────────┘  └─────┘    │
│        │                │                │         │
│        └────────────────┴────────────────┘         │
│              docker网络                   │
└─────────────────────────────────────────────────────┘
```

所有服务在同一 `docker` 网络中，可以通过服务名互相访问。
