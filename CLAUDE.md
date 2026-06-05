# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Star-River (星河) is an open-source payment infrastructure — a payment gateway + smart paywall engine.

```
star-river/
├── hydra-pay/          ← git submodule: unified payment gateway (Go + React)
├── hydra-wall/         ← git submodule: smart paywall engine (Go + Next.js)
├── docs-site/          ← VitePress documentation (50+ pages, zh-CN)
├── docker-compose.infra.yml  ← PostgreSQL 16 + Redis 7
└── docker/
```

**Key fact:** `hydra-pay` and `hydra-wall` are git submodules and may be empty (`git submodule update --init` to populate). A separate `sentinel` project (AI observability) was split out to its own repository at `../sentinel/`.

## Build & run commands

### Infrastructure

```bash
docker compose -f docker-compose.infra.yml up -d   # PostgreSQL 16 + Redis 7
```

### Hydra-Pay (payment gateway)

```bash
cd hydra-pay/service
cp .env.example .env
go run cmd/server/main.go

# Frontend
cd hydra-pay/admin && npm install && npm run dev     # Admin SPA (React + Ant Design)
cd hydra-pay/portal && npm install && npm run dev    # Merchant portal (React)
```

```bash
# Build, test, lint
cd hydra-pay/service && go build ./cmd/server && go test ./... -short -count=1 -race
```

### Hydra-Wall (smart paywall engine)

```bash
cd hydra-wall/service
cp .env.example .env
go run cmd/server/main.go

cd hydra-wall/front/wall-admin && npm install && npm run dev   # Admin (Next.js 16)
```

### Docs site

```bash
cd docs-site && npm install && npm run dev      # VitePress dev server (:5173)
cd docs-site && npm run build                    # Production build
```

## Architecture

### Hydra-Pay — payment gateway

Multi-channel payment gateway with unified API. Channels: Alipay (sandbox verified), WeChat Pay V3, UnionPay, e-CNY.

- **Backend:** Go · Gin · GORM · PostgreSQL 16
- **Frontends:** Admin SPA (React 18 + Vite + Ant Design), Merchant portal (React)
- **SDKs:** Go server SDK, JS/TS server SDK, embedded checkout SDK (`hydra-pay.js`)
- **Key concepts:** Channel adapters, service-provider merchant onboarding, HMAC-signed webhooks, idempotency, subscription management

### Hydra-Wall — smart paywall engine

Condition-based paywall rendering engine with audience targeting and A/B testing.

- **Backend:** Go · Gin · GORM · PostgreSQL 16 · Redis 7
- **Frontend:** Admin (Next.js 16 + React 19 + Ant Design), user-facing paywall renderer
- **Key concepts:** Condition DSL, behavioral targeting, A/B test configuration, event system

### Docs site (`docs-site/`)

VitePress site with Mermaid diagrams, deployed to GitHub Pages. Sidebar: 产品指南, 技术文档, 内部知识, 分析报告. Content in Chinese (zh-CN). Served at `/star-river/` base path.

## Key conventions

- **Go module path:** depends on submodule (check `go.mod` in each service)
- **Go version:** 1.21+ (hydra-pay), 1.23 (hydra-wall)
- **Config:** env-vars via `.env` files. Copy `.env.example` → `.env`
- **Database:** GORM AutoMigrate on startup
- **Ports:** hydra-pay service :8080, hydra-wall service :8081, docs :5173
- **Commit style:** Conventional Commits
- **CI:** GitHub Actions — `hydra-pay-ci.yml` (Go lint/test/build/docker, SDK tests), `deploy-docs.yml` (VitePress → GitHub Pages)
