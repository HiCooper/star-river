# 支付渠道

## 概述

Hydra-Pay 支持多种支付渠道，覆盖国内外主流支付方式。

## 渠道列表

### 国内渠道

| 渠道 | 代码 | 支付方式 | 说明 |
|------|------|----------|------|
| 支付宝 | `alipay` | 扫码支付、App 支付、JSAPI 支付 | 最主流的国内支付 |
| 微信支付 | `wechat` | 扫码支付、JSAPI 支付、小程序支付 | 微信生态内支付 |

### 国际渠道

| 渠道 | 代码 | 支付方式 | 说明 |
|------|------|----------|------|
| Stripe | `stripe` | Credit Card、Checkout | 支持全球主流卡种 |
| PayPal | `paypal` | PayPal 账户支付 | 国际化支付 |

### 应用内购买

| 渠道 | 代码 | 平台 | 说明 |
|------|------|------|------|
| Apple IAP | `apple_iap` | iOS | App Store 内购 |
| Google Billing | `google_billing` | Android | Google Play 内购 |

## 渠道特性对比

| 渠道 | 手续费 | 到账周期 | 适用场景 |
|------|--------|----------|----------|
| 支付宝 | 0.6% | 即时 | 国内用户 |
| 微信支付 | 0.6% | 即时 | 国内用户 |
| Stripe | 2.9% + $0.3 | 7 天 | 出海产品、国际用户 |
| Apple IAP | 15-30% | 月结 | iOS 内购 |
| Google Billing | 15-30% | 月结 | Android 内购 |

## 渠道选择建议

### 按地区

```
中国大陆用户 → 支付宝 / 微信支付
海外用户 → Stripe / PayPal
```

### 按平台

```
iOS 应用内购 → Apple IAP
Android 应用内购 → Google Billing
Web / 跨平台 → Stripe / PayPal
```

### 按金额

```
小额 (< 100元) → 支付宝/微信
大额 (> 100元) → Stripe (支持更安全的 3D Secure)
```

## SDK 使用

### 指定支付渠道

```typescript
// 创建支付时指定渠道
const payment = await hydra.pay.createPayment({
  amount: 9900,
  currency: 'CNY',
  channel: 'alipay',  // 指定支付宝
  productId: 'premium_monthly'
});

// 获取支付跳转链接
await hydra.pay.redirectToCheckout({ paymentId: payment.paymentId });
```

### 智能路由（自动选择）

```typescript
// 不指定 channel，使用智能路由
const payment = await hydra.pay.createPayment({
  amount: 9900,
  currency: 'CNY',
  // 不指定 channel，根据用户地区自动选择
  productId: 'premium_monthly'
});
```

## 渠道配置

每个渠道需要在管理后台配置：

```typescript
interface ChannelConfig {
  channel: string;
  enabled: boolean;
  merchantId: string;      // 商户号
  appId: string;           // 应用 ID
  privateKey?: string;     // 私钥（敏感）
  publicKey?: string;      // 公钥
  callbackUrl: string;      // 回调地址
}
```

## 注意事项

1. **支付宝/微信需要商户资质** - 需要企业认证
2. **Stripe 需要海外账户** - 需要支持美元结算
3. **Apple/Google IAP 有强制抽成** - 30%（中小开发者）

## 下一步

- [托管结算页](/guide/pay/hosted-checkout)
- [支付路由设计](/dev/pay/payment-router)
