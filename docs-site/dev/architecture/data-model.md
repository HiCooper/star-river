# 数据模型

## 概述

Hydra 使用两个独立的 PostgreSQL 数据库：
- `wall_db` - Hydra-Wall 数据库
- `pay_db` - Hydra-Pay 数据库

## Hydra-Wall 数据模型 (wall_db)

### apps 应用表

```sql
CREATE TABLE apps (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(32) NOT NULL,  -- ios/android/web
    api_key VARCHAR(128) UNIQUE NOT NULL,
    secret_key VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### plans 商品计划表

```sql
CREATE TABLE plans (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL,              -- 单位: 分
    currency VARCHAR(3) DEFAULT 'CNY',
    interval VARCHAR(32) NOT NULL,    -- monthly/yearly/lifetime
    trial_days INT DEFAULT 0,
    product_id VARCHAR(64),         -- 关联 Hydra-Pay product_id
    features JSONB DEFAULT '[]',
    sort_order INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### entitlements 用户权限表

```sql
CREATE TABLE entitlements (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    status VARCHAR(32) NOT NULL,             -- active/expired/cancelled/trial
    trial_end TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, app_id, plan_id)
);
```

### paywall_configs 付费墙配置表

```sql
CREATE TABLE paywall_configs (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    template VARCHAR(32) DEFAULT 'standard',  -- standard/minimal/feature_list
    layout JSONB DEFAULT '{}',
    theme JSONB DEFAULT '{}',
    rules JSONB DEFAULT '[]',
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### experiments 实验表

```sql
CREATE TABLE experiments (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) DEFAULT 'draft',  -- draft/running/paused/completed
    variants JSONB NOT NULL,
    metrics JSONB NOT NULL,
    targeting JSONB DEFAULT '[]',
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_events 用户事件表

```sql
CREATE TABLE user_events (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    event_type VARCHAR(64) NOT NULL,
    event_name VARCHAR(128),
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Hydra-Pay 数据模型 (pay_db)

### 商户订单号 (TradeNo) 格式

hydra-pay 生成 22 位纯数字交易号，同时用作渠道下单的 `out_trade_no`：

```
{YYYYMMDD}{channel2位}{HHmmss}{随机6位}

渠道编码: 00=支付宝, 01=微信, 02=Stripe
示例: 2024052400143520123456 (支付宝)
```

### apps 应用表

```sql
CREATE TABLE apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(128) UNIQUE NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    alipay_pid VARCHAR(64),
    wechat_sub_mchid VARCHAR(64),
    wechat_sub_appid VARCHAR(64),
    webhook_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### payments 支付订单表

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_no VARCHAR(32) UNIQUE NOT NULL,       -- hydra-pay 22位交易号
    app_id UUID NOT NULL REFERENCES apps(id),
    user_id VARCHAR(255) NOT NULL,
    plan_id VARCHAR(255),
    amount BIGINT NOT NULL,                     -- 单位: 分
    currency VARCHAR(10) DEFAULT 'CNY',
    channel VARCHAR(50) NOT NULL,               -- alipay / wechat
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / processing / paid / failed / cancelled / refunded
    external_id VARCHAR(255),                   -- 渠道交易号（支付宝 trade_no / 微信 transaction_id）
    description VARCHAR(500),
    success_url VARCHAR(500),
    cancel_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_payments_app ON payments(app_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_trade_no ON payments(trade_no);
CREATE INDEX idx_payments_external ON payments(external_id);
```

### payment_events 事件时间线表

所有关键操作的事件记录，只追加不修改：

```sql
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    type VARCHAR(50) NOT NULL,          -- created / channel_request / status_changed / webhook_sent
    channel VARCHAR(50),
    raw_body TEXT,                      -- 原始数据
    result JSONB,                       -- 解析结果
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_payment ON payment_events(payment_id);
CREATE INDEX idx_events_type ON payment_events(type);
```

事件类型：
| 事件类型 | 触发时机 | 说明 |
|---------|---------|------|
| `created` | 订单创建 | |
| `channel_request` | 渠道 API 响应 | 渠道返回的原始数据 |
| `status_changed` | 状态变更 | from → to |
| `webhook_sent` | Webhook 推送 | payload + 重试结果 |

### alipay_callbacks 支付宝回调表

支付宝异步通知的全部参数，`notify_id` 唯一索引保证排重：

```sql
CREATE TABLE alipay_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    -- 通知标识
    notify_id VARCHAR(128) UNIQUE NOT NULL,
    notify_type VARCHAR(64),
    notify_time VARCHAR(32),
    sign_type VARCHAR(16),
    -- 交易
    trade_no VARCHAR(64),               -- 支付宝交易号
    out_trade_no VARCHAR(64),           -- 商户订单号 = TradeNo
    trade_status VARCHAR(32),           -- TRADE_SUCCESS / WAIT_BUYER_PAY / ...
    subject VARCHAR(256),
    total_amount VARCHAR(16),           -- 金额（元，字符串）
    receipt_amount VARCHAR(16),
    buyer_pay_amount VARCHAR(16),
    point_amount VARCHAR(16),
    invoice_amount VARCHAR(16),
    -- 买家
    buyer_id VARCHAR(64),
    buyer_logon_id VARCHAR(128),
    -- 时间
    gmt_create VARCHAR(32),
    gmt_payment VARCHAR(32),
    gmt_close VARCHAR(32),
    -- 嵌套
    fund_bill_list JSONB,
    voucher_detail_list JSONB,
    passback_params VARCHAR(512),
    -- 原始报文
    raw_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alipay_cb_payment ON alipay_callbacks(payment_id);
CREATE INDEX idx_alipay_cb_trade_no ON alipay_callbacks(trade_no);
CREATE INDEX idx_alipay_cb_out_trade ON alipay_callbacks(out_trade_no);
CREATE INDEX idx_alipay_cb_buyer ON alipay_callbacks(buyer_id);
```

### wechat_callbacks 微信回调表

微信 V3 回调解密后的全部字段，`notification_id` 唯一索引保证排重：

```sql
CREATE TABLE wechat_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    -- 通知标识
    notification_id VARCHAR(64) UNIQUE NOT NULL,
    event_type VARCHAR(64),             -- TRANSACTION.SUCCESS
    -- 交易
    transaction_id VARCHAR(64),         -- 微信支付交易号
    out_trade_no VARCHAR(64),           -- 商户订单号 = TradeNo
    trade_type VARCHAR(16),             -- NATIVE / JSAPI / APP
    trade_state VARCHAR(32),            -- SUCCESS / NOTPAY / CLOSED / ...
    trade_state_desc VARCHAR(256),
    -- 金额（分，int64）
    amount_total BIGINT,
    amount_payer_total BIGINT,
    amount_currency VARCHAR(10),
    amount_payer_currency VARCHAR(10),
    -- 支付者
    payer_openid VARCHAR(64),
    -- 商户
    mchid VARCHAR(32),
    appid VARCHAR(32),
    attach VARCHAR(256),
    -- 服务商
    sp_mchid VARCHAR(32),
    sp_appid VARCHAR(32),
    sub_mchid VARCHAR(32),
    sub_appid VARCHAR(32),
    -- 其他
    bank_type VARCHAR(16),
    success_time VARCHAR(32),
    promotion_detail JSONB,
    -- 原始报文
    raw_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wechat_cb_payment ON wechat_callbacks(payment_id);
CREATE INDEX idx_wechat_cb_transaction ON wechat_callbacks(transaction_id);
CREATE INDEX idx_wechat_cb_out_trade ON wechat_callbacks(out_trade_no);
CREATE INDEX idx_wechat_cb_payer ON wechat_callbacks(payer_openid);
CREATE INDEX idx_wechat_cb_sp_mch ON wechat_callbacks(sp_mchid);
CREATE INDEX idx_wechat_cb_sub_mch ON wechat_callbacks(sub_mchid);
```

## 索引设计

### Hydra-Wall 索引

```sql
CREATE INDEX idx_entitlements_user_app ON entitlements(user_id, app_id);
CREATE INDEX idx_entitlements_expires ON entitlements(expires_at) WHERE status = 'active';
CREATE INDEX idx_user_events_user_app ON user_events(user_id, app_id);
CREATE INDEX idx_user_events_type ON user_events(event_type, event_name);
CREATE INDEX idx_plans_app ON plans(app_id);
```

### Hydra-Pay 索引

```sql
-- payments
CREATE INDEX idx_payments_app ON payments(app_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_trade_no ON payments(trade_no);
CREATE INDEX idx_payments_external ON payments(external_id);

-- payment_events
CREATE INDEX idx_events_payment ON payment_events(payment_id);
CREATE INDEX idx_events_type ON payment_events(type);

-- alipay_callbacks
CREATE INDEX idx_alipay_cb_payment ON alipay_callbacks(payment_id);
CREATE INDEX idx_alipay_cb_trade_no ON alipay_callbacks(trade_no);
CREATE INDEX idx_alipay_cb_buyer ON alipay_callbacks(buyer_id);

-- wechat_callbacks
CREATE INDEX idx_wechat_cb_payment ON wechat_callbacks(payment_id);
CREATE INDEX idx_wechat_cb_transaction ON wechat_callbacks(transaction_id);
CREATE INDEX idx_wechat_cb_payer ON wechat_callbacks(payer_openid);
CREATE INDEX idx_wechat_cb_sp_mch ON wechat_callbacks(sp_mchid);
CREATE INDEX idx_wechat_cb_sub_mch ON wechat_callbacks(sub_mchid);
```

## Redis 缓存设计

### Hydra-Wall 缓存

```
# 用户权限缓存 (TTL: 5分钟)
wall:entitlement:{app_id}:{user_id} -> EntitlementStatus JSON

# 付费墙配置缓存 (TTL: 5分钟)
wall:paywall:{app_id}:{paywall_id} -> PaywallConfig JSON

# 实验分配缓存 (TTL: 24小时)
wall:experiment:{exp_id}:{user_id} -> VariantID
```

### Hydra-Pay 缓存

```
# 订单状态缓存 (TTL: 1小时)
pay:payment:{trade_no} -> Payment JSON
```

## 下一步

- [Hydra-Wall 服务架构](/dev/wall/service-architecture)
- [Hydra-Pay 服务架构](/dev/pay/service-architecture)
