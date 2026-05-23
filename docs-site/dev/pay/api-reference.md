# API 参考

星河支付提供 RESTful API，通过 `X-API-Key` 头鉴权。

## 快速开始

```bash
# 创建支付
curl -X POST https://your-domain.com/v1/payments/create \
  -H "X-API-Key: sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "amount": 100,
    "channel": "alipay",
    "trade_type": "native",
    "description": "月度会员"
  }'

# 查询支付
curl https://your-domain.com/v1/payments/{payment_id} \
  -H "X-API-Key: sk_your_api_key"
```

## 鉴权

所有 API 请求需携带 `X-API-Key` 头，值为在开发者门户中获取的 API Key。

```http
POST /v1/payments/create HTTP/1.1
X-API-Key: sk_your_api_key
Content-Type: application/json
```

## 接口列表

### 创建支付

`POST /v1/payments/create`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 用户唯一标识 |
| `amount` | int | 是 | 金额（分），1 = 0.01 元 |
| `channel` | string | 否 | 支付渠道：`alipay`（默认）/ `wechat` |
| `trade_type` | string | 否 | 支付方式：`native`（扫码）/ `h5` / `app` / `jsapi` |
| `description` | string | 否 | 订单描述 |
| `success_url` | string | 否 | H5 支付成功跳转地址 |
| `notify_url` | string | 否 | 覆盖默认回调地址 |
| `sub_merchant_id` | string | 否 | 服务商模式：子商户标识 |
| `open_id` | string | 否 | 微信 JSAPI 支付用户 OpenID |
| `channel_app_id` | string | 否 | 微信 AppID |
| `metadata` | object | 否 | 自定义数据 |

**请求示例**：

```bash
curl -X POST https://your-domain.com/v1/payments/create \
  -H "X-API-Key: sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "amount": 9900,
    "channel": "alipay",
    "trade_type": "native",
    "description": "Premium Monthly"
  }'
```

**响应**：

```json
{
  "success": true,
  "data": {
    "payment_id": "58edcf81-75eb-420c-87c1-faa91587ded7",
    "channel": "alipay",
    "amount": 9900,
    "currency": "CNY",
    "status": "processing",
    "payment_url": "",
    "qr_code_url": "https://qr.alipay.com/bax08695hqshner5dstr00e2"
  }
}
```

| 响应字段 | 说明 |
|------|------|
| `payment_id` | 支付订单唯一 ID（UUID） |
| `status` | `pending` → `processing` → `paid` / `failed` |
| `qr_code_url` | Native 支付的扫码链接 |
| `payment_url` | H5/App 支付的跳转链接 |

### 查询支付

`GET /v1/payments/{payment_id}`

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "58edcf81-...",
    "user_id": "user_001",
    "amount": 9900,
    "currency": "CNY",
    "channel": "alipay",
    "status": "paid",
    "external_id": "2026052322001418720508426247",
    "description": "Premium Monthly",
    "created_at": "2026-05-23T17:37:47+08:00",
    "paid_at": "2026-05-23T17:42:44+08:00"
  }
}
```

| 字段 | 说明 |
|------|------|
| `status` | 支付状态：`pending` / `processing` / `paid` / `failed` / `refunded` |
| `external_id` | 支付宝/微信的交易号（支付成功后才有） |
| `paid_at` | 支付时间（支付成功后才有） |

## 异步通知

支付成功后，星河支付会向你配置的 Webhook URL 发送 POST 通知。

**通知格式**：

```json
{
  "event": "payment.success",
  "payment_id": "58edcf81-...",
  "user_id": "user_001",
  "plan_id": "premium_monthly",
  "amount": 9900,
  "currency": "CNY",
  "status": "paid",
  "channel": "alipay"
}
```

**重试策略**：通知失败后 1s → 5s → 15s 重试 3 次，均失败则停止。

## 错误码

| HTTP 状态码 | 错误码 | 说明 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | 参数校验失败 |
| 401 | `UNAUTHORIZED` | API Key 无效 |
| 404 | `NOT_FOUND` | 订单不存在 |
| 502 | `PAYMENT_FAILED` | 支付渠道返回失败 |
| 502 | `CHANNEL_ERROR` | 支付渠道通信异常 |

## 支付渠道

| 渠道 | `channel` 值 | 支持的 `trade_type` |
|------|-------------|-------------------|
| 支付宝 | `alipay` | `native`（扫码）、`h5`（手机网站）、`app`（APP 支付） |
| 微信支付 | `wechat` | `native`（扫码）、`jsapi`（公众号/小程序）、`app`（APP 支付） |
