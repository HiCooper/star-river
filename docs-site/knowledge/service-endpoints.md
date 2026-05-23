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

- 服务端口: `8082`
- 健康检查: `http://localhost:8082/health`

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

## 内部服务 (开发环境)

| 服务 | 容器名 | 端口 | 访问地址 |
|------|--------|------|---------|
| PostgreSQL | postgres | 5432 | `localhost:5432` |
| Redis | redis | 6379 | `localhost:6379` |
| Wall API | - | 8080 | `http://localhost:8080` |
| Pay API | - | 8082 | `http://localhost:8082` |
| Admin UI | - | 3000 | `http://localhost:3000` |

::: tip 数据库
wall-service 和 pay-service 共用同一个 PostgreSQL 实例，分别使用 `wall_db` 和 `hydra_pay` 两个 database。中间件由项目根目录的 `docker-compose.infra.yml` 统一管理。
:::
