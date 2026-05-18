# 服务访问入口

本文档列出 Hydra 各服务的访问地址和环境配置。

## 环境说明

| 环境 | 用途 | API Base URL |
|------|------|-------------|
| 开发环境 | 本地开发 | `http://localhost:8080/8081` |
| 测试环境 | QA 测试 | `https://api-staging.hydra.com` |
| 生产环境 | 正式服务 | `https://api.hydra.com` |

## hydra-wall

| 环境 | 地址 |
|------|------|
| 测试环境 | `https://wall-staging.hydra.com` |
| 生产环境 | `https://wall.hydra.com` |

### 本地开发

- 服务端口: `8080`
- 健康检查: `http://localhost:8080/health`
- Metrics: `http://localhost:8080/metrics`

## hydra-pay

| 环境 | 地址 |
|------|------|
| 测试环境 | `https://pay-staging.hydra.com` |
| 生产环境 | `https://pay.hydra.com` |

### 本地开发

- 服务端口: `8081`
- 健康检查: `http://localhost:8081/health`
- Metrics: `http://localhost:8081/metrics`

## 管理后台

| 环境 | 地址 |
|------|------|
| 测试环境 | `https://console-staging.hydra.com` |
| 生产环境 | `https://console.hydra.com` |

## 文档站点

| 环境 | 地址 |
|------|------|
| 测试环境 | `https://docs-staging.hydra.com` |
| 生产环境 | `https://docs.hydra.com` |

## Webhook 回调地址

商户需要提供公网可访问的回调地址：

| 环境 | 说明 |
|------|------|
| 测试环境 | 商户配置的 notify_url |
| 生产环境 | 商户配置的 notify_url |

回调 URL 需要是 HTTPS。

## 内部服务 (开发环境 Docker)

| 服务 | 容器名 | 端口 | 访问地址 |
|------|--------|------|---------|
| wall-db | hydra-wall-postgres | 5432 | `localhost:5432` |
| pay-db | hydra-pay-postgres | 5433 | `localhost:5433` |
| Redis | hydra-redis | 6379 | `localhost:6379` |
| Admin API | hydra-admin | 3000 | `http://localhost:3000` |
