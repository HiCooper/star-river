# 服务商模式设计决策

本文档记录星河支付作为支付服务商的两个核心设计决策及其理由。

## 一、回调链路设计

### 为什么回调地址统一填服务商的，而不是子商户的？

#### 结论

支付宝和微信支付的异步通知地址（`notify_url`）必须填写星河支付（服务商）的地址，**不能**填写子商户的地址。

#### 回调链路

```
用户扫码支付
    │
    ▼
支付宝 / 微信支付 服务端
    │
    │  POST 异步通知
    ▼
https://pay.xinghe.com/v1/payments/callback/alipay   ← 星河支付（服务商）地址
    │
    │  RSA2 / V3 验签 → 解密 → 查库 → MarkPaidIfPending
    ▼
hydra-pay 服务
    │
    │  Webhook 通知（按 app 的 webhook_url 分发）
    ▼
子商户 A 的服务器              子商户 B 的服务器
https://merchant-a.com/cb     https://merchant-b.com/cb
```

#### 为什么不能填子商户地址

| 原因 | 说明 |
|------|------|
| **签名验证** | 异步通知的签名需要用支付宝公钥 / 微信平台证书验证。这些凭证只有服务商持有，子商户没有 |
| **回调解密** | 微信 V3 回调的 `resource` 字段用 APIv3 密钥 AES-GCM 加密，只有服务商持有该密钥 |
| **服务商 API 调用** | 服务商模式下，API 请求以服务商身份发起，回调也必然返回给服务商。支付宝/微信不支持回调转发到子商户 |
| **资金归属** | 服务商模式下资金直接进入子商户账户，服务商只是技术通道。回调到服务商后更新订单状态，是合规且正确的做法 |

#### 子商户如何感知支付结果

星河支付在收到回调并更新订单状态后，通过 **Webhook** 通知子商户：

```json
POST https://merchant-a.com/callback   ← 子商户在后台配置的 webhook_url

{
  "event": "payment.success",
  "payment_id": "58edcf81-...",
  "user_id": "user_001",
  "amount": 9900,
  "currency": "CNY",
  "status": "paid",
  "channel": "alipay"
}
```

同时子商户也可以随时通过 `GET /v1/payments/{id}` 主动查询订单状态。

#### 代码实现

所有支付共用服务商在 `.env` 中配置的回调地址：

```go
// alipay.go — 每笔支付都带同一个 notify_url
p.NotifyURL = a.config.NotifyURL        // 服务商统一配置
if req.NotifyURL != "" {
    p.NotifyURL = req.NotifyURL          // 允许测试时覆盖
}
```

支付成功后按子商户分发的逻辑：

```go
// payment_service.go
func (s *PaymentService) notifyWall(payment *model.Payment, ...) {
    // 先查该 app 是否配置了独立的 webhook_url
    var app model.App
    s.db.First(&app, "id = ?", payment.AppID)
    if app.WebhookURL != "" {
        webhookURL = app.WebhookURL      // 推送到子商户自己的地址
    } else {
        webhookURL = s.wallWebhookURL    // 兜底到全局配置
    }
    // POST webhookURL ...
}
```

---

## 二、App 与子商户的映射设计

### 为什么一个 App 对应一个支付宝 PID 和一个微信商户号？

#### 结论

当前设计是合理的：`apps` 表中一个应用（App）对应一个支付宝子商户 PID 和一个微信子商户号。

#### 数据模型

```
apps 表
├── name              ← 接入方名称（如「XX电商平台」）
├── api_key           ← 支付 API 鉴权
├── alipay_pid        ← 该接入方的支付宝子商户 PID
├── wechat_sub_mchid  ← 该接入方的微信子商户号
├── wechat_sub_appid  ← 该接入方的微信子商户 AppID
└── webhook_url       ← 支付结果通知地址
```

#### 为什么 1:1:1 是合理的

**根本原因：支付宝和微信的子商户都以营业执照为最小单位。**

一个法律主体的支付账户结构：

```
一个营业执照 → 一张对公银行卡
                    ├── 绑定一个支付宝子商户（一个 PID）
                    └── 绑定一个微信子商户（一个 mchid）
```

- 支付宝：一个营业执照只能签约一个子商户，对应唯一的 PID
- 微信支付：一个营业执照只能申请一个子商户号（mchid）
- 因此，一个「接入方」= 一个法律主体 = 一个支付宝 PID + 一个微信 mchid

`apps` 表的 1:1:1 映射如实反映了这个商业现实。没有过度抽象，也没有简化不足。

#### 什么时候会变复杂

| 场景 | 是否需要改动 | 改动方式 |
|------|------------|---------|
| 单主体单门店 | ❌ 不需要 | 当前设计直接满足 |
| 连锁企业（多门店） | ⚠️ 需要 | 拆出 `sub_merchants` 表，一个 app 关联多个子商户 |
| 多主体集团 | ⚠️ 需要 | 一个集团下多个 app，每个 app 各有一个子商户 |
| 跨境多币种 | ⚠️ 需要 | 可能需要额外的 Stripe 等渠道配置 |

当前阶段（单主体接入方占绝大多数），保持 1:1:1 的简单设计是最务实的选择。过早引入多子商户映射会增加复杂度而无实际收益。

#### 设计原则

> 先让 90% 的场景简单，不要让 10% 的场景使 90% 变复杂。

等到第一个连锁多门店的客户出现时，再拆 `sub_merchants` 表。届时改动只需要：
1. 新建 `sub_merchants` 表
2. `apps` 表去掉 PID/mchid 字段
3. `apps` 和 `sub_merchants` 建立一对多关联

改动范围小，不影响现有数据迁移。
