# 监控告警

本指南介绍 Hydra 服务的监控和告警配置。

## 监控指标

### 核心指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `http_requests_total` | HTTP 请求总数 | - |
| `http_request_duration_seconds` | 请求延迟 P99 | > 200ms |
| `http_requests_failed_total` | 失败请求数 | > 1% |
| `payment_orders_total` | 支付订单数 | - |
| `payment_success_rate` | 支付成功率 | < 95% |
| `channel_circuit_breaker` | 渠道熔断次数 | > 10/5min |

### 基础设施

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `cpu_usage_percent` | CPU 使用率 | > 80% |
| `memory_usage_percent` | 内存使用率 | > 85% |
| `disk_usage_percent` | 磁盘使用率 | > 80% |
| `postgres_connections` | 数据库连接数 | > 80% max |
| `redis_connections` | Redis 连接数 | > 80% max |

## Prometheus 指标

服务默认暴露 `/metrics` 端点：

```
http://localhost:8080/metrics
http://localhost:8081/metrics
```

### Prometheus 配置

```yaml
scrape_configs:
  - job_name: 'hydra-wall'
    static_configs:
      - targets: ['wall.hydra.com:8080']
    metrics_path: /metrics

  - job_name: 'hydra-pay'
    static_configs:
      - targets: ['pay.hydra.com:8081']
    metrics_path: /metrics
```

## Grafana Dashboard

导入预置 Dashboard：Grafana ID `12345`

### 关键面板

1. **请求 QPS**: 实时请求量
2. **延迟分布**: P50/P90/P99
3. **支付成功率**: 各渠道对比
4. **渠道熔断**: 熔断触发统计
5. **错误分布**: 按错误类型分组

## 告警规则

### Prometheus AlertManager

```yaml
groups:
  - name: hydra
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_failed_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical

      - alert: LowPaymentSuccessRate
        expr: payment_success_rate < 0.95
        for: 5m
        labels:
          severity: warning

      - alert: ChannelCircuitBreaker
        expr: increase(channel_circuit_breaker_total[5m]) > 10
        labels:
          severity: warning

      - alert: ServiceDown
        expr: up{job="hydra-wall"} == 0
        for: 1m
        labels:
          severity: critical
```

## 分布式追踪

集成 OpenTelemetry：

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

exporters:
  jaeger:
    endpoint: jaeger:4317
```
