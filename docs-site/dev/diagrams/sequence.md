---
title: 核心时序图
description: Hydra 核心交互时序图
---

# Hydra 核心交互时序图

本文档包含 Hydra 支付基础设施的核心交互时序图，包含购买流程、权限检查、支付回调和 WebView 渲染架构。

## 目录

- [流程一：完整购买流程](#流程一完整购买流程)
- [流程二：权限检查流程](#流程二权限检查流程)
- [流程三：支付路由与渠道回调](#流程三支付路由与渠道回调)
- [流程四：客户端付费墙加载流程（WebView 渲染）](#流程四客户端付费墙加载流程webview-渲染)
- [Hydra-Wall 核心架构](#hydra-wall-核心架构)


## 流程一：完整购买流程

**描述**：从用户点击付费入口到购买完成的完整时序

```mermaid
sequenceDiagram
    autonumber
    participant Client as 客户端 App
    participant WallSDK as HydraWall SDK
    participant WallFE as Wall 托管前端
    participant WallSvc as Wall Service
    participant PaySvc as Pay Service
    participant PayFE as Pay 托管前端
    participant Channel as 支付渠道
    participant WallDB as wall_db
    participant PayDB as pay_db

    Client->>WallSDK: 用户点击付费入口
    WallSDK->>WallSvc: POST /v1/evaluate<br/>{userId, trigger, userTraits}
    
    alt 首次评估
        WallSvc->>WallSvc: TargetingEngine.Evaluate()
        WallSvc->>WallSvc: ExperimentService.Assign()
    end
    
    WallSvc-->>WallSDK: PaywallConfig<br/>{template, plans, theme}
    Client->>WallSDK: redirectToPaywall(sessionId)
    
    Note over WallFE: 重定向到托管付费墙页面
    Client->>WallFE: GET /paywall/{appId}?session=xxx
    
    WallFE->>WallSvc: 获取付费墙详情
    WallSvc-->>WallFE: 渲染配置
    WallFE-->>Client: 显示付费墙 UI
    
    Client->>WallFE: 用户选择 Plan 并点击购买
    
    Note over WallFE: 调用 Hydra-Pay 创建支付
    WallFE->>WallSvc: 创建支付会话
    WallSvc->>PaySvc: POST /v1/payments/create<br/>{amount, channel, productId}
    
    PaySvc->>PaySvc: Router.Route()
    PaySvc->>PayDB: 创建订单记录
    PaySvc-->>WallSvc: paymentUrl<br/>{paymentId, paymentUrl}
    
    WallSvc-->>WallFE: redirectToCheckout(paymentUrl)
    
    Note over PayFE: 重定向到支付托管页面
    Client->>PayFE: GET /checkout/{paymentId}
    
    PayFE->>PaySvc: 获取支付信息
    PaySvc-->>PayFE: CheckoutConfig
    PayFE-->>Client: 显示支付选项
    
    Client->>PayFE: 选择支付渠道
    PayFE->>PaySvc: 发起支付
    PaySvc->>Channel: 渠道扣款请求
    
    alt 支付成功
        Channel-->>PaySvc: 支付成功回调
        PaySvc->>PayDB: 更新订单状态: paid
        PaySvc->>PaySvc: WebhookManager.Dispatch()
        
        Note over PaySvc: 通知 Hydra-Wall
        PaySvc->>WallSvc: POST /internal/v1/webhooks/payment<br/>payment.completed
        WallSvc->>WallDB: 创建/更新 Entitlement
        WallSvc-->>PaySvc: ACK
        
        PayFE-->>Client: redirect(successUrl)
        
        Note over Client: 购买完成，可访问 Premium
    else 支付失败
        Channel-->>PaySvc: 支付失败回调
        PaySvc->>PayDB: 更新订单状态: failed
        PayFE-->>Client: redirect(cancelUrl)
    end
```

### 流程概览

<div class="flow-summary">
  <div class="flow-card">
    <div class="flow-card-header">
      <div class="flow-number">1</div>
      <span>完整购买流程</span>
    </div>
    <div class="flow-card-body">
      <div class="flow-step">Client -> WallSDK (触发评估)</div>
      <div class="flow-step">-> Wall Service (规则匹配)</div>
      <div class="flow-step">-> Pay Service (创建支付)</div>
      <div class="flow-step">-> Channel (渠道扣款)</div>
      <div class="flow-step">-> Webhook (回调通知)</div>
      <div class="flow-step">-> Entitlement (更新权限)</div>
    </div>
  </div>
</div>

---

## 流程二：权限检查流程

**描述**：客户端检查用户是否有权限访问 Premium 功能

```mermaid
sequenceDiagram
    autonumber
    participant Client as 客户端 App
    participant WallSDK as HydraWall SDK
    participant WallSvc as Wall Service
    participant Redis as Redis Cache
    participant WallDB as wall_db

    Client->>WallSDK: checkEntitlement({feature})
    
    Note over WallSDK: SDK 内部优先检查本地缓存
    alt 本地缓存命中
        WallSDK-->>Client: 返回本地缓存的权限状态
    else 本地缓存未命中
        WallSDK->>WallSvc: POST /v1/entitlements/check<br/>{userId, appId, feature}
        
        alt Redis 缓存命中
            WallSvc->>Redis: GET wall:entitlement:{appId}:{userId}
            Redis-->>WallSvc: EntitlementStatus JSON
            
            Note over WallSvc: 缓存命中，直接返回
            WallSvc-->>WallSDK: EntitlementStatus
        else Redis 缓存未命中
            WallSvc->>WallDB: 查询 entitlements 表
            WallDB-->>WallSvc: entitlement 记录
            
            alt 存在有效 entitlement
                WallSvc->>WallSvc: 检查是否过期
                WallSvc->>Redis: SET wall:entitlement:{appId}:{userId}<br/>TTL: 5min
                WallSvc-->>WallSDK: EntitlementStatus<br/>{hasAccess: true, ...}
            else 不存在或已过期
                WallSvc->>WallDB: 查询 subscriptions 表<br/>检查自动续费状态
                
                alt 订阅在宽限期内 (Grace Period)
                    WallSvc-->>WallSDK: EntitlementStatus<br/>{hasAccess: true, gracePeriod: true}
                else 订阅已过期
                    WallSvc-->>WallSDK: EntitlementStatus<br/>{hasAccess: false, reason: expired}
                else 无订阅记录
                    WallSvc-->>WallSDK: EntitlementStatus<br/>{hasAccess: false, reason: no_subscription}
                end
            end
        end
        
        WallSDK->>WallSDK: 更新本地缓存
    end
    
    WallSDK-->>Client: 返回权限状态
    
    alt hasAccess = true
        Client->>Client: 显示 Premium 功能
    else hasAccess = false
        alt trialAvailable = true
            Client->>Client: 显示免费试用入口
        else
            Client->>WallSDK: redirectToPaywall()
            Note over Client: 引导用户购买
        end
    end
```

### 流程概览

<div class="flow-summary">
  <div class="flow-card">
    <div class="flow-card-header">
      <div class="flow-number">2</div>
      <span>权限检查流程</span>
    </div>
    <div class="flow-card-body">
      <div class="flow-step">Client -> SDK (发起检查)</div>
      <div class="flow-step">-> Redis Cache (缓存查询)</div>
      <div class="flow-step">-> DB (未命中时)</div>
      <div class="flow-step">-> 返回权限状态</div>
    </div>
  </div>
</div>

---

## 流程三：支付路由与渠道回调

**描述**：Hydra-Pay 如何选择支付渠道并处理异步回调

```mermaid
sequenceDiagram
    autonumber
    participant WallSvc as Wall Service
    participant PaySvc as Pay Service
    participant Router as Payment Router
    participant Adapter as Channel Adapter
    participant Channel as 支付渠道 API
    participant Ledger as Ledger Service
    participant WebhookMgr as Webhook Manager
    participant PayDB as pay_db
    participant Circuit as Circuit Breaker

    Note over PaySvc: 支付创建阶段
    WallSvc->>PaySvc: POST /v1/payments/create<br/>{amount, currency, channel, productId}
    PaySvc->>Ledger: CreateOrder()<br/>创建订单记录 (status: pending)
    Ledger->>PayDB: INSERT orders
    PayDB-->>Ledger: orderId
    
    PaySvc->>Router: Route(paymentRequest)
    
    alt 使用指定渠道
        Router->>Router: 使用请求中的 channel
    else 智能路由选择
        Router->>Router: 检查渠道可用性
        Router->>Circuit: isChannelHealthy(channel)
        
        alt 渠道熔断中
            Circuit-->>Router: channel unavailable
            Router->>Router: 选择 fallback 渠道
            Router->>Circuit: 再次检查
        end
        
        Router->>Router: 根据配置规则排序
        Note over Router: 规则: 地区/金额/设备/成功率
    end
    
    Router-->>PaySvc: selectedChannel
    PaySvc->>Adapter: GetAdapter(channel)
    
    Adapter->>Adapter: BuildRequest()
    
    Note over Adapter: 适配器模式 - 各渠道独立实现
    alt 渠道类型: 跳转类 (Alipay/WeChat)
        Adapter-->>PaySvc: paymentUrl / qrCode
        PaySvc-->>WallSvc: {paymentUrl, paymentId}
    else 渠道类型: API 类 (Stripe)
        Adapter->>Channel: 创建支付 Intent
        Channel-->>Adapter: clientSecret
        Adapter-->>PaySvc: {clientSecret, paymentId}
        PaySvc-->>WallSvc: {clientSecret, paymentId}
    else 渠道类型: IAP (Apple/Google)
        Adapter-->>PaySvc: receiptData
        PaySvc-->>WallSvc: {receiptData, paymentId}
    end
    
    Note over PaySvc: 等待用户完成支付
    
    alt 跳转类渠道回调
        Channel->>PaySvc: 异步 Webhook 回调
        PaySvc->>Adapter: VerifySignature()
        Adapter-->>PaySvc: signature valid
    else SDK 轮询
        WallSvc->>PaySvc: GET /v1/payments/{paymentId}
        PaySvc->>Adapter: GetPaymentStatus()
        Adapter->>Channel: 查询状态
        Channel-->>Adapter: paymentStatus
        Adapter-->>PaySvc: status
        PaySvc-->>WallSvc: paymentStatus
    end
    
    Note over PaySvc: 处理支付结果
    alt 支付成功
        Adapter-->>PaySvc: payment.paid
        PaySvc->>Ledger: UpdateOrderStatus(orderId, paid)
        Ledger->>PayDB: UPDATE orders SET status='paid'
        PaySvc->>WebhookMgr: Dispatch(event)
        
        WebhookMgr->>WallSvc: POST /internal/v1/webhooks/payment<br/>{event: payment.completed}
        WallSvc-->>WebhookMgr: ACK
        
        Note over WallSvc: 更新用户 entitlement
        WallSvc->>WallSvc: EntitlementService.Grant()
    else 支付失败
        Adapter-->>PaySvc: payment.failed
        PaySvc->>Ledger: UpdateOrderStatus(orderId, failed)
        Ledger->>PayDB: UPDATE orders SET status='failed'
    end
    
    Note over PaySvc: 退款流程 (单独触发)
    WallSvc->>PaySvc: POST /v1/payments/{paymentId}/refund<br/>{amount, reason}
    PaySvc->>Adapter: Refund()
    Adapter->>Channel: 申请退款
    Channel-->>Adapter: refundId
    PaySvc->>Ledger: RecordRefund()
    Ledger->>PayDB: INSERT refunds
    PaySvc-->>WallSvc: refundId
```

### 流程概览

<div class="flow-summary">
  <div class="flow-card">
    <div class="flow-card-header">
      <div class="flow-number">3</div>
      <span>支付路由与回调</span>
    </div>
    <div class="flow-card-body">
      <div class="flow-step">Router (智能路由)</div>
      <div class="flow-step">-> Adapter (渠道适配)</div>
      <div class="flow-step">-> Channel API (渠道扣款)</div>
      <div class="flow-step">-> Ledger (记账)</div>
    </div>
  </div>
</div>

<style>
.flow-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 32px;
}

.flow-card {
  border: 1px solid #cbd5e1;
  padding: 16px;
}

.flow-card-header {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-number {
  background: #0f172a;
  color: white;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.flow-card-body {
  font-size: 11px;
  color: #64748b;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
</style>

---

## 流程四：客户端付费墙加载流程（WebView 渲染）

**描述**：客户端 App 通过 WebView 加载 Hydra-Wall 托管的付费墙页面，前端调用后端 API 获取配置数据进行渲染

```mermaid
sequenceDiagram
    autonumber
    participant App as 客户端 App
    participant SDK as Hydra-Wall SDK
    participant WV as WebView
    participant Frontend as Hydra-Wall 前端
    participant Backend as Hydra-Wall 后端

    Note over App: 客户端触发付费墙展示
    App->>SDK: register(placement)

    SDK->>SDK: evaluate() → paywallId
    SDK-->>App: 返回付费墙 ID

    App->>App: 创建 WebView 实例

    App->>WV: 加载付费墙页面
    WV->>Frontend: GET /paywall/{paywallId}

    Note over Frontend: 首次请求，加载 HTML 模板
    Frontend-->>WV: 返回 HTML/CSS/JS Bundle

    Note over WV: WebView 解析 HTML 并加载前端资源

    WV->>Backend: 获取付费墙配置
    WV->>Backend: GET /api/v1/paywalls/{paywallId}/config

    Backend->>Backend: 查找付费墙配置
    Backend-->>WV: PaywallConfig JSON<br/>{template, products, theme, rules}

    Note over WV: 前端 JS 根据配置渲染付费墙 UI
    WV->>WV: 渲染产品列表、定价、订阅按钮

    Note over WV: 用户看到完整的付费墙页面
    Note over WV: 可以浏览产品、选择订阅计划

    WV->>Frontend: 用户选择产品并点击订阅
    Frontend->>Backend: 创建支付会话
    Backend-->>Frontend: paymentUrl

    WV->>WV: 跳转至支付页面
```

### WebView 渲染的优势

| 优势 | 说明 |
|------|------|
| **跨平台一致** | 同一 HTML/CSS 在 iOS/Android/Web 渲染完全一致 |
| **热更新** | 付费墙样式和逻辑可随时修改，无需 App 更新 |
| **快速迭代** | 运营人员可通过后台修改付费墙配置 |
| **CDN 加速** | 前端资源从 CDN 加载，全球快速访问 |

### 前端与后端分工

```mermaid
sequenceDiagram
    participant WV as WebView
    participant Frontend as Hydra-Wall 前端
    participant Backend as Hydra-Wall 后端

    Note over Frontend: 职责：渲染 UI、处理交互
    WV->>Frontend: 加载 HTML/CSS/JS
    Frontend-->>WV: 返回静态资源

    Note over Frontend: 前端调用后端 API 获取数据
    WV->>Backend: GET /api/v1/paywalls/{id}/config
    WV->>Backend: GET /api/v1/products
    WV->>Backend: GET /api/v1/subscriptions/{userId}/status

    Note over Backend: 职责：提供配置数据、业务逻辑
    Backend-->>WV: PaywallConfig, Products, SubscriptionStatus
```

| 组件 | 职责 |
|------|------|
| **前端 (Static Resources)** | HTML/CSS/JS Bundle，提供 UI 渲染和用户交互 |
| **后端 (API Service)** | 提供付费墙配置、产品数据、用户订阅状态 |

---

## Hydra-Wall 核心架构

### 系统架构图

```
客户端 App
    │
    ├── iOS SDK
    ├── Android SDK
    └── Web SDK
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│                    Hydra-Wall SDK                       │
│  • 本地缓存 Campaign 配置                               │
│  • 设备端规则评估                                        │
│  • 调用后端 API 获取付费墙配置                           │
└─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│               Hydra-Wall 前端 (静态资源)                │
│  • HTML/CSS/JS Bundle                                   │
│  • 调用后端 API 获取产品、定价、主题                     │
│  • CDN 加速全球访问                                      │
└─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│               Hydra-Wall 后端服务                       │
│  • PaywallConfig API                                    │
│  • 产品、定价、主题配置                                  │
│  • Entitlement 管理                                      │
│  • Targeting Engine                                     │
│  • Experiment Service                                   │
└─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│               数据存储层                                 │
│  • wall_db (PostgreSQL) - 付费墙配置、用户权限          │
│  • Redis Cache - 配置缓存加速                           │
└─────────────────────────────────────────────────────────┘
```

### 渲染流程时序

```mermaid
sequenceDiagram
    participant App as 客户端 App
    participant SDK as Hydra-Wall SDK
    participant WV as WebView
    participant FE as Hydra-Wall 前端
    participant BE as Hydra-Wall 后端

    App->>SDK: register(placement)
    SDK->>SDK: 本地评估规则
    SDK-->>App: paywallId

    App->>WV: loadUrl(/paywall/{paywallId})
    WV->>FE: GET /paywall/{paywallId}
    FE-->>WV: HTML/CSS/JS

    WV->>BE: GET /api/v1/paywalls/{id}/config
    BE-->>WV: PaywallConfig

    WV->>BE: GET /api/v1/products
    BE-->>WV: Products List

    WV->>WV: 渲染付费墙 UI
```


