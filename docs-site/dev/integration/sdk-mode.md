# SDK 模式

SDK 模式通过在客户端集成 Hydra SDK，在应用内完成支付流程，无需跳转到外部页面。

## 适用场景

- 移动应用（iOS/Android）
- 希望在应用内完成支付
- 有定制化支付流程需求

## 特点

| 特点 | 说明 |
|------|------|
| 原生体验 | 支付流程在应用内完成 |
| 可定制 | UI 和流程可完全自定义 |
| 数据可控 | 可获取完整的支付节点数据 |

## iOS 集成

### 安装

通过 Swift Package Manager：

```swift
dependencies: [
    .package(url: "https://github.com/hydra-pay/ios-sdk.git", from: "1.0.0")
]
```

### 初始化

```swift
import Hydra

Hydra.init(apiKey: "your_api_key", appId: "your_app_id")
```

### 发起支付

```swift
let result = try await Hydra.Pay.createOrder(
    amount: 9900,
    currency: "CNY",
    productId: "premium_monthly",
    productName: "Premium 月度订阅",
    channel: [.alipay, .wechat, .stripe]
)

if let payUrl = result.payUrl {
    Hydra.Pay.openPayment(payUrl: payUrl)
}
```

### 监听结果

```swift
Hydra.Pay.onPaymentResult { result in
    if result.status == .success {
        // 发放内容
    }
}
```

## Android 集成

### 安装

```kotlin
implementation("com.hydra:android-sdk:1.0.0")
```

### 初始化

```kotlin
Hydra.init(context, apiKey = "your_api_key", appId = "your_app_id")
```

### 发起支付

```kotlin
val result = Hydra.Pay.createOrder(
    amount = 9900,
    currency = "CNY",
    productId = "premium_monthly",
    productName = "Premium 月度订阅",
    channel = listOf(Channel.ALIPAY, Channel.WECHAT, Channel.STRIPE)
)

result.payUrl?.let { url ->
    Hydra.Pay.openPayment(context, url)
}
```

### 监听结果

```kotlin
Hydra.Pay.onPaymentResult { result ->
    if (result.status == PaymentStatus.SUCCESS) {
        // 发放内容
    }
}
```

## Web 集成

### 安装

```bash
npm install @hydra/web-sdk
```

### Stripe Payment Element

Web SDK 支持 Stripe Payment Element，可内嵌到您的页面：

```javascript
const elements = Hydra.Pay.createStripeElements({
    clientSecret: result.clientSecret,
    appearance: {
        theme: 'stripe',
        variables: {
            colorPrimary: '#3b82f6'
        }
    }
});

elements.mount('#payment-element');

// 提交支付
await elements.submit();
```

## 支付渠道选择

### 渠道列表

| 渠道 | iOS | Android | Web |
|------|-----|---------|-----|
| Alipay | ✅ | ✅ | ✅ |
| WeChat Pay | ✅ | ✅ | ✅ |
| Stripe | ✅ | ✅ | ✅ |
| Apple Pay | ✅ | - | ✅ |
| Google Pay | - | ✅ | ✅ |
| Credit Card | ✅ | ✅ | ✅ |

### 动态获取可用渠道

```swift
let channels = try await Hydra.Pay.getAvailableChannels()
// 返回当前用户可用的支付渠道
```

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|---------|
| `channel_unavailable` | 渠道不可用 | 提示用户选择其他渠道 |
| `order_expired` | 订单过期 | 重新创建订单 |
| `network_error` | 网络错误 | 重试 |

## 安全考虑

1. **不要在客户端存储敏感信息**
2. **验证签名**: 接收 webhook 时必须验证签名
3. **使用 HTTPS**: 所有 API 调用必须使用 HTTPS
