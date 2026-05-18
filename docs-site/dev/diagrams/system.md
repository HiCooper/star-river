---
title: 系统架构
description: Hydra 支付基础设施系统架构图
---

# Hydra 系统架构

本文档描述 Hydra 支付基础设施的整体系统架构。

## 架构总览

```mermaid
graph TB
    subgraph Client["客户端"]
        iOS[iOS SDK]
        Android[Android SDK]
        Web[Web SDK]
        Flutter[Flutter SDK]
    end

    subgraph Wall["Hydra-Wall"]
        WallFE[Wall 前端]
        WallBE[Wall 后端]
        WallDB[(wall_db)]
        RedisW[(Redis)]
    end

    subgraph Pay["Hydra-Pay"]
        PayFE[Pay 前端]
        PayBE[Pay 后端]
        PayDB[(pay_db)]
        RedisP[(Redis)]
    end

    subgraph Channels["支付渠道"]
        Alipay[支付宝]
        WeChat[微信支付]
        Stripe[Stripe]
        AppleIAP[Apple IAP]
        Google[Google Billing]
    end

    Client --> WallFE
    Client --> PayFE
    WallFE --> WallBE
    WallBE --> WallDB
    WallBE --> RedisW
    PayFE --> PayBE
    PayBE --> PayDB
    PayBE --> RedisP
    WallBE <--> PayBE
    PayBE --> Channels
```

## Hydra-Wall 架构

```mermaid
graph LR
    subgraph Client["客户端"]
        SDK[Wall SDK]
    end

    subgraph WallService["Hydra-Wall Service :8080"]
        API[API Gateway]
        PE[Paywall Engine]
        ES[Entitlement Service]
        TE[Targeting Engine]
        EXP[Experiment Service]
        OM[Offer Manager]
        Analytics[Analytics]
    end

    subgraph Data["数据层"]
        DB[(wall_db)]
        Cache[(Redis)]
    end

    SDK --> API
    API --> PE
    API --> ES
    API --> TE
    API --> EXP
    API --> OM
    API --> Analytics
    PE --> DB
    ES --> DB
    TE --> Cache
    EXP --> DB
    OM --> DB
```

### 核心模块

| 模块 | 职责 |
|------|------|
| Paywall Engine | 规则匹配、展示决策、模板渲染 |
| Entitlement Service | 订阅状态、权限判定、试用管理 |
| Targeting Engine | 行为触发、用户分群、条件规则 |
| Experiment Service | A/B 测试、分组分配、统计计算 |
| Offer Manager | Plans、Offers、促销规则 |
| Analytics | 收入分析、漏斗追踪、实时监控 |

## Hydra-Pay 架构

```mermaid
graph LR
    subgraph Client["客户端"]
        SDK[Pay SDK]
    end

    subgraph PayService["Hydra-Pay Service :8081"]
        API[API Gateway]
        Router[Payment Router]
        Ledger[Ledger Service]
        Webhook[Webhook Manager]
        Risk[Risk Control]
    end

    subgraph Adapters["渠道适配器"]
        AlipayA[Alipay Adapter]
        WeChatA[WeChat Adapter]
        StripeA[Stripe Adapter]
        AppleA[Apple IAP Adapter]
        GoogleA[Google Adapter]
    end

    subgraph Data["数据层"]
        DB[(pay_db)]
        Cache[(Redis)]
    end

    SDK --> API
    API --> Router
    API --> Ledger
    API --> Webhook
    API --> Risk
    Router --> Adapters
    Ledger --> DB
    Adapters --> Channels[支付渠道]
```

### 核心模块

| 模块 | 职责 |
|------|------|
| Payment Router | 智能路由、失败重试、熔断降级 |
| Ledger Service | 订单管理、交易流水、对账清算 |
| Webhook Manager | 回调处理、事件投递、重试机制 |
| Risk Control | 风控规则、反欺诈、限流 |

## 服务通信

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant WallFE as Wall 前端
    participant WallBE as Wall 后端
    participant PayBE as Pay 后端
    participant Channel as 支付渠道

    Client->>WallFE: 访问付费墙
    WallFE->>WallBE: 获取配置
    WallBE-->>WallFE: PaywallConfig

    Client->>WallFE: 选择产品
    WallFE->>WallBE: 创建支付会话
    WallBE->>PayBE: 创建订单
    PayBE-->>WallBE: paymentUrl

    WallFE->>Client: 跳转支付页
    Client->>PayBE: 完成支付
    PayBE->>Channel: 扣款
    Channel->>PayBE: 支付成功

    PayBE->>WallBE: 通知
    WallBE->>WallBE: 更新权限
```

## SDK 支持

| 平台 | SDK | 语言 |
|------|-----|------|
| iOS | Hydra-Wall / Hydra-Pay | Swift |
| Android | Hydra-Wall / Hydra-Pay | Kotlin |
| Web | Hydra-Wall / Hydra-Pay | TypeScript |
| Flutter | Hydra-Wall / Hydra-Pay | Dart |

## 支付渠道

| 渠道 | 类型 | 适用场景 |
|------|------|----------|
| 支付宝 | 跳转类 | 中国区 |
| 微信支付 | 跳转类 | 中国区 |
| Stripe | API 类 | 海外 |
| Apple IAP | 应用内购买 | iOS 订阅 |
| Google Billing | 应用内购买 | Android 订阅 |
