# Flutter SDK

Flutter SDK 帮助在 Flutter 应用中集成 Hydra 付费墙和支付功能，支持 iOS 和 Android。

## 环境要求

- Flutter 3.16+
- Dart 3.2+
- iOS 14.0+ / Android 5.0+

## 安装

```yaml
dependencies:
  hydra_sdk: ^1.0.0
```

## 初始化

```dart
import 'package:hydra_sdk/hydra_sdk.dart';

void main() {
  Hydra.init(apiKey: 'your_api_key', appId: 'your_app_id');
  runApp(const MyApp());
}
```

## 付费墙功能

### 获取付费墙配置

```dart
final config = await Hydra.wall.getConfig(
  userId: 'user_123',
  deviceType: DeviceType.mobile,
  pageType: 'article',
);

if (config.shouldShow) {
  Hydra.wall.presentPaywall(config);
}
```

### 上报事件

```dart
await Hydra.events.track(
  event: 'page_view',
  properties: {'page_type': 'article', 'page_id': 'article_789'},
);
```

### 查询订阅状态

```dart
final entitlement = await Hydra.wall.getEntitlement('user_123');
if (entitlement.isSubscribed) {
  // 用户已订阅
}
```

## 支付功能

### 发起支付

```dart
final result = await Hydra.pay.createOrder(
  amount: 9900,
  currency: 'CNY',
  productId: 'premium_monthly',
  productName: 'Premium 月度订阅',
  channel: [Channel.alipay, Channel.wechat, Channel.stripe],
);

if (result.payUrl != null) {
  await Hydra.pay.openPayment(result.payUrl!);
}
```

### 监听支付结果

```dart
Hydra.pay.onPaymentResult((result) {
  switch (result.status) {
    case PaymentStatus.success:
      print('支付成功');
      break;
    case PaymentStatus.failed:
      print('支付失败');
      break;
    case PaymentStatus.cancelled:
      print('用户取消');
      break;
  }
});
```

## 平台渠道配置

### iOS

在 `ios/Runner/Info.plist` 中添加：

```xml
<key>hydra_api_key</key>
<string>your_api_key</string>
```

### Android

无需额外配置。

## 调试模式

```dart
Hydra.setDebugMode(true);
```
