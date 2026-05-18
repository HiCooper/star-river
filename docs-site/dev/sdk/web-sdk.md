# Web SDK

Web SDK 帮助在 Web 应用中集成 Hydra 付费墙和支付功能。

## 支持环境

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 安装

### npm

```bash
npm install @hydra/web-sdk
```

### script 引入

```html
<script src="https://cdn.hydra.com/sdk/web-sdk@1.0.0.js"></script>
```

## 初始化

```javascript
import Hydra from '@hydra/web-sdk';

Hydra.init({
    apiKey: 'your_api_key',
    appId: 'your_app_id'
});
```

## 付费墙功能

### 获取付费墙配置

```javascript
const config = await Hydra.Wall.getConfig({
    userId: 'user_123',
    deviceType: 'web',
    pageType: 'article'
});

if (config.shouldShow) {
    Hydra.Wall.presentPaywall(config);
}
```

### 上报事件

```javascript
await Hydra.Events.track('page_view', {
    page_type: 'article',
    page_id: 'article_789'
});
```

### 查询订阅状态

```javascript
const entitlement = await Hydra.Wall.getEntitlement('user_123');
if (entitlement.isSubscribed) {
    // 用户已订阅
}
```

## 支付功能

### 发起支付

```javascript
const result = await Hydra.Pay.createOrder({
    amount: 9900,
    currency: 'CNY',
    productId: 'premium_monthly',
    productName: 'Premium 月度订阅',
    channel: ['alipay', 'wechat', 'stripe']
});

if (result.payUrl) {
    window.location.href = result.payUrl;
}
```

### 监听支付结果

```javascript
Hydra.Pay.onPaymentResult((result) => {
    switch (result.status) {
        case 'success':
            console.log('支付成功');
            break;
        case 'failed':
            console.log('支付失败');
            break;
        case 'cancelled':
            console.log('用户取消');
            break;
    }
});
```

## React 集成示例

```jsx
import { useEffect, useState } from 'react';
import Hydra from '@hydra/web-sdk';

function PaywallComponent({ userId }) {
    const [config, setConfig] = useState(null);

    useEffect(() => {
        Hydra.Wall.getConfig({ userId, deviceType: 'web', pageType: 'article' })
            .then(setConfig);
    }, [userId]);

    if (!config?.shouldShow) return null;

    return (
        <div className="paywall">
            <h2>{config.config.title}</h2>
            <button onClick={() => Hydra.Wall.presentPaywall(config)}>
                {config.config.ctaText}
            </button>
        </div>
    );
}
```

## Stripe 支付元素

Web SDK 支持 Stripe Payment Element：

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
```
