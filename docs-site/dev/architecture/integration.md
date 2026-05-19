# Hydra-Wall 与 Hydra-Pay 集成架构

## 1. 服务定位

| 服务 | 定位 | 核心职责 | 参考对象 |
|------|------|----------|----------|
| hydra-wall | 付费墙服务 | 付费墙渲染、用户权限管理、A/B实验、行为定向 | Superwall |
| hydra-pay | 支付网关服务 | 支付路由、渠道适配、账务管理、风控 | Stripe |

## 2. 集成架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                客户端层                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│   │   iOS SDK   │  │ Android SDK │  │   Web SDK   │  │  Flutter/Unity SDK  │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
         ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
         │  Full Hosted Mode │ │  Embedded SDK   │ │   Hybrid Mode    │
         │   (托管模式)       │ │   (嵌入模式)      │ │   (混合模式)      │
         └──────────────────┘ └──────────────────┘ └──────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
         ┌──────────────────────────────┐    ┌──────────────────────────────┐
         │         Hydra API Gateway      │    │       Merchant Server        │
         │        (统一入口/路由)         │    │       (商户服务端)            │
         └──────────────────────────────┘    └──────────────────────────────┘
                    │                                       │
                    ▼                                       ▼
    ┌───────────────┴───────────────┐       ┌───────────────┴───────────────┐
    │                               │       │                               │
    ▼                               ▼       ▼                               ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│    Hydra-Wall     │     │    Hydra-Pay      │     │   Third-Party     │
│                   │     │                   │     │   Wall/Payment    │
│  ┌─────────────┐  │     │  ┌─────────────┐  │     │                   │
│  │wall-service │  │     │  │pay-service  │  │     │                   │
│  │wall-frontend│  │     │  │pay-frontend  │  │     │                   │
│  │wall-admin   │  │◄────┼──│             │  │     │                   │
│  └─────────────┘  │  webhook  └─────────────┘  │     │                   │
└───────────────────┘     ▲       └───────────────┘     └───────────────────┘
        │                  │               │
        ▼                  │               ▼
┌───────────────────┐      │       ┌───────────────────┐
│     wall_db       │      │       │      pay_db       │
│   (PostgreSQL)    │      │       │   (PostgreSQL)     │
└───────────────────┘      │       └───────────────────┘
        │                  │               │
        ▼                  │               ▼
┌───────────────────┐      │       ┌───────────────────┐
│       Redis       │      │       │       Redis       │
│ (wall-redis)      │      │       │  (pay-redis)      │
└───────────────────┘      │       └───────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ┌───────────────────┐       ┌───────────────────┐
    │   Payment         │       │   Analytics       │
    │   Channels        │       │   Pipeline        │
    │   (外部)          │       │   (Kafka/ClickHouse)│
    └───────────────────┘       └───────────────────┘
```

## 3. 服务间通信方式

```
┌─────────────────┐                        ┌─────────────────┐
│   hydra-wall    │                        │   hydra-pay     │
│                 │                        │                 │
│  ┌───────────┐  │    HTTP/REST API      │  ┌───────────┐  │
│  │Integration│ │ ◄───────────────────►  │  │  API      │  │
│  │  Layer    │  │                        │  │  Layer    │  │
│  └───────────┘  │                        │  └───────────┘  │
│       │         │                        │       │         │
│       ▼         │                        │       ▼         │
│  ┌───────────┐  │    Webhook Callback   │  ┌───────────┐  │
│  │ Entitlement│ │ ◄───────────────────►  │  │  Webhook  │  │
│  │ Service   │  │                        │  │  Manager  │  │
│  └───────────┘  │                        │  └───────────┘  │
└─────────────────┘                        └─────────────────┘
```

## 4. 核心交互场景

### 场景一: 用户点击购买 (托管模式)

```
1. 用户点击付费墙 CTA
         │
         ▼
2. Client SDK 调用 hydra-wall 获取支付页 URL
   GET /v1/wall/config?user_id=xxx&app_id=xxx&trigger=cta_click
         │
         ▼
