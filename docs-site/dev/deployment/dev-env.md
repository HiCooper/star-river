# 开发环境

本指南帮助开发者在本地搭建 Hydra 开发环境。

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Go | 1.21+ | wall-service / pay-service |
| Node.js | 18+ | wall-admin 前端管理面板 |
| Docker | 24+ | 中间件（PostgreSQL + Redis） |
| Python 3 | 任意 | curl 测试时解析 JSON 响应 |

## 项目结构

```
star-river/
├── docker-compose.infra.yml       # 共享中间件（postgres + redis）
├── docker/infra-init/             # 数据库初始化脚本
├── hydra-wall/
│   ├── service/                   # wall-service (Go, :8080)
│   │   ├── cmd/server/main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── handler/
│   │   │   ├── middleware/
│   │   │   ├── model/
│   │   │   ├── repository/
│   │   │   ├── router/
│   │   │   └── service/
│   │   └── docker-compose.yml     # 仅引用 shared-infra 网络
│   └── front/wall-admin/          # 管理后台 (Next.js, :3000)
├── hydra-pay/
│   └── service/                   # pay-service (Go, :8082)
│       ├── cmd/server/main.go
│       └── internal/
│           ├── channel/           # 渠道适配器（alipay/wechat/stripe）
│           ├── config/
│           ├── database/
│           ├── handler/
│           ├── middleware/
│           ├── model/
│           ├── repository/
│           ├── router/
│           └── service/
├── docs-site/                     # VitePress 文档站点
└── qa-outputs/                    # 质量审查输出
```

## 一、启动共享中间件

项目使用统一的共享中间件网络，与 [docke-flow](https://github.com/HiCooper/star-river) 的其他服务（如 gate-flow）保持一致。

```bash
cd /Users/xueancao/Projects/QoderProjects/star-river

# 启动 PostgreSQL + Redis（首次启动会自动创建 wall_db 和 hydra_pay）
docker compose -f docker-compose.infra.yml up -d
```

验证中间件状态：

```bash
docker ps --filter "name=postgres" --filter "name=redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

预期输出：

```
NAMES      STATUS                   PORTS
postgres   Up (healthy)             0.0.0.0:5432->5432/tcp
redis      Up (healthy)             0.0.0.0:6379->6379/tcp
```

::: details 中间件连接参数
| 参数 | 值 |
|------|-----|
| PostgreSQL 地址 | `localhost:5432` |
| 用户 | `hydra` |
| 密码 | `hydra_secret` |
| wall database | `wall_db` |
| pay database | `hydra_pay` |
| Redis 地址 | `localhost:6379` |
:::

::: tip 与 gate-flow 共享
中间件容器名称为 `postgres`、`redis`，使用 `shared-infra` 网络。gate-flow 项目的服务也连接同一网络，避免为每个项目启动独立实例。
:::

## 二、启动 wall-service

每个服务目录下都有 `setup.sh` 一键启动脚本，自动完成编译和启动。

```bash
cd hydra-wall/service
./setup.sh
```

服务启动时会自动执行 GORM AutoMigrate，创建所需的数据库表。

验证：

```bash
curl http://localhost:8080/health
# → {"success":true,"data":{"service":"wall-service","status":"ok"}}
```

## 三、启动 pay-service

```bash
cd hydra-pay/service
./setup.sh
```

验证：

```bash
curl http://localhost:8082/health
# → {"status":"ok"}
```

::: details setup.sh 做了什么
```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"
go build -o /tmp/pay-server ./cmd/server/
PORT=8082 GIN_MODE=debug /tmp/pay-server
```
两个服务的脚本结构一致，仅环境变量和输出路径不同。
:::

## 四、启动管理后台（可选）

```bash
cd hydra-wall/front/wall-admin

npm install
npm run dev
# → http://localhost:3000
```

## 数据库管理

两个服务的数据库表由 GORM AutoMigrate 在启动时自动创建，无需手动执行迁移。

### 连接数据库

```bash
# wall 数据库
docker exec postgres psql -U hydra -d wall_db

# pay 数据库
docker exec postgres psql -U hydra -d hydra_pay
```

### 重置数据库

```bash
# 删除并重建所有数据
docker compose -f docker-compose.infra.yml down -v
docker compose -f docker-compose.infra.yml up -d
```

## 运行测试

```bash
# wall-service
cd hydra-wall/service
go test ./...

# pay-service
cd hydra-pay/service
go test ./...
```

## 调试

### 启用 GORM 详细日志

修改 `internal/database/database.go`，将 `logger.Warn` 改为 `logger.Info`：

```go
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
    PrepareStmt: true,
    Logger:      logger.Default.LogMode(logger.Info), // ← 改为 Info
})
```

### 查看服务日志

服务直接输出到 stdout/stderr，启动时使用重定向保存日志：

```bash
SERVER_MODE=debug /tmp/wall-server 2>&1 | tee wall.log
```

## 端口分配

| 端口 | 服务 | 说明 |
|------|------|------|
| 5432 | PostgreSQL | 共享中间件 |
| 6379 | Redis | 共享中间件 |
| 8080 | wall-service | 付费墙 API |
| 8081 | gate-flow (Java) | **避免冲突** |
| 8082 | pay-service | 支付 API |
| 3000 | wall-admin | 管理后台 |

## 常见问题

**Q: pay-service 启动报 "insufficient arguments"？**
A: 确认 `internal/database/database.go` 中 `PrepareStmt: true`。GORM postgres 驱动的 GetRows 在 `PrepareStmt=false` 时会启用 simple protocol，与 pgx 的 query sanitizer 产生冲突。

**Q: 数据库连接失败？**
A: 检查中间件是否启动 —— `docker ps --filter "name=postgres"`。如果容器不存在，运行 `docker compose -f docker-compose.infra.yml up -d`。

**Q: gin mode unknown: development？**
A: Gin 只接受 `debug`、`release`、`test` 三种模式。确保 `SERVER_MODE` 或 `GIN_MODE` 环境变量不是 `development`。

**Q: 支付 API key 认证失败？**
A: 首次启动 pay-service 后，需要手动插入 API key：

```bash
docker exec postgres psql -U hydra -d hydra_pay \
  -c "INSERT INTO apps (name, api_key) VALUES ('dev-app', 'your-api-key')"
```

**Q: wall-service 端口被占用？**
A: 检查 `lsof -i :8080`，如果被其他进程占用，设置 `SERVER_PORT=8083` 使用其他端口（同时需要更新 pay-service 的 `WALL_WEBHOOK_URL`）。
