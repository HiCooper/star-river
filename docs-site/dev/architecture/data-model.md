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

### apps 应用表

```sql
CREATE TABLE apps (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(128) UNIQUE NOT NULL,
    secret_key VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### orders 订单表

```sql
CREATE TABLE orders (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    user_id VARCHAR(64) NOT NULL,
    amount INT NOT NULL,                     -- 单位: 分
    currency VARCHAR(3) DEFAULT 'CNY',
    channel VARCHAR(32) NOT NULL,            -- alipay/wechat/stripe/apple_iap
    status VARCHAR(32) NOT NULL DEFAULT 'pending',  -- pending/paid/failed/refunded
    product_id VARCHAR(64),
    product_name VARCHAR(255),
    paywall_session_id VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP,                    -- 订单过期时间
    paid_at TIMESTAMP,                      -- 支付时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### transactions 交易流水表

```sql
CREATE TABLE transactions (
    id VARCHAR(32) PRIMARY KEY,
    order_id VARCHAR(32) NOT NULL REFERENCES orders(id),
    channel VARCHAR(32) NOT NULL,
    channel_transaction_id VARCHAR(128),    -- 渠道流水号
    amount INT NOT NULL,
    fee INT DEFAULT 0,                      -- 手续费
    net_amount INT,                         -- 净收入
    currency VARCHAR(3) DEFAULT 'CNY',
    type VARCHAR(32) NOT NULL DEFAULT 'payment',  -- payment/refund
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### refunds 退款表

```sql
CREATE TABLE refunds (
    id VARCHAR(32) PRIMARY KEY,
    order_id VARCHAR(32) NOT NULL REFERENCES orders(id),
    transaction_id VARCHAR(32) NOT NULL REFERENCES transactions(id),
    amount INT NOT NULL,
    reason VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',  -- pending/processed/failed
    channel_refund_id VARCHAR(128),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### channel_configs 渠道配置表

```sql
CREATE TABLE channel_configs (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    channel VARCHAR(32) NOT NULL,            -- alipay/wechat/stripe
    config JSONB NOT NULL,                   -- 渠道配置加密存储
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(app_id, channel)
);
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
CREATE INDEX idx_orders_app_user ON orders(app_id, user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_expires ON orders(expires_at) WHERE status = 'pending';
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_channel ON transactions(channel, channel_transaction_id);
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
pay:order:{order_id} -> Order JSON

# 渠道状态缓存 (TTL: 30秒)
pay:channel:status:{channel} -> "healthy" | "degraded" | "down"

# 支付中订单 (防重复) (TTL: 30分钟)
pay:pending:{app_id}:{user_id}:{product_id} -> order_id
```

## 下一步

- [Hydra-Wall 服务架构](/dev/wall/service-architecture)
- [Hydra-Pay 服务架构](/dev/pay/service-architecture)
