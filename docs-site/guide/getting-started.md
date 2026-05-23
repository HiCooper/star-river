# 快速开始

本指南帮助你从零启动 Hydra 系统的全部服务，跑通「付费墙评估 → 支付创建 → 回调通知」的完整链路。

## 架构概览

```
┌─────────────────┐     ┌─────────────────┐
│   wall-admin    │────▶│   wall-service   │──▶ PostgreSQL
│  (Next.js :3000)│     │   (:8080)        │──▶ Redis
└─────────────────┘     └────────┬─────────┘
                                 │ webhook
                        ┌────────▼─────────┐
                        │   pay-service    │──▶ PostgreSQL
                        │   (:8082)        │
                        └──────────────────┘
```

| 服务 | 端口 | 说明 |
|------|------|------|
| wall-service | 8080 | 付费墙评估引擎 + 管理后台 API |
| pay-service | 8082 | 统一支付网关 |
| wall-admin | 3000 | 前端管理面板（可选） |
| PostgreSQL | 5432 | 数据存储（两个服务各用独立 database） |
| Redis | 6379 | 缓存 / 事件缓冲 |

## 第一步：启动共享中间件

中间件（PostgreSQL + Redis）使用项目根目录下的 `docker-compose.infra.yml` 定义，所有服务共享。

```bash
cd /Users/xueancao/Projects/QoderProjects/star-river

docker compose -f docker-compose.infra.yml up -d
```

验证：

```bash
docker ps --filter "name=postgres" --filter "name=redis" --format "table {{.Names}}\t{{.Status}}"
```

预期输出：

```
NAMES      STATUS
postgres   Up (healthy)
redis      Up (healthy)
```

::: tip 数据库说明
- wall-service → `wall_db`
- pay-service → `hydra_pay`
- 两个 database 在首次启动时自动创建
- 开发环境连接方式：`localhost:5432`，用户 `hydra`，密码 `hydra_secret`
:::

## 第二步：启动 wall-service

```bash
cd hydra-wall/service
./setup.sh
```

验证：

```bash
curl http://localhost:8080/health
# → {"success":true,"data":{"service":"wall-service","status":"ok"}}
```

首次启动会自动创建数据库表（GORM AutoMigrate）。

## 第三步：启动 pay-service

```bash
cd hydra-pay/service
./setup.sh
```

验证：

```bash
curl http://localhost:8082/health
# → {"status":"ok"}
```

::: warning 端口说明
默认端口 8081 可能与本地 Java 服务冲突，开发环境统一使用 8082。
:::

## 第四步：（可选）启动管理后台

```bash
cd hydra-wall/front/wall-admin

npm install    # 首次执行
npm run dev    # → http://localhost:3000
```

## 第五步：跑通核心流程

以下通过 curl 命令演示完整链路。**请按顺序执行**，后续步骤依赖前一步返回的 ID。

### 5.1 登录获取 Token

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

默认账号：`admin` / `admin123`

记下返回的 `data.token`，后续管理员操作需要携带在 `Authorization: Bearer <token>` 头中。

### 5.2 创建 App

App 代表接入你 SDK 的客户端应用。创建后会返回 `api_key`，这是客户端调用 /evaluate 的凭证。

```bash
curl -s -X POST http://localhost:8080/api/v1/apps \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"我的应用","platform":"ios"}'
```

### 5.3 创建 Plan（订阅计划）

```bash
curl -s -X POST http://localhost:8080/api/v1/plans \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"app_id":"<APP_ID>","name":"月度会员","amount":2990,"currency":"CNY","interval":"monthly"}'
```

金额单位为**分**，`2990` 表示 ¥29.90。

### 5.4 创建 Paywall（付费墙样式）

```bash
curl -s -X POST http://localhost:8080/api/v1/paywalls \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"app_id":"<APP_ID>","name":"标准付费墙","template":"standard","config":{"title":"解锁高级功能","subtitle":"每月仅需 ¥29.90"}}'
```

### 5.5 创建触发规则

规则链由三个概念组成：**Campaign**（活动）→ **Audience**（受众条件）→ **Placement**（触发点位）。

