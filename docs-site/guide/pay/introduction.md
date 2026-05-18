# Hydra-Pay 产品介绍

## 什么是 Hydra-Pay

Hydra-Pay 是一套自建的统一支付网关，类比 Stripe，旨在帮助开发者以极低研发成本接入多种支付渠道。

## 核心功能

### 1. 统一支付入口

一次接入，连接多种支付渠道：

| 渠道 | 类型 | 说明 |
|------|------|------|
| 支付宝 | 国内 | 扫码支付、App 支付、JSAPI |
| 微信支付 | 国内 | 扫码支付、JSAPI、小程序 |
| Stripe | 国际 | Checkout、Payment Intent |
| Apple IAP | IAP | iOS 应用内购买 |
| Google Billing | IAP | Android 应用内购买 |

### 2. 托管结算页面

提供完整的支付托管页面：

```typescript
// 一行代码跳转托管结算页
await hydra.pay.redirectToCheckout({
  paymentId: 'pay_xxxx',
  successUrl: 'https://myapp.com/success'
});
```

### 3. 智能路由

根据地区、金额、设备自动选择最优渠道：

```yaml
routing:
  default_channel: alipay
  rules:
    - region: ["CN"]
      channel: alipay
      priority: 100
    - region: ["US", "EU"]
      channel: stripe
      priority: 100
    - device: "apple"
      channel: apple_iap
      priority: 100
```

### 4. 熔断降级

渠道故障时自动切换到备用渠道：

```
Alipay 故障 → WeChat Pay → Stripe
```

### 5. 账务系统

完整的交易记录和对账功能：

- 订单管理
- 交易流水
- 对账清算
- 退款处理

### 6. Webhook 回调

统一处理各渠道的异步回调：

```typescript
// 服务端接收 Webhook
app.post('/webhooks/payment', async (req, res) => {
  const event = await hydra.pay.verifyWebhook(req);
  
  switch (event.type) {
    case 'payment.completed':
      // 处理支付成功
      break;
    case 'payment.refunded':
      // 处理退款
      break;
  }
});
```

## 接入模式

| 模式 | 说明 | 工作量 |
|------|------|--------|
| Full Hosted | 跳转托管结算页 | **5 分钟** |
| Embedded SDK | 支付表单嵌入 | 30 分钟 |
| API Only | 纯 API 调用 | 1 天+ |

## 下一步

- [支付渠道](/guide/pay/channels)
- [托管结算页](/guide/pay/hosted-checkout)
- [Hydra-Pay 技术架构](/dev/pay/service-architecture)
- [支付路由](/dev/pay/payment-router)
