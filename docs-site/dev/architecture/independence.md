# 服务独立部署

## 设计原则

Hydra-Wall 和 Hydra-Pay 采用独立部署架构，遵循以下原则：

1. **代码独立** - 两个独立 Git 仓库
2. **数据库独立** - 各自独立的 PostgreSQL 实例
3. **服务独立** - 可单独扩缩容和发布
4. **通信解耦** - 通过 API 接口通信

## 对比

| 维度 | Hydra-Wall | Hydra-Pay |
|------|-------------|-----------|
| 代码仓库 | hydra-wall | hydra-pay |
| 服务端口 | 8080 | 8081 |
| 数据库 | wall_db | pay_db |
| Redis | wall-redis | pay-redis |
| 主要语言 | Go | Go |
| 主要关注 | 付费墙 UX、转化率 | 支付稳定性、资金安全 |

## 代码结构

### hydra-wall

```
hydra-wall/
├── wall-service/           # 后端服务 (Go)
├── wall-frontend/          # 托管前端 (React)
├── wall-admin/             # 开发者后台 (React)
├── wall-sdk/               # 客户端 SDK
│   ├── ios/
│   ├── android/
│   ├── web/
│   └── flutter/
└── docker/
```

### hydra-pay

```
hydra-pay/
├── pay-service/            # 后端服务 (Go)
├── pay-frontend/           # 托管前端 (React)
├── pay-sdk/                # 客户端 SDK
│   ├── ios/
│   ├── android/
│   ├── web/
│   └── flutter/
└── docker/
```

## API 通信约定

### Hydra-Wall 调用 Hydra-Pay

Hydra-Wall 在用户购买时调用 Hydra-Pay 创建支付：

```go
// Hydra-Wall 内部集成层
type HydraPayClient struct {
    baseURL string
    apiKey  string
}

func (c *HydraPayClient) CreatePayment(ctx context.Context, req *CreatePaymentRequest) (*PaymentResponse, error) {
    // POST /v1/payments/create
}

func (c *HydraPayClient) GetPaymentStatus(ctx context.Context, paymentID string) (*PaymentStatus, error) {
    // GET /v1/payments/:id
}
```

### Hydra-Pay 回调 Hydra-Wall

支付完成后，Hydra-Pay 通过 Webhook 通知 Hydra-Wall：

```go
// Hydra-Pay Webhook 回调
POST /internal/v1/webhooks/payment

{
  "event": "payment.completed",
  "payment_id": "pay_xxxx",
  "channel": "alipay",
  "amount": 9900,
  "user_id": "user_xxxx",
  "plan_id": "plan_monthly"
}
```

## 部署架构

### 独立部署

```yaml
# docker-compose.wall.yml
services:
  wall-service:
    image: hydra/wall-service:latest
    ports:
      - "8080:8080"
    depends_on:
      - wall-postgres
      - wall-redis

  wall-frontend:
    image: hydra/wall-frontend:latest
    ports:
      - "3000:80"

  wall-postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=wall_db

  wall-redis:
    image: redis:7-alpine
```

```yaml
# docker-compose.pay.yml
services:
  pay-service:
    image: hydra/pay-service:latest
    ports:
      - "8081:8080"
    depends_on:
      - pay-postgres
      - pay-redis

  pay-frontend:
    image: hydra/pay-frontend:latest
    ports:
      - "3001:80"

  pay-postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pay_db

  pay-redis:
    image: redis:7-alpine
```

### 独立扩缩容

- Hydra-Wall 可根据付费墙展示次数扩缩容
- Hydra-Pay 可根据支付交易量扩缩容

## 适用场景

### 场景一：完整接入

同时使用 Hydra-Wall 和 Hydra-Pay：

```
推荐用于：快速上线付费功能，不需要自建任何 UI
```

### 场景二：仅使用支付

已有自建付费墙，只使用 Hydra-Pay：

```
Hydra-Wall ← 不使用
     │
     │ (已有自建付费墙 UI)
     │
Hydra-Pay ← 单独接入
```

### 场景三：仅使用付费墙

只使用 Hydra-Wall 的付费墙能力，使用第三方支付：

```
Hydra-Wall ← 单独使用
     │
     │ (调用 Stripe/其他支付)
     │
(不使用 Hydra-Pay)
```

## 下一步

- [数据模型](/dev/architecture/data-model)
- [Hydra-Wall 服务架构](/dev/wall/service-architecture)
- [Hydra-Pay 服务架构](/dev/pay/service-architecture)
