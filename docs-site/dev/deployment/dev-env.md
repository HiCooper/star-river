# 开发环境

本指南帮助开发者在本地搭建 Hydra 开发环境。

## 环境要求

| 组件 | 版本要求 |
|------|---------|
| Go | 1.21+ |
| Node.js | 18+ |
| PostgreSQL | 15+ |
| Redis | 7.0+ |
| Docker | 24+ (可选) |

## 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/hydra-pay/hydra.git
cd hydra
```

### 2. 启动依赖服务

使用 Docker 启动 PostgreSQL 和 Redis：

```bash
docker run -d \
  --name hydra-postgres \
  -e POSTGRES_PASSWORD=hydra_dev \
  -e POSTGRES_DB=hydra \
  -p 5432:5432 \
  postgres:15

docker run -d \
  --name hydra-redis \
  -p 6379:6379 \
  redis:7
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 数据库
DATABASE_URL=postgres://postgres:hydra_dev@localhost:5432/hydra?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# API Keys (开发环境使用)
API_KEY=dev_api_key_xxxxx
WALL_WEBHOOK_SECRET=dev_webhook_secret_xxxxx
PAY_WEBHOOK_SECRET=dev_pay_webhook_secret_xxxxx

# 渠道配置 (沙箱环境)
STRIPE_SECRET_KEY=sk_test_xxxxx
ALIPAY_APP_ID=2021000000000000
ALIPAY_PRIVATE_KEY=xxxxx
WECHAT_MCH_ID=1234567890
```

### 4. 启动服务

**hydra-wall**

```bash
cd hydra-wall
go run cmd/server/main.go
```

**hydra-pay**

```bash
cd hydra-pay
go run cmd/server/main.go
```

服务默认端口：
- hydra-wall: `localhost:8080`
- hydra-pay: `localhost:8081`

## 数据库迁移

### 运行迁移

```bash
# wall 服务
cd hydra-wall
migrate -path internal/db/migrations -database "$DATABASE_URL" up

# pay 服务
cd hydra-pay
migrate -path internal/db/migrations -database "$DATABASE_URL" up
```

### 创建迁移

```bash
migrate create -ext sql -dir internal/db/migrations -seq add_user_table
```

## 调试

### 启用调试日志

```bash
DEBUG=1 go run cmd/server/main.go
```

### 使用 Delve 调试

```bash
dlv debug cmd/server/main.go
```

## 测试

### 运行单元测试

```bash
go test ./...
```

### 运行集成测试

需要启动完整的环境：

```bash
docker compose up -d
go test -tags=integration ./...
```

## 常见问题

**Q: 数据库连接失败？**
A: 检查 PostgreSQL 是否启动，DATABASE_URL 是否正确。

**Q: Redis 连接失败？**
A: 检查 Redis 是否启动，REDIS_URL 是否正确。

**Q: 渠道 SDK 报错？**
A: 确保使用的是沙箱环境的 API Keys。
