# SDK 概览

Hydra 提供多端 SDK，帮助开发者快速集成付费墙和支付功能。

## 支持平台

| SDK | 平台 | 说明 |
|-----|------|------|
| [iOS SDK](./ios-sdk) | iOS 14+ | Swift，原生支持 SwiftUI/UIKit |
| [Android SDK](./android-sdk) | Android 5.0+ | Kotlin，支持 Jetpack Compose |
| [Web SDK](./web-sdk) | 主流浏览器 | JavaScript，支持 React/Vue |
| [Flutter SDK](./flutter-sdk) | iOS/Android | Dart，跨平台 |

## 核心功能

### Hydra-Wall SDK

- 获取付费墙配置
- 上报用户行为事件
- 查询用户订阅状态
- 展示/隐藏付费墙

### Hydra-Pay SDK

- 获取支付渠道
- 发起支付
- 查询订单状态
- 接收支付结果回调

## 安装

### iOS (Swift Package Manager)

```swift
dependencies: [
    .package(url: "https://github.com/hydra-pay/ios-sdk.git", from: "1.0.0")
]
```

### Android (Gradle)

```kotlin
implementation("com.hydra:android-sdk:1.0.0")
```

### Web (npm)

```bash
npm install @hydra/web-sdk
```

### Flutter (pub.dev)

```yaml
dependencies:
  hydra_sdk: ^1.0.0
```

## 快速开始

1. 在 [Hydra Console](https://console.hydra.com) 获取 API Key
2. 初始化 SDK
3. 调用相应功能

详见各平台文档。

## 版本兼容性

| SDK 版本 | 支持的应用 |
|---------|-----------|
| 2.x | 新功能，建议升级 |
| 1.x | 维护中 |

建议保持使用最新版本 SDK。
