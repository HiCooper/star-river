# 整体架构

## 系统概览

Hydra 支付基础设施由两个独立服务组成：

| 服务 | 代码仓库 | 端口 | 数据库 |
|------|----------|------|--------|
| Hydra-Wall | hydra-wall | 8080 | wall_db |
| Hydra-Pay | hydra-pay | 8081 | pay_db |

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          客户端 SDK                                     │
│   iOS SDK  ·  Android SDK  ·  Web SDK  ·  Flutter SDK  ·  Unity SDK    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   Full Hosted      │           │   Embedded SDK    │
        │   (托管模式)        │           │   (嵌入模式)       │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                    Hydra API Gateway                          │
        └─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   Hydra-Wall      │           │   Hydra-Pay       │
        │                   │           │                   │
        │  wall-frontend    │           │  pay-frontend     │
        │  wall-service     │           │  pay-service      │
        │  wall-admin       │           │  payment-router  │
        │                   │           │  channel-adapters│
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   wall_db        │           │   pay_db         │
        │   PostgreSQL     │           │   PostgreSQL     │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   Redis          │           │   Redis           │
        └───────────────────┘           └───────────────────┘
```

## 服务独立性

Hydra-Wall 和 Hydra-Pay 是两个完全独立的服务：

### 代码独立

- `hydra-wall` 仓库：付费墙服务
- `hydra-pay` 仓库：支付网关服务

### 数据库独立

- `wall_db`：存储付费墙配置、用户权限、实验数据
- `pay_db`：存储订单、交易流水、渠道配置

### 部署独立

- 可单独部署其中一个服务
- 可使用不同的扩缩容策略
- 可独立更新版本

### 通信方式

服务间通过 HTTP/gRPC API 通信：

```
Hydra-Wall ──────► Hydra-Pay
    │                  │
    │ POST /v1/payments/create
    │ GET /v1/payments/:id/status
    │ POST /v1/refunds
    │                  │
    └──────────────────┘
       Webhook 回调通知
```

## 核心交互流程

### 1. 付费流程

```
用户点击付费入口
    │
    ▼
Hydra-Wall 评估付费墙配置
    │
    ▼
跳转 Hydra-Wall 托管页
    │
    ▼
用户选择 Plan 点击购买
    │
    ▼
调用 Hydra-Pay 创建支付
    │
    ▼
跳转 Hydra-Pay 托管结算页
    │
    ▼
用户选择渠道完成支付
    │
    ▼
Webhook 回调更新状态
    │
    ▼
跳转 success_url
```

### 2. 权限检查流程

```
客户端调用 SDK
    │
    ▼
检查本地缓存
    │
    ├─ 命中 ──► 返回权限状态
    │
    └─ 未命中 ──► 请求 Wall Service
                      │
                      ├─ Redis 命中 ──► 返回
                      │
                      └─ 未命中 ──► 查询 wall_db
                                    │
                                    ▼
                              更新缓存
                                    │
                                    ▼
                              返回权限状态
```

## 下一步

- [服务独立部署](/dev/architecture/independence)
- [数据模型](/dev/architecture/data-model)
- [Hydra-Wall 架构](/dev/wall/service-architecture)
- [Hydra-Pay 架构](/dev/pay/service-architecture)
