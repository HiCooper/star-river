# Pay API 参考

Hydra-Pay 提供 RESTful API 供商户系统和客户端 SDK 调用。

## 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `https://api.hydra.com/v1/pay` |
| 认证方式 | API Key (`X-API-Key` header) |
| 响应格式 | JSON |

## 认证

```http
X-API-Key: your_api_key_here
```

## 接口列表

### 创建支付订单

```http
POST /v1/orders
Content-Type: application/json
```

**请求体**

```json
{
  "amount": 9900,
  "currency": "CNY",
  "product_name": "Premium 月度订阅",
  "product_id": "premium_monthly_001",
  "merchant_order_id": "ORDER_123456",
  "channel": ["alipay", "wechat", "stripe"],
  "notify_url": "https://your-app.com/webhook/pay",
  "return_url": "https://your-app.com/payment/complete",
  "metadata": {
    "user_id": "user_456",
    "plan": "monthly"
  }
}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_id": "pay_abc123",
    "merchant_order_id": "ORDER_123456",
    "amount": 9900,
    "currency": "CNY",
    "status": "pending",
    "pay_url": "https://pay.hydra.com/checkout/pay_abc123",
    "expire_at": "2024-12-18T15:30:00Z"
  }
}
```

### 查询订单

```http
GET /v1/orders/{order_id}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_id": "pay_abc123",
    "merchant_order_id": "ORDER_123456",
    "amount": 9900,
    "currency": "CNY",
    "status": "paid",
    "channel": "alipay",
    "paid_at": "2024-12-18T14:30:00Z"
  }
}
```

### 申请退款

```http
POST /v1/refunds
Content-Type: application/json
```

**请求体**

```json
{
  "order_id": "pay_abc123",
  "amount": 5000,
  "reason": "用户请求退款"
}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "refund_id": "ref_xyz789",
    "order_id": "pay_abc123",
    "amount": 5000,
    "status": "pending",
    "created_at": "2024-12-18T16:00:00Z"
  }
}
```

### 查询退款

```http
GET /v1/refunds/{refund_id}
```

## 订单状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待支付 |
| `paid` | 支付成功 |
| `expired` | 订单过期 |
| `refunding` | 退款中 |
| `refunded` | 已退款 |
| `failed` | 支付失败 |

## Webhook 通知

支付结果通过 HTTP POST 发送到 `notify_url`：

```json
{
  "event": "payment.completed",
  "order_id": "pay_abc123",
  "merchant_order_id": "ORDER_123456",
  "status": "paid",
  "amount": 9900,
  "channel": "alipay",
  "paid_at": "2024-12-18T14:30:00Z",
  "signature": "abc123..."
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| `0` | 成功 |
| `10001` | 参数错误 |
| `10002` | 认证失败 |
| `10003` | 订单不存在 |
| `10004` | 余额不足 |
| `10005` | 渠道不可用 |
| `20001` | 服务内部错误 |
| `20002` | 服务不可用 |
