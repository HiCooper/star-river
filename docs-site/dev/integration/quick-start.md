# 快速集成

本指南帮助您快速接入 Hydra 支付服务。

## 集成方式

| 方式 | 适用场景 | 开发工作量 |
|------|---------|-----------|
| 托管模式 | 快速上线，无需开发支付页面 | 1 天 |
| SDK 模式 | 有移动应用，需要内嵌支付 | 3-5 天 |

## 前置准备

1. 注册 Hydra 账号：[https://console.hydra.com](https://console.hydra.com)
2. 创建应用，获取 `App ID`
3. 获取 API Key
4. 配置支付渠道（需在渠道商户平台开通）

## 托管模式接入

### 步骤 1: 初始化

```javascript
import Hydra from '@hydra/web-sdk';

Hydra.init({
    apiKey: 'your_api_key',
    appId: 'your_app_id'
});
```

### 步骤 2: 创建支付订单

```javascript
const result = await Hydra.Pay.createOrder({
    amount: 9900,  // 金额，单位分
    currency: 'CNY',
    productId: 'premium_monthly',
    productName: 'Premium 月度订阅',
    channel: ['alipay', 'wechat', 'stripe'],
    returnUrl: 'https://your-app.com/payment/complete',
    notifyUrl: 'https://your-app.com/webhook/pay'
});
```

### 步骤 3: 重定向支付

```javascript
// 跳转到托管结算页
window.location.href = result.payUrl;
```

### 步骤 4: 处理支付结果

```javascript
// 方式1: 同步跳转（return_url）
// 用户支付完成后自动跳转回 return_url

// 方式2: Webhook 回调
// 服务端接收异步通知
app.post('/webhook/pay', (ctx) => {
    const { order_id, status } = ctx.request.body;
    if (status === 'paid') {
        // 更新订单状态
    }
});
```

## SDK 模式接入

### 步骤 1: 安装 SDK

根据您的平台选择安装方式：

- [iOS SDK](../sdk/ios-sdk)
- [Android SDK](../sdk/android-sdk)
- [Web SDK](../sdk/web-sdk)
- [Flutter SDK](../sdk/flutter-sdk)

### 步骤 2: 初始化

```swift
// iOS
Hydra.init(apiKey: "your_api_key", appId: "your_app_id")
```

```kotlin
// Android
Hydra.init(context, apiKey = "your_api_key", appId = "your_app_id")
```

### 步骤 3: 实现支付

```swift
// iOS
let result = try await Hydra.Pay.createOrder(
    amount: 9900,
    currency: "CNY",
    productId: "premium_monthly",
    productName: "Premium 月度订阅",
    channel: [.alipay, .wechat, .stripe]
)

// 打开支付
Hydra.Pay.openPayment(payUrl: result.payUrl!)
```

### 步骤 4: 验证支付结果

```swift
// 监听支付结果
Hydra.Pay.onPaymentResult { result in
    switch result.status {
    case .success:
        // 支付成功，发放内容
    default:
        break
    }
}
```

## 测试支付

### 测试环境

- 测试 API: `https://api-sandbox.hydra.com`
- 不产生真实扣款

### 测试卡号

| 渠道 | 卡号 |
|------|------|
| Stripe | 4242 4242 4242 4242 |
| Alipay | 模拟器测试 |
| WeChat | 模拟器测试 |

## 常见问题

**Q: 支付完成后如何更新用户权限？**
A: Hydra 会在支付成功后自动通知 hydra-wall 更新用户权限，您无需手动处理。

**Q: 支持哪些货币？**
A: CNY、USD、HKD、EUR 等，具体取决于渠道支持。
