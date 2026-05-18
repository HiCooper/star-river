# 托管结算页

托管结算页（Hosted Checkout）是 Hydra-Pay 提供的一站式支付页面，由 Hydra 托管页面样式和支付流程，商户无需自行开发支付前端。

## 适用场景

| 场景 | 推荐方式 |
|------|---------|
| 快速接入，不想开发支付页面 | 托管结算页 |
| 已有多端应用，希望内嵌支付 | SDK 模式 |
| 有强定制需求，已有支付 UI | API 模式 |

## 托管结算页特点

### 开箱即用

- 无需开发前端支付页面
- 自动适配移动端 / PC 端
- 内置支付安全提示和信任标识

### 多支付渠道

一个页面集成多种支付方式：

| 渠道 | 支持类型 |
|------|---------|
| Alipay | 扫码支付、JSAPI 支付 |
| WeChat Pay | 公众号支付、小程序支付 |
| Stripe | Card、Google Pay、Apple Pay |
| Apple IAP | 应用内购买（iOS） |
| Google Billing | 应用内购买（Android） |

### 品牌定制

支持基础的样式定制：
- Logo 上传
- 主色调配置
- 订单详情页文案

## 接入流程

### 1. 创建结算页

调用 API 创建托管结算页：

```http
POST /v1/checkout/pages
Content-Type: application/json

{
  "amount": 9900,
  "currency": "CNY",
  "product_name": "Premium 月度订阅",
  "product_id": "premium_monthly_001",
  "merchant_order_id": "ORDER_123456",
  "channel": ["alipay", "wechat", "stripe"],
  "notify_url": "https://your-app.com/webhook/pay",
  "return_url": "https://your-app.com/payment/complete"
}
```

### 2. 重定向用户

获取返回的结算页 URL 后，重定向用户：

```json
{
  "page_url": "https://pay.hydra.com/checkout/hc_abc123",
  "expire_at": "2024-12-18T15:30:00Z"
}
```

### 3. 等待支付结果

- **同步回调**: 用户支付完成后，页面自动跳转到 `return_url`
- **异步通知**: 服务端会向 `notify_url` 发送 webhook 通知

### 4. 验证签名

接收 webhook 时，验证回调签名确保安全性：

```go
err := hydra.VerifyWebhookSignature(body, signature, secret)
```

## 结算页生命周期

```
创建结算页 → 重定向到结算页 → 用户选择支付方式 → 唤起支付钱包 → 支付完成 → 跳转 return_url
                                                    ↓
                                            异步发送 webhook
```

| 状态 | 说明 |
|------|------|
| `pending` | 结算页已创建，等待用户选择支付 |
| `paid` | 用户支付成功 |
| `expired` | 结算页过期（默认 2 小时） |
| `cancelled` | 用户主动取消 |

## 订单有效期

- 默认有效期: **2 小时**
- 可通过 `expire_minutes` 参数自定义（如 30 分钟）
- 过期后需重新创建结算页

## 退款

托管结算页产生的订单支持全额退款和部分退款：

```http
POST /v1/refunds
Content-Type: application/json

{
  "original_order_id": "ORDER_123456",
  "amount": 5000,
  "reason": "用户请求退款"
}
```

## 常见问题

**Q: 结算页支持哪些货币？**
A: CNY、USD、HKD、EUR 等常见货币，具体取决于渠道支持。

**Q: 支付失败后可以重试吗？**
A: 可以，用户可以返回结算页重新选择支付方式，只要页面未过期。

**Q: 如何在小程序中接入？**
A: 通过 H5 页面跳转或使用 SDK 内嵌模式。

**Q: 托管结算页有服务费吗？**
A: 按交易金额收取手续费，不同渠道费率不同，具体参考渠道文档。