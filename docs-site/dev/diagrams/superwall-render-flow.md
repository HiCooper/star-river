---
title: Superwall 付费墙渲染流程
description: 同行业参考 - Superwall 付费墙渲染时序图
---

# Superwall 付费墙渲染流程

本文档为同行业参考，描述 Superwall 付费墙从触发到渲染的完整流程，作为 Hydra-Wall 架构设计的对比参考。

## 目录

- [流程一：SDK 初始化与配置拉取](#流程一sdk-初始化与配置拉取)
- [流程二：Placement 触发与规则评估](#流程二placement-触发与规则评估)
- [流程三：付费墙渲染与购买流程](#流程三付费墙渲染与购买流程)
- [流程四：Webhook 通知与权限更新](#流程四webhook-通知与权限更新)

---

## 流程一：SDK 初始化与配置拉取

**描述**：App 启动时，Superwall SDK 从服务端拉取 Campaign 配置并缓存在本地

```mermaid
sequenceDiagram
    autonumber
    participant App as 客户端 App
    participant SDK as Superwall SDK
    participant Backend as Superwall Backend
    participant Cache as Local Cache

    Note over App: App Launch / Foreground
    App->>SDK: initialize(apiKey)

    SDK->>SDK: loadFromCache()
    Note over SDK: 尝试加载本地缓存的配置

    alt 缓存存在且新鲜
        SDK-->>App: 使用缓存配置完成初始化
        Note over SDK: 无网络请求，立即可用
    else 缓存不存在或已过期
        SDK->>Backend: GET /v1/campaigns
        Note over Backend: 发送 API key

        Backend->>Backend: 查找该 App 的所有 Campaign 配置
        Backend->>Backend: 包含 Placements, Audiences, Experiments, Paywalls

        Backend-->>SDK: CampaignConfig JSON
        Note over SDK: 接收 campaigns, paywalls, placements 数据

        SDK->>Cache: saveToCache(config)
        SDK-->>App: 初始化完成
    end

    Note over SDK: 配置包含所有 Campaign 规则
    Note over SDK: 后续 register 调用无需等待网络
```

### 设计要点

| 特性 | 说明 |
|------|------|
| **本地优先** | SDK 优先使用缓存配置，register 调用无网络延迟 |
| **增量更新** | 只会拉取自上次同步后变更的配置 |
| **离线可用** | 缓存过期后，若无网络，SDK 会使用过期配置并重试 |

---

## 流程二：Placement 触发与规则评估

**描述**：当用户触发某个 Placement 时，SDK 在设备端完成规则评估，无需网络请求

```mermaid
sequenceDiagram
    autonumber
    participant App as 客户端 App
    participant SDK as Superwall SDK
    participant Local as Local Rules Engine

    App->>App: 用户点击付费入口按钮

    App->>SDK: Superwall.shared.register(placement, StartWorkout)
    Note over App: 注册 placement

    SDK->>Local: evaluate(placement, userContext)

    alt Placement 存在
        Local->>Local: 查找对应的 Campaign

        alt 用户首次进入该 Campaign
            Local->>Local: ExperimentService.Assign
            Note over Local: 根据百分比分配付费墙版本

            Note over Local: 用户被锁定到某个实验组
            Note over Local: 后续访问将使用相同分配
        else 重复访问
            Local->>Local: 使用已有的实验分配
        end

        alt 用户匹配 Audience 条件
            Local-->>SDK: PresentationResult.paywall
        else 用户不匹配任何 Audience
            Local-->>SDK: PresentationResult.noAudienceMatch
        else 用户在 Holdout 组
            Local-->>SDK: PresentationResult.holdout
        end
    else Placement 不存在
        Local-->>SDK: PresentationResult.placementNotFound
    end

    alt 结果为 paywall
        SDK->>SDK: 获取对应 PaywallConfig
        SDK-->>App: 触发付费墙展示回调
        App->>App: 准备展示付费墙
    else 结果为 holdout 或 noAudienceMatch
        SDK-->>App: 立即执行 feature 闭包
        Note over App: 用户直接访问功能，无需付费墙
    else 结果为 placementNotFound
        SDK-->>App: 立即执行 feature 闭包
        Note over App: 功能正常访问
    end
```

### 设备端规则评估的优势

| 优势 | 说明 |
|------|------|
| **零延迟** | 无需等待网络响应，付费墙可即时展示 |
| **离线可用** | 网络中断时仍能正常触发付费墙 |
| **减轻服务端压力** | 规则评估在客户端完成，减少服务端 QPS |
| **隐私合规** | 用户数据无需上传用于规则评估 |

---

## 流程三：付费墙渲染与购买流程

**描述**：付费墙通过 WebView 渲染，购买流程由 Superwall 服务端处理

```mermaid
sequenceDiagram
    autonumber
    participant App as 客户端 App
    participant SDK as Superwall SDK
    participant Web as WebView 付费墙
    participant WallFE as Wall Frontend
    participant WallSvc as Wall Service
    participant PaySvc as Payment Gateway
    participant Channel as Stripe 或 Paddle

    alt 设备端评估决定展示付费墙
        SDK->>SDK: getPaywall(forPlacement)
        Note over SDK: 获取付费墙视图控制器

        App->>App: present(paywallViewController)
        Note over Web: WebView 作为子视图加载
    end

    Web->>WallFE: GET /paywall/paywallId
    WallFE->>WallSvc: 获取付费墙模板配置
    WallSvc-->>WallFE: PaywallTemplate
    Note over WallFE: 包含 layouts, styles, products

    WallFE-->>Web: HTML/CSS/JS
    Note over Web: 渲染付费墙 UI

    Note over Web: 展示产品列表、定价、订阅按钮

    Web->>WallFE: 用户选择产品并点击订阅

    WallFE->>WallSvc: POST /v1/purchases/create
    Note over WallFE: 发送 productId, userId, channel

    alt 使用 Stripe 或 Paddle
        WallSvc->>PaySvc: 创建 PaymentIntent 或 Subscription
        PaySvc->>Channel: 创建结算会话 checkout session

        PaySvc-->>WallSvc: paymentUrl
        WallSvc-->>WallFE: redirectToCheckout(paymentUrl)

        Web->>Channel: 重定向到 Stripe 或 Paddle 托管页面

        Note over Channel: 用户输入支付信息并完成付款
        Channel-->>WallSvc: Webhook payment.completed
    else 使用 IAP App Store 或 Play Store
        WallSvc-->>Web: 返回 receipt 处理指令

        Web->>App: 调用原生 StoreKit

        App->>Channel: 发起应用内购买

        Channel-->>App: 购买成功，返回 receipt

        App->>WallSvc: POST /v1/receipts/verify
        Note over App: 发送 receiptData

        WallSvc->>Channel: 验证 receipt
        Channel-->>WallSvc: receipt valid
    end

    Note over WallSvc: 支付验证完成后
    WallSvc->>WallSvc: 创建或更新 Entitlement
    Note over WallSvc: 设置 subscriptionStart, expirationDate

    WallSvc-->>Channel: ACK

    Channel-->>Web: 关闭 Checkout，返回成功状态

    Web-->>App: paywallResult = purchased

    App->>App: 关闭付费墙视图

    App->>App: 执行 register 的 feature 闭包
    Note over App: 用户可以访问付费功能
```

### WebView 渲染的优势

| 优势 | 说明 |
|------|------|
| **跨平台一致** | 同一 HTML/CSS 在 iOS/Android/Web 渲染完全一致 |
| **热更新** | 付费墙样式和逻辑可随时修改，无需 App 更新 |
| **向后兼容** | 浏览器内核保证旧内容持续可渲染 |
| **迭代速度** | 运营人员可通过可视化编辑器修改付费墙 |

---

## 流程四：Webhook 通知与权限更新

**描述**：支付完成后，Superwall 通过 Webhook 通知商户后端系统

```mermaid
sequenceDiagram
    autonumber
    participant WallSvc as Wall Service
    participant Merchant as 商户后端
    participant SDK as Superwall SDK

    Note over WallSvc: 支付完成后
    WallSvc->>WallSvc: 处理支付结果

    alt 支付成功
        WallSvc->>WallSvc: 创建 Entitlement record
        Note over WallSvc: 记录 userId, productId, startDate, expirationDate

        WallSvc->>WallSvc: 计算下次续费日期
        Note over WallSvc: 使用 billingCycle
    end

    WallSvc->>Merchant: POST webhookUrl
    Note over WallSvc: 发送 JSON 事件数据

    Note over Merchant: Webhook 事件类型
    Note over Merchant: subscription.activated
    Note over Merchant: subscription.renewed
    Note over Merchant: subscription.expired
    Note over Merchant: payment.failed

    Merchant->>Merchant: 验证请求签名

    Merchant->>Merchant: 更新商户自己的订阅系统

    Merchant-->>WallSvc: 200 OK

    Note over SDK: 客户端下次启动时
    SDK->>WallSvc: syncSubscriptionStatus()

    WallSvc-->>SDK: SubscriptionStatus
    Note over SDK: 接收 isActive, expirationDate, products

    SDK->>SDK: 更新本地缓存

    SDK-->>App: 最新订阅状态
```

### Webhook 事件类型

| 事件 | 触发时机 |
|------|----------|
| subscription.activated | 用户首次订阅成功 |
| subscription.renewed | 订阅自动续费成功 |
| subscription.expired | 订阅过期或被取消 |
| payment.failed | 续费扣款失败 |
| payment.refunded | 退款处理完成 |
| trial.started | 用户开始免费试用 |
| trial.converted | 试用转正式订阅 |
| trial.not_converted | 试用结束，用户未订阅 |

---

## Superwall vs Hydra-Wall 对比

| 维度 | Superwall | Hydra-Wall |
|------|-----------|------------|
| **渲染引擎** | WebView 跨平台一致 | 未明确，预计类似 |
| **规则评估** | 设备端评估，无延迟 | 服务端评估，每次请求 |
| **配置缓存** | SDK 本地缓存加后台同步 | 服务端管理 |
| **付费墙托管** | Superwall 托管 | Hydra 托管 |
| **支付处理** | Stripe/Paddle/IAP | 跳转至渠道 |
| **Webhook 通知** | 支持多事件类型 | 支持支付回调 |
| **离线支持** | 部分功能可用 | 依赖网络 |

---

## 参考资料

- [Why We Chose Web Views - Superwall](https://superwall.com/blog/why-we-chose-web-views-the-strategic-advantage-behind-superwalls)
- [Presenting Paywalls - Superwall Docs](https://superwall.com/docs/ios/quickstart/feature-gating)
- [Web Paywalls - Superwall](https://superwall.com/features/web-paywalls)
- [Superwall Android SDK](https://github.com/superwall/Superwall-Android)

---

## SDK 初始化细节：配置 vs 渲染数据

### 两个阶段的数据分离

Superwall SDK 初始化阶段**只拉取配置，不包含渲染数据**。

```mermaid
sequenceDiagram
    autonumber
    participant App as 客户端 App
    participant SDK as Superwall SDK
    participant Backend as Superwall Backend
    participant CDN as CDN 付费墙资源

    Note over App: 阶段一：初始化
    App->>SDK: initialize(apiKey)

    SDK->>Backend: GET /v1/campaigns

    Backend-->>SDK: CampaignConfig JSON
    Note over SDK: 接收 paywalls, campaigns, experiments, placements

    Note over SDK: 仅包含配置元数据
    Note over SDK: 不含 HTML/CSS 内容

    SDK->>SDK: 保存到本地缓存
    SDK-->>App: 初始化完成

    Note over App: 此时 App 不知道付费墙长什么样
    Note over App: 只知道有哪些付费墙可以触发

    Note over App: 阶段二：触发渲染
    App->>SDK: register(placement, StartWorkout)

    SDK->>SDK: evaluate 返回 paywallId

    App->>App: 加载 WebView

    WebView->>CDN: GET /paywall/paywallId/index.html

    CDN-->>WebView: HTML/CSS/JS 渲染付费墙 UI
```

### 初始化拉取的内容（轻量配置）

```json
{
  "campaigns": [
    {
      "id": "camp_123",
      "name": "Premium Upgrade",
      "status": "active",
      "placements": ["StartWorkout", "ExportData"]
    }
  ],
  "paywalls": [
    {
      "id": "pw_premium_v1",
      "name": "Premium Paywall",
      "campaignId": "camp_123",
      "products": ["prod_monthly", "prod_yearly"]
    }
  ],
  "experiments": [
    {
      "id": "exp_456",
      "paywallIds": ["pw_premium_v1", "pw_premium_v2"],
      "distribution": {"pw_premium_v1": 50, "pw_premium_v2": 50}
    }
  ]
}
```

### 渲染时才加载的内容（重量资源）

| 资源 | 大小 | 说明 |
|------|------|------|
| HTML 模板 | 50-200KB | 付费墙布局结构 |
| CSS 样式 | 30-100KB | 主题、颜色、字体 |
| JS 逻辑 | 20-80KB | 交互逻辑、产品展示 |
| 产品图片 | 按需加载 | CDN 托管 |
| **总计** | **100-400KB** | 首次渲染需要下载 |

### 离线行为

| 场景 | 配置可用 | 付费墙可渲染 |
|------|---------|-------------|
| 缓存新鲜 | 是 | 是，已缓存 |
| 缓存过期，无网络 | 是，用过期配置 | 否，新付费墙无法加载 |
| 首次安装，无网络 | 否 | 否 |

### 设计优势

| 优势 | 说明 |
|------|------|
| **初始化快** | 只需下载轻量 JSON，小于 50KB，无需等待完整页面资源 |
| **流量省** | 用户可能触发多个付费墙，但只有看到的才下载渲染资源 |
| **离线支持** | 配置可缓存，触发规则在离线时仍然有效 |
| **CDN 加速** | 渲染资源从 CDN 加载，全球快速访问 |

### 设计权衡

| 权衡 | 影响 |
|------|------|
| **首次渲染延迟** | 首次触发付费墙时需要下载资源，有网络延迟 |
| **预加载策略** | Superwall 会在后台预加载用户最可能看到的付费墙 |
| **更新时机** | 付费墙内容更新后，已缓存的用户可能看到旧版本直到刷新 |
