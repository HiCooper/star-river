# 支付路由

支付路由（Payment Router）是 Hydra-Pay 的核心组件，负责将支付请求智能地路由到最优的支付渠道。

## 核心功能

1. **渠道选择**: 根据多维度因素选择最佳支付渠道
2. **故障转移**: 渠道故障时自动切换到备用渠道
3. **负载均衡**: 多渠道时合理分配请求量

## 路由策略

### 路由因素

| 因素 | 说明 |
|------|------|
| 渠道可用性 | 渠道是否正常服务 |
| 成功率 | 各渠道历史成功率 |
| 费率 | 各渠道交易手续费率 |
| 响应时间 | 各渠道平均处理时间 |
| 用户偏好 | 用户上次成功使用的渠道 |

### 权重计算

```
Score = w1 * availability + w2 * success_rate + w3 * (1 - fee_rate) + w4 * speed
```

默认权重：
- w1 = 0.3 (可用性)
- w2 = 0.3 (成功率)
- w3 = 0.2 (费率)
- w4 = 0.2 (速度)

### 渠道优先级

可以配置渠道优先级列表，优先使用高优先级渠道：

```yaml
channels:
  - stripe        # 高优先级
  - alipay        # 次优先级
  - wechat        # 备用
  - apple_iap     # 最后备用
```

## 熔断机制

### 熔断条件

当渠道错误率超过阈值时，自动熔断该渠道：

| 参数 | 默认值 |
|------|--------|
| 错误率阈值 | 20% |
| 时间窗口 | 5 分钟 |
| 熔断时长 | 5 分钟 |

### 恢复策略

熔断后按以下策略恢复：
1. 半开探测：放行少量请求试探渠道状态
2. 成功则逐步恢复流量（梯度放量）
3. 失败则继续熔断

## 路由流程

```
请求 → 检查本地缓存 → 权重计算 → 选择渠道 → 发送支付 → 结果处理
                              ↓
                        渠道熔断 → 选择下一渠道重试
```

### 重试机制

| 重试次数 | 触发条件 |
|---------|---------|
| 第1次重试 | 网络超时 |
| 第2次重试 | 渠道系统错误 |
| 第3次重试 | 渠道暂时不可用 |

## 配置管理

### 渠道配置

```json
{
  "channel_id": "stripe",
  "enabled": true,
  "priority": 1,
  "weight_config": {
    "availability": 0.3,
    "success_rate": 0.3,
    "fee_rate": 0.2,
    "speed": 0.2
  },
  "circuit_breaker": {
    "error_threshold": 20,
    "window_seconds": 300,
    "recover_seconds": 300
  },
  "retry": {
    "max_attempts": 3,
    "backoff_ms": [100, 500, 2000]
  }
}
```

### 灰度发布

支持按比例灰度新渠道：

```yaml
gradual_rollout:
  channel: "new_channel"
  percentage: 10  # 10% 流量使用新渠道
  max_percentage: 100
  increment_per_minute: 5
```

## 监控指标

| 指标 | 说明 |
|------|------|
| `router_requests_total` | 路由总请求数 |
| `router_channel_selected` | 各渠道被选择次数 |
| `router_retry_total` | 重试总次数 |
| `router_circuit_break` | 熔断触发次数 |
| `router_latency_ms` | 路由延迟分布 |
