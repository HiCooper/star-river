# iOS SDK

iOS SDK 帮助在 iOS 应用中集成 Hydra 付费墙和支付功能。

## 环境要求

- iOS 14.0+
- Swift 5.9+
- Xcode 15+

## 安装

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/hydra-pay/ios-sdk.git", from: "1.0.0")
]
```

## 初始化

```swift
import Hydra

Hydra.init(apiKey: "your_api_key", appId: "your_app_id")
```

## 付费墙功能

### 获取付费墙配置

```swift
let config = try await Hydra.Wall.getConfig(
    userId: "user_123",
    deviceType: .ios,
    pageType: "article"
)

if config.shouldShow {
    Hydra.Wall.presentPaywall(config: config)
}
```

### 上报事件

```swift
try await Hydra.Events.track(
    event: "page_view",
    properties: ["page_type": "article", "page_id": "article_789"]
)
```

### 查询订阅状态

```swift
let entitlement = try await Hydra.Wall.getEntitlement(userId: "user_123")
if entitlement.isSubscribed {
    // 用户已订阅
}
```

## 支付功能

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

### 监听支付结果

```swift
Hydra.Pay.onPaymentResult { result in
    switch result.status {
    case .success:
        print("支付成功")
    case .failed:
        print("支付失败")
    case .cancelled:
        print("用户取消")
    }
}
```

## Stripe Apple Pay

```swift
Hydra.init(
    apiKey: "your_api_key",
    appId: "your_app_id",
    merchantId: "merchant.com.yourapp"
)
```

## 调试模式

```swift
Hydra.setDebugMode(true)
```

## 错误处理

```swift
do {
    let config = try await Hydra.Wall.getConfig(...)
} catch HydraError.unauthorized {
    // API Key 无效
} catch HydraError.networkError {
    // 网络错误
} catch {
    // 其他错误
}
```
