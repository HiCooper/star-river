# 生产部署

本指南介绍如何在生产环境部署 Hydra 服务。

## 部署架构

```
                    ┌─────────────────────────────────────────┐
                    │               Load Balancer                │
                    │              (Nginx / ALB)                 │
                    └──────────────┬────────────────────────────┘
                                   │
               ┌───────────────────┼───────────────────┐
               │                   │                   │
        ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
        │ hydra-wall  │     │ hydra-pay   │     │ hydra-admin │
        │  (Go)       │     │  (Go)       │     │  (React)    │
        └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
               │                   │                   │
    ┌──────────┴──────────┐       │                   │
    │                     │       │                   │
┌───▼───┐           ┌─────▼───┐   │                   │
│ wall_db│           │  pay_db │   │                   │
│ (PG)   │           │  (PG)   │   │                   │
└───────┘           └─────────┘   │                   │
                                  │                   │
                        ┌─────────┴───────────────────┘
                        │
                 ┌──────▼──────┐
                 │ Redis Cluster│
                 │ (Session/    │
                 │  Cache/Queue)│
                 └─────────────┘
```

## Kubernetes 部署

### 前置要求

- Kubernetes 1.24+
- Helm 3.12+
- 持久化存储 (PV)

### 安装 Helm Charts

```bash
helm repo add hydra https://charts.hydra.com
helm repo update

helm install hydra-wall hydra/hydra-wall \
  --namespace hydra \
  --set replicaCount=3 \
  --set image.tag=v1.0.0

helm install hydra-pay hydra/hydra-pay \
  --namespace hydra \
  --set replicaCount=3 \
  --set image.tag=v1.0.0
```

### 配置

```yaml
# values.yaml
replicaCount: 3

image:
  repository: hydra-pay/hydra-wall
  tag: v1.0.0

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.hydra.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: hydra-api-tls
      hosts:
        - api.hydra.com
```

## Docker Compose 部署

适合中小规模部署：

```yaml
version: '3.8'

services:
  wall:
    image: hydra-pay/hydra-wall:v1.0.0
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://hydra:xxx@postgres:5432/wall
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  pay:
    image: hydra-pay/hydra-pay:v1.0.0
    ports:
      - "8081:8081"
    environment:
      - DATABASE_URL=postgres://hydra:xxx@postgres:5432/pay
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## 环境变量

### hydra-wall

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接 | `postgres://user:pass@host:5432/wall` |
| `REDIS_URL` | Redis 连接 | `redis://host:6379` |
| `API_KEY` | API 认证密钥 | `sk_live_xxxxx` |
| `LOG_LEVEL` | 日志级别 | `info` / `debug` |
| `PORT` | 服务端口 | `8080` |

### hydra-pay

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接 | `postgres://user:pass@host:5432/pay` |
| `REDIS_URL` | Redis 连接 | `redis://host:6379` |
| `API_KEY` | API 认证密钥 | `sk_live_xxxxx` |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | `sk_live_xxxxx` |
| `LOG_LEVEL` | 日志级别 | `info` / `debug` |
| `PORT` | 服务端口 | `8081` |

## 健康检查

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 高可用配置

### 数据库

- 主从复制
- 连接池 (PgBouncer)
- 定期备份

### Redis

- Redis Sentinel 或 Redis Cluster
- 故障自动转移

### 服务

- 多副本部署
- 滚动更新
- 优雅关闭

## 监控

部署后配置监控告警，详见 [监控告警](./monitoring)。