```bash
# 5.5.1 创建 Campaign
curl -s -X POST http://localhost:8080/api/v1/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"app_id":"<APP_ID>","name":"新用户促销"}'

# 5.5.2 创建 Audience（条件：国家=中国）
curl -s -X POST http://localhost:8080/api/v1/campaigns/<CAMPAIGN_ID>/audiences \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"中国用户","conditions":{"logic":"AND","conditions":[{"field":"country","operator":"equals","value":"CN"}]}}'

# 5.5.3 将 Paywall 绑定到 Audience
curl -s -X POST http://localhost:8080/api/v1/audiences/<AUDIENCE_ID>/paywalls \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"paywall_id":"<PAYWALL_ID>","percentage":100}'

# 5.5.4 创建 Placement（触发点位：app_launch）
curl -s -X POST http://localhost:8080/api/v1/campaigns/<CAMPAIGN_ID>/placements \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"event_name":"app_launch"}'

# 5.5.5 激活 Campaign
curl -s -X POST http://localhost:8080/api/v1/campaigns/<CAMPAIGN_ID>/activate \
  -H "Authorization: Bearer $TOKEN"
```

### 5.6 客户端 Evaluate（判断是否展示付费墙）

这是你的 iOS/Android/Web App 在运行时调用的核心接口。

```bash
curl -s -X POST http://localhost:8080/api/v1/evaluate \
  -H "X-API-Key: <API_KEY>" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"user-001","placement":"app_launch","attributes":{"country":"CN"}}'
```

响应示例：

```json
// 匹配成功 → 展示付费墙
{
  "success": true,
  "data": {
    "action": "show_paywall",
    "paywall": {
      "id": "6ceca2fc-...",
      "name": "标准付费墙",
      "template": "standard",
      "config": { "title": "解锁高级功能" },
      "feature_gating": "gated"
    }
  }
}

// 未匹配 → 放行功能
{
  "success": true,
  "data": {
    "action": "execute_feature"
  }
}
```

### 5.7 创建支付

用户看完付费墙并点击订阅后，客户端调用 pay-service 创建支付订单。

> 首次使用需在 pay 数据库中注册 API Key：
> ```bash
> docker exec postgres psql -U hydra -d hydra_pay \
>   -c "INSERT INTO apps (name, api_key) VALUES ('my-app', '<API_KEY>')"
> ```

```bash
curl -s -X POST http://localhost:8082/v1/payments/create \
  -H "X-API-Key: <API_KEY>" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"user-001","plan_id":"<PLAN_ID>","amount":2990,"currency":"CNY","channel":"alipay","description":"月度会员"}'
```

响应中包含 `payment_url` 和 `qr_code_url`，客户端引导用户完成付款。

### 5.8 支付回调

支付渠道（支付宝/微信）异步通知支付结果：

```bash
curl -s -X POST http://localhost:8082/v1/payments/callback/alipay \
  -H 'Content-Type: application/json' \
  -d '{"payment_id":"<PAYMENT_ID>","channel_tx_id":"TX_001","status":"TRADE_SUCCESS","amount":2990}'
```

Pay 服务更新订单状态后，会自动通过 webhook 通知 Wall 服务，触发权益开通。

### 5.9 查询支付状态

```bash
curl -s "http://localhost:8082/v1/payments/<PAYMENT_ID>" \
  -H "X-API-Key: <API_KEY>"
```

## 环境变量参考

| 变量 | wall-service 默认值 | pay-service 默认值 |
|------|-------------------|-------------------|
| `SERVER_PORT` | 8080 | - |
| `PORT` | - | 8081 |
| `SERVER_MODE` / `GIN_MODE` | debug | debug |
| `DATABASE_URL` | `postgres://hydra:hydra_secret@localhost:5432/wall_db?sslmode=disable` | `postgres://hydra:hydra_secret@localhost:5432/hydra_pay?sslmode=disable` |
| `REDIS_URL` | `redis://localhost:6379/0` | - |
| `JWT_SECRET` | dev-jwt-secret-... | - |
| `ADMIN_USERNAME` | admin | - |
| `ADMIN_PASSWORD` | admin123 | - |
| `WALL_WEBHOOK_URL` | - | `http://localhost:8080/api/v1/webhooks/payment` |

::: warning 生产环境
`GIN_MODE=release` 时，`JWT_SECRET` 和 `ADMIN_PASSWORD` 不能使用默认值，服务会拒绝启动。
:::

## 下一步

- [Hydra-Wall 产品介绍](/guide/wall/introduction)
- [Hydra-Pay 支付渠道](/guide/pay/channels)
- [开发环境详细配置](/dev/deployment/dev-env)
- [整体架构](/dev/architecture/)
