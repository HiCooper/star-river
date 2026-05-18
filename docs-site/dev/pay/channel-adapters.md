# 渠道适配器

渠道适配器（Channel Adapter）是支付渠道的抽象层，将不同支付渠道的接口统一封装，提供一致的调用方式。

## 架构设计

```
                    ┌─────────────────┐
                    │  Payment Router │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼─────────┐     │     ┌────────▼────────┐
    │   Alipay Adapter  │     │     │ WeChat Adapter  │
    └──────────────────┘     │     └──────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼─────────┐     │     ┌────────▼────────┐
    │  Stripe Adapter  │     │     │ Apple IAP Adapter│
    └──────────────────┘           └──────────────────┘
```

## 适配器接口

每个适配器必须实现以下接口：

```go
type ChannelAdapter interface {
    GetChannelID() string
    CreatePayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error)
    QueryOrder(ctx context.Context, orderID string) (*OrderStatus, error)
    Refund(ctx context.Context, req *RefundRequest) (*RefundResponse, error)
    VerifyWebhookSignature(payload []byte, signature string) bool
    ParseWebhookNotification(payload []byte) (*WebhookNotification, error)
}
```

## 已支持的渠道

### Alipay

| 功能 | 支持情况 |
|------|---------|
| 扫码支付 | ✅ |
| JSAPI 支付 | ✅ |
| APP 支付 | ✅ |
| 退款 | ✅ |

### WeChat Pay

| 功能 | 支持情况 |
|------|---------|
| 公众号支付 | ✅ |
| 小程序支付 | ✅ |
| H5 支付 | ✅ |
| 扫码支付 | ✅ |
| 退款 | ✅ |

### Stripe

| 功能 | 支持情况 |
|------|---------|
| Card 支付 | ✅ |
| Google Pay | ✅ |
| Apple Pay | ✅ |
| 退款 | ✅ |

### Apple IAP

| 功能 | 支持情况 |
|------|---------|
| 应用内购买 | ✅ |
| 订阅管理 | ✅ |

### Google Billing

| 功能 | 支持情况 |
|------|---------|
| 应用内购买 | ✅ |
| 订阅管理 | ✅ |

## 接入新渠道

### 步骤 1: 创建适配器目录

```
hydra-pay/internal/adapter/
└── new_channel/
    ├── adapter.go
    ├── client.go
    └── webhook.go
```

### 步骤 2: 实现适配器接口

```go
type Adapter struct {
    merchantID string
    appSecret  string
}

func (a *Adapter) GetChannelID() string {
    return "new_channel"
}
```

### 步骤 3: 注册适配器

```go
func init() {
    RegisterAdapter(&NewChannelAdapter{})
}
```

## 回调处理

每个渠道的回调通知格式不同，适配器负责解析和标准化：

```go
type NormalizedWebhook struct {
    Channel      string
    OrderID      string
    Status       string
    Amount       int64
    Currency     string
    Timestamp    time.Time
}
```

## 测试

| 测试类型 | 覆盖内容 |
|---------|---------|
| 签名验证 | 测试各种签名格式 |
| 回调解析 | 测试各渠道回调格式 |
| 错误处理 | 测试网络错误、渠道错误 |
| 并发安全 | 测试并发调用安全性 |
