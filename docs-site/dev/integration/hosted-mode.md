# 托管模式

托管模式（Hosted Mode）由 Hydra 提供托管的支付页面，您无需开发任何支付相关前端，适合快速上线。

## 适用场景

- 快速接入，不想开发支付页面
- Web 应用（移动端 H5 也支持）
- 没有定制化支付流程需求

## 特点

| 特点 | 说明 |
|------|------|
| 无需开发 | 直接跳转到 Hydra 托管的支付页面 |
| 多渠道 | 自动支持 Alipay、WeChat、Stripe |
| 响应式 | 自动适配 PC 和移动端 |
| 可定制 | 支持基础的品牌定制（Logo、颜色） |

## 接入流程

### 1. 创建结算页订单

```http
POST /v1/checkout/pages
Content-Type: application/json
X-API-Key: your_api_key

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

### 2. 跳转到支付页

```json
{
  "page_url": "https://pay.hydra.com/checkout/hc_abc123",
  "expire_at": "2024-12-18T15:30:00Z"
}
```

```javascript
// 跳转到托管结算页
window.location.href = result.page_url;
```

### 3. 等待支付结果

**同步回调**: 用户支付完成后，页面自动跳转到 `return_url`，URL 参数包含支付结果：

```
https://your-app.com/payment/complete?order_id=pay_abc123&status=paid
```

**异步通知**: 服务端会向 `notify_url` 发送 webhook 回调：

```json
{
  "event": "payment.completed",
  "order_id": "pay_abc123",
  "status": "paid",
  "amount": 9900,
  "signature": "..."
}
```

## 托管结算页生命周期

```
创建订单 → 展示结算页 → 用户选择渠道 → 唤起支付钱包 → 支付完成
                                                            ↓
                                              跳转 return_url + webhook
```

| 状态 | 说明 |
|------|------|
| `pending` | 等待用户选择支付 |
| `paid` | 支付成功 |
| `expired` | 订单过期（默认 2 小时） |
| `cancelled` | 用户取消 |

## 品牌定制

支持在 [Hydra Console](https://console.hydra.com) 配置：

- Logo 图片（建议 200x200 PNG）
- 主色调（十六进制颜色码）
- 页面标题和描述文案

## 订单有效期

- 默认: 2 小时
- 可通过 `expire_minutes` 参数自定义
- 过期后需重新创建订单

## 退款

托管模式订单同样支持退款：

```http
POST /v1/refunds
{
  "order_id": "pay_abc123",
  "amount": 9900,
  "reason": "用户请求退款"
}
```

## 对比 SDK 模式

| 对比项 | 托管模式 | SDK 模式 |
|--------|---------|---------|
| 开发量 | 1-2 小时 | 3-5 天 |
| 定制化 | 受限 | 完全自由 |
| 用户体验 | 需要跳转 | 原生内嵌 |
| 适用场景 | Web/H5 | App、小程序 |
