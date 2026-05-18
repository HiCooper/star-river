# Android SDK

Android SDK 帮助在 Android 应用中集成 Hydra 付费墙和支付功能。

## 环境要求

- Android 5.0+ (API 21)
- Kotlin 1.9+
- Android Studio Hedgehog+

## 安装

### Gradle

```kotlin
implementation("com.hydra:android-sdk:1.0.0")
```

## 初始化

```kotlin
import com.hydra.sdk.Hydra

// Application 或 Activity
Hydra.init(context, apiKey = "your_api_key", appId = "your_app_id")
```

## 付费墙功能

### 获取付费墙配置

```kotlin
val config = Hydra.Wall.getConfig(
    userId = "user_123",
    deviceType = DeviceType.ANDROID,
    pageType = "article"
)

if (config.shouldShow) {
    Hydra.Wall.presentPaywall(context, config)
}
```

### 上报事件

```kotlin
Hydra.Events.track(
    event = "page_view",
    properties = mapOf("page_type" to "article", "page_id" to "article_789")
)
```

### 查询订阅状态

```kotlin
val entitlement = Hydra.Wall.getEntitlement(userId = "user_123")
if (entitlement.isSubscribed) {
    // 用户已订阅
}
```

## 支付功能

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

### 监听支付结果

```kotlin
Hydra.Pay.onPaymentResult { result ->
    when (result.status) {
        PaymentStatus.SUCCESS -> println("支付成功")
        PaymentStatus.FAILED -> println("支付失败")
        PaymentStatus.CANCELLED -> println("用户取消")
    }
}
```

## Google Play Billing

如需使用 Google Play 支付，需要配置 BillingClient：

```kotlin
Hydra.initWithGoogleBilling(
    context,
    apiKey = "your_api_key",
    appId = "your_app_id",
    billingClient = billingClient
)
```

## 调试模式

```kotlin
Hydra.setDebugMode(true)
```
