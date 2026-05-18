# 服务架构

Hydra-Pay 是统一的支付网关服务，负责聚合多个支付渠道，提供统一的支付接口和支付路由能力。

## 系统架构图

```mermaid
flowchart TB
    subgraph Merchant["商户系统"]
        APP[应用服务]
    end

    subgraph PayService["hydra-pay 服务"]
        direction TB
        PR[Payment Router<br/>支付路由]
        CA[Channel Adapters<br/>渠道适配器]
        LS[Ledger Service<br/>账务服务]
        WM[Webhook Manager<br/>回调管理]
        RC[Risk Control<br/>风控服务]
    end

    subgraph Channels["支付渠道"]
        direction LR
        AP[Alipay]
        WP[WeChat Pay]
        ST[Stripe]
        APY[Apple IAP]
        GP[Google Billing]
    end

    subgraph Storage["存储层"]
        direction LR
        DB[(pay_db<br/>PostgreSQL)]
        RD[(Redis<br/>Cluster)]
    end

    subgraph External["外部依赖"]
        WA[hydra-wall]
    end

    APP --> PR
    PR --> CA
    PR --> WM
    PR --> LS
    CA --> RC

    CA --> AP
    CA --> WP
    CA --> ST
    CA --> APY
    CA --> GP

    PR --> RD
    WM --> DB
    LS --> DB

    WM -.->|支付成功通知| WA

    classDef service fill:#e8f5e9,stroke:#2e7d32
    classDef storage fill:#f3e5f5,stroke:#4a148c
    classDef channel fill:#fff8e1,stroke:#f57c00

    class PR,CA,LS,WM,RC service
    class DB,RD storage
    class AP,WP,ST,APY,GP channel
```

## 核心模块

### Payment Router

支付路由是系统的核心，负责将支付请求路由到合适的渠道。

- 接收来自商户的支付请求
- 根据渠道可用性、价格、成功率等因素选择最优渠道
- 支持渠道降级和故障转移

### Channel Adapters

渠道适配器是对接各个支付渠道的插件模块。

- 统一抽象接口，屏蔽各渠道差异
- 支持插件化扩展新渠道
- 包含 Alipay、WeChat Pay、Stripe、Apple IAP、Google Billing 等

### Ledger Service

账务服务，负责记账和资金流水管理。

- 记录每一笔交易流水
- 支持多币种结算
- 提供对账和清结算功能

### Webhook Manager

回调管理服务。

- 接收各渠道的异步回调
- 统一处理回调解析和签名验证
- 支持回调重试和死信队列

### Risk Control

风控服务。

- 交易风险识别
- 欺诈检测
- 限频限流

## 核心交互时序图

### 支付下单流程

```mermaid
sequenceDiagram
    participant Merchant as 商户系统
    participant Router as Payment Router
    participant Redis as Redis
    participant Adapter as Channel Adapter
    participant Channel as 支付渠道
    participant Ledger as Ledger Service
    participant DB as pay_db

    Merchant->>Router: 创建支付订单 (amount, channel)
    Router->>Router: 选择最优渠道

    Router->>DB: 创建订单记录 (pending)
    DB-->>Router: order_id

    Router->>Adapter: 调用渠道支付接口
    Adapter->>Channel: 发起支付请求

    Channel-->>Adapter: 返回支付跳转信息
    Adapter-->>Router: 返回 pay_url

    Router->>Redis: 更新订单状态缓存
    Router-->>Merchant: 返回 pay_url

    Note over Router,Channel: 用户在支付渠道完成支付
```

### 支付回调处理流程

```mermaid
sequenceDiagram
    participant Channel as 支付渠道
    participant Webhook as Webhook Manager
    participant Adapter as Channel Adapter
    participant Router as Payment Router
    participant Ledger as Ledger Service
    participant Wall as hydra-wall
    participant DB as pay_db

    Channel->>Webhook: 发送异步回调通知
    Webhook->>Webhook: 记录原始日志

    Webhook->>Adapter: 解析并验证签名
    Adapter-->>Webhook: 解析结果

    Webhook->>Router: 查询订单信息
    Router->>DB: 查询订单
    DB-->>Router: order_details
    Router-->>Webhook: order_info

    Webhook->>DB: 更新订单状态 (paid)
    Webhook->>Ledger: 记录账务流水

    Ledger->>DB: 写入流水记录
    DB-->>Ledger: confirm

    Webhook->>Wall: 通知支付成功 (webhook)
    Wall->>Wall: 更新用户权限

    Webhook-->>Channel: 返回确认
```

### 渠道熔断降级流程

```mermaid
sequenceDiagram
    participant Router as Payment Router
    participant CB as Circuit Breaker
    participant Adapter as Channel Adapter
    participant Channel as 支付渠道
    participant Redis as Redis

    Router->>CB: 发起支付请求
    CB->>CB: 检查渠道状态

    alt 渠道正常
        CB->>Adapter: 调用渠道
        Adapter->>Channel: 发起支付

        alt 支付成功
            Channel-->>Adapter: 返回成功
            Adapter-->>CB: payment_response
            CB-->>Router: 成功
            CB->>Redis: 更新渠道健康度
        else 渠道失败
            Channel-->>Adapter: 返回错误
            Adapter-->>CB: error
            CB->>CB: 错误计数 +1
            CB->>Redis: 记录失败

            CB->>Router: 返回错误
            Router->>CB: 尝试备用渠道
        end
    else 渠道熔断中
        CB-->>Router: 渠道熔断，跳过
        Router->>CB: 尝试下一渠道
    end
```

## 存储架构

| 存储 | 用途 |
|------|------|
| PostgreSQL (pay_db) | 持久化存储：订单、流水、渠道配置 |
| Redis | 热点数据缓存、队列、分布式锁 |

## 性能目标

- P99 响应时间: < 200ms（不含渠道耗时）
- 可用性: 99.95%
- 支持 QPS: 5,000+