3. hydra-wall 返回托管结算页 URL
   { checkout_url: "https://pay.hydra.com/checkout/xxx" }
         │
         ▼
4. Client SDK 重定向到结算页
         │
         ▼
5. 用户选择支付方式和渠道
         │
         ▼
6. hydra-pay 处理支付 (创建订单 → 跳转渠道 → 用户支付)
         │
         ▼
7. 渠道回调 hydra-pay
         │
         ▼
8. hydra-pay 更新订单状态 → Webhook 通知 hydra-wall
         │
         ▼
9. hydra-wall 更新用户权限
         │
         ▼
10. hydra-pay 跳转 success_url
```

### 场景二: SDK 模式购买 (不跳转托管页)

```
1. 用户点击付费墙 CTA
         │
         ▼
2. Client SDK 调用 hydra-wall 获取商品列表
   GET /v1/wall/plans?app_id=xxx
         │
         ▼
3. hydra-wall 返回商品配置 (不包含价格)
         │
         ▼
4. Client SDK 展示商品列表，用户选择
         │
         ▼
5. Client SDK 调用 hydra-pay 创建支付
   POST /v1/pay/orders (通过 hydra-wall 代理或直接)
         │
         ▼
6. hydra-pay 返回支付信息
         │
         ▼
7. Client SDK 唤起支付渠道 (如 Stripe Card)
         │
         ▼
8. 支付完成后，hydra-pay Webhook 通知 hydra-wall
         │
         ▼
9. hydra-wall 更新用户权限
```

## 5. 共享数据模型

### 5.1 Plan (商品计划)

| 字段 | hydra-wall | hydra-pay | 说明 |
|------|-----------|-----------|------|
| id | ✅ | ✅ | 关联键 |
| app_id | ✅ | ✅ | 应用标识 |
| name | ✅ | - | 商品名称 |
| price | ✅ | ✅ | 价格 (分) |
| currency | ✅ | ✅ | 币种 |
| interval | ✅ | ✅ | 计费周期 |
| product_id | ✅ | ✅ | 渠道商品ID |

### 5.2 Order (订单)

| 字段 | hydra-wall | hydra-pay | 说明 |
|------|-----------|-----------|------|
| id | ✅ | ✅ | 订单ID |
| app_id | ✅ | ✅ | 应用标识 |
| user_id | ✅ | ✅ | 用户标识 |
| plan_id | ✅ | ✅ | 商品计划 |
| amount | - | ✅ | 支付金额 |
| channel | - | ✅ | 支付渠道 |
| status | ✅ | ✅ | 订单状态 |
| paywall_session_id | ✅ | ✅ | 付费墙会话 |

### 5.3 Webhook 通知格式

```json
{
  "event": "payment.completed",
  "order_id": "pay_abc123",
  "app_id": "app_xxx",
  "user_id": "user_yyy",
  "plan_id": "plan_monthly",
  "amount": 9900,
  "currency": "CNY",
  "channel": "stripe",
  "status": "paid",
  "paid_at": "2024-12-18T14:30:00Z",
  "signature": "hmac_sha256_xxx"
}
```

## 6. 服务间 API

### hydra-wall 调用 hydra-pay

```go
// 创建支付 (内部 API)
POST /internal/v1/orders
{
  "app_id": "app_xxx",
  "user_id": "user_yyy",
  "plan_id": "plan_monthly",
  "amount": 9900,
  "currency": "CNY",
  "channel": "stripe",
  "paywall_session_id": "session_zzz",
  "return_url": "https://wall.hydra.com/success",
  "notify_url": "https://wall.hydra.com/internal/webhook/payment"
}
```

### hydra-pay 回调 hydra-wall

```go
// Webhook 通知支付结果 (内部 API)
POST /internal/v1/webhooks/payment
{
  "event": "payment.completed",
  "order_id": "pay_abc123",
  "app_id": "app_xxx",
  "user_id": "user_yyy",
  "plan_id": "plan_monthly",
  "amount": 9900,
  "channel": "stripe",
  "paid_at": "2024-12-18T14:30:00Z",
  "signature": "hmac_sha256_xxx"
}
```
