---
title: Stripe 支付服务工作流程
description: Stripe 支付完整流程参考
---

# Stripe 支付服务工作流程

本文档描述 Stripe 支付的完整工作流程，作为 Hydra-Pay 架构设计的参考。

## 目录

- [支付流程概览](#支付流程概览)
- [Checkout Session 创建](#checkout-session-创建)
- [支付页面渲染](#支付页面渲染)
- [支付完成处理](#支付完成处理)
- [Webhook 通知](#webhook-通知)
- [参考架构对比](#参考架构对比)

---

## 支付流程概览

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Backend as 商户后端
    participant Stripe as Stripe
    participant Channel as 支付渠道

    Note over Client: 用户选择 Stripe 支付
    Client->>Backend: 请求创建 Checkout Session
    Backend->>Stripe: 创建 Checkout Session
    Stripe-->>Backend: 返回 sessionId 和 paymentUrl

    Backend-->>Client: 返回 paymentUrl
    Client->>Client: 跳转 Stripe 托管页

    Client->>Stripe: 填写支付信息
    Stripe->>Channel: 扣款
    Channel-->>Stripe: 扣款成功

    Stripe-->>Client: 支付完成跳转 successUrl
    Stripe->>Backend: Webhook 通知
    Backend->>Backend: 更新订单状态
```

---

## Checkout Session 创建

**描述**：商户后端调用 Stripe API 创建支付会话

```mermaid
sequenceDiagram
    participant Backend as 商户后端
    participant Stripe as Stripe API

    Backend->>Backend: 构建支付请求
    Note over Backend: amount, currency, customerEmail, metadata

    Backend->>Stripe: POST /v1/checkout/sessions
    Note over Stripe: mode: payment, success_url, cancel_url

    Stripe->>Stripe: 创建 Session
    Stripe->>Stripe: 生成 paymentIntent

    Stripe-->>Backend: sessionId, paymentIntentId
    Backend-->>Backend: 保存订单记录

    Note over Backend: 返回 paymentUrl 给客户端
```

### Checkout Session 配置参数

| 参数 | 说明 |
|------|------|
| mode | payment / subscription |
| amount | 金额（分） |
| currency | 币种（usd, cny） |
| customer_email | 客户邮箱 |
| line_items | 商品列表 |
| success_url | 支付成功跳转地址 |
| cancel_url | 支付取消跳转地址 |
| metadata | 商户自定义数据 |

---

## 支付页面渲染

**描述**：用户被重定向到 Stripe 托管的支付页面

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Stripe as Stripe 托管页面

    Client->>Client: 跳转 paymentUrl

    Note over Client: Stripe 托管页加载
    Client->>Stripe: GET /pay/{sessionId}
    Stripe-->>Client: 支付表单页面

    Note over Client: 用户填写卡号等信息
    Note over Client: Stripe Elements 验证

    Client->>Stripe: 提交支付

    Note over Stripe: 3D Secure 处理（如需要）
    Note over Stripe: 风险控制检查
```

### Stripe 托管页面特点

| 特性 | 说明 |
|------|------|
| 托管页面 | Stripe 提供安全的支付页面 |
| PCI 合规 | 无需商户处理敏感卡信息 |
| 多语言支持 | 自动适配用户地区 |
| 移动端优化 | 响应式设计 |

---

## 支付完成处理

**描述**：支付完成后 Stripe 处理结果并跳转

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Stripe as Stripe
    participant Channel as 发卡行

    Note over Client: 支付成功
    Stripe->>Channel: 发起扣款
    Channel-->>Stripe: 扣款成功

    Stripe->>Stripe: 更新 PaymentIntent 状态
    Stripe-->>Client: 跳转 success_url

    Note over Client: 显示支付成功
    Client->>Stripe: 验证 session 状态
    Stripe-->>Client: 返回 session 详情
```

---

## Webhook 通知

**描述**：Stripe 通过 Webhook 异步通知商户支付结果

```mermaid
sequenceDiagram
    participant Stripe as Stripe
    participant Backend as 商户后端
    participant DB as 数据库

    Note over Stripe: 支付状态变更
    Stripe->>Stripe: 生成签名

    Stripe->>Backend: POST webhookUrl
    Note over Backend: X-Stripe-Signature header

    Backend->>Backend: 验证签名
    Backend->>Backend: 解析事件类型

    alt checkout.session.completed
        Backend->>DB: 更新订单状态: paid
        Backend->>Backend: 发放商品/服务
    else payment_intent.payment_failed
        Backend->>DB: 更新订单状态: failed
        Backend->>Backend: 通知用户
    end

    Backend-->>Stripe: 200 OK
```

### Webhook 事件类型

| 事件 | 触发时机 |
|------|----------|
| checkout.session.completed | Checkout Session 完成 |
| payment_intent.succeeded | 支付成功 |
| payment_intent.payment_failed | 支付失败 |
| charge.refunded | 退款处理 |
| customer.subscription.created | 订阅创建 |
| customer.subscription.updated | 订阅更新 |
| customer.subscription.deleted | 订阅取消 |

### 签名验证

```python
def verify_stripe_signature(payload, signature, secret):
    # 使用 Stripe Webhook Secret 验证签名
    event = stripe.Webhook.construct_event(
        payload, signature, secret
    )
    return event
```

---

## Stripe 与 Hydra-Pay 架构对比

| 维度 | Stripe | Hydra-Pay |
|------|--------|-----------|
| **支付模式** | Checkout Session / Payment Intent | 类似设计 |
| **托管页面** | Stripe 提供托管页 | Hydra 提供托管页 |
| **API 风格** | RESTful + Webhook | RESTful + Webhook |
| **签名验证** | HMAC SHA256 | HMAC SHA256 |
| **渠道集成** | Stripe 自有渠道 | 多渠道适配器模式 |
| **商户 Dashboard** | Stripe Dashboard | Hydra Console |
| **Webhook 重试** | 自动重试，最长 72 小时 | 自动重试机制 |

---

## 参考资料

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Stripe SDK](https://stripe.com/docs/sdks)
