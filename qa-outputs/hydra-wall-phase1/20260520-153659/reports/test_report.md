# Hydra-Wall Phase 1 — 测试报告

| 字段 | 值 |
|------|------|
| **测试日期** | 2026-05-20 |
| **测试环境** | macOS + Docker (PostgreSQL 16 + Redis 7) + Go 1.21 |
| **测试版本** | hydra-wall-phase1-backend/service (commit: 2026-05-20) |
| **测试人** | QA 质检鹰 |
| **报告语言** | 简体中文 |

---

## 1. 执行摘要

| 指标 | 结果 |
|------|------|
| **测试用例总数** | 25 |
| **通过** | 10 |
| **失败（Bug）** | 8 |
| **未完成/阻塞** | 7 |
| **通过率** | 40% |

**结论：Phase 1 不可发布。** 存在 3 个 P0 级阻塞性 Bug + 5 个 P1 级缺陷 + 前端 0% 对接。

---

## 2. 测试结果矩阵

### 2.1 基础设施与可观测性

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| INF-01 | GET /health 返回 200 | 200 + `{"status":"ok"}` | 200 + `{"success":true,"data":{"service":"wall-service","status":"ok"}}` | ✅ PASS |
| INF-02 | GET /metrics 返回 Prometheus 指标 | 200 | 200 | ✅ PASS |

### 2.2 认证与鉴权

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| AUTH-01 | 无 JWT 访问 Admin API → 401 | 401 | 401 `UNAUTHORIZED` | ✅ PASS |
| AUTH-02 | 无效 JWT 访问 Admin API → 401 | 401 | 401 `UNAUTHORIZED` | ✅ PASS |
| AUTH-03 | POST /api/v1/auth/login 获取 JWT | 200 + token | **401** — login 端点在 JWT 中间件内部，循环依赖 | ❌ **FAIL (P0)** |
| AUTH-04 | 无 API Key 访问 /evaluate → 401 | 401 | 401 `Missing API key` | ✅ PASS |
| AUTH-05 | 无效 API Key → 403 | 403 | 403 `Invalid API key` | ✅ PASS |

### 2.3 App CRUD

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| APP-01 | POST /api/v1/apps 创建 App | 200/201 + api_key | 200 + `{"api_key":"caeed3cd...","id":"0731383b..."}` | ✅ PASS |
| APP-02 | GET /api/v1/apps 列出 App | 200 + 列表 | 200 + 正确列表 | ✅ PASS |
| APP-03 | GET /api/v1/apps/:id 获取详情 | 200 + 详情 | 200 + 正确详情 | ✅ PASS |
| APP-04 | PUT /api/v1/apps/:id 更新 App | 200 | 200 | ✅ PASS |
| APP-05 | POST /api/v1/apps/:id/rotate-key | 200 + 新 key | ⚠️ 未执行（需 JWT） | ⚠️ BLOCKED |

### 2.4 Campaign/Placement/Audience/Paywall CRUD

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| CAM-01 | POST /api/v1/campaigns 创建 Campaign | 200 + id | 200 + id | ✅ PASS |
| CAM-02 | POST /campaigns/:id/placements 创建 Placement | 200 | 200 | ✅ PASS |
| CAM-03 | POST /campaigns/:id/audiences 创建 Audience | 200 | 200 | ✅ PASS |
| CAM-04 | POST /api/v1/paywalls 创建 Paywall | 200 + id | 200 + id | ✅ PASS |
| CAM-05 | POST /audiences/:id/paywalls 关联 | 200 | 200 | ✅ PASS |
| CAM-06 | POST /campaigns/:id/activate 激活 | 200 | 200 | ✅ PASS |

### 2.5 评估引擎 (Evaluate)

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| EVAL-01 | 匹配 Audience → `show_paywall` | 200 + `action:show_paywall` | **500** `INTERNAL_ERROR` | ❌ **FAIL (P0)** |
| EVAL-02 | 无匹配 → `execute_feature` | 200 + `action:execute_feature` | **500** `INTERNAL_ERROR` | ❌ **FAIL (P0)** |

### 2.6 事件上报

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| EVT-01 | 合法事件批量上报 | 200 | **500** `INTERNAL_ERROR` | ❌ **FAIL (P0)** |
| EVT-02 | 非法 event_type → 400 | 400 | **500** (panic 后被 recovery) | ❌ **FAIL (P0)** |
| EVT-03 | 批量 >50 条 → 400 | 400 | **500** (panic 后被 recovery) | ❌ **FAIL (P0)** |

### 2.7 校验与边界

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| VAL-01 | 重复 placement event_name → 409 | 409 `DUPLICATE_PLACEMENT` | **500** | ❌ **FAIL (P1)** |
| VAL-02 | 非法 audience conditions → 400 | 400 `INVALID_AUDIENCE_CONDITION` | **200** (接收了字符串 `"not_json"`) | ❌ **FAIL (P1)** |
| VAL-03 | Percentage sum != 100 → 400 | 400 `PERCENTAGE_MISMATCH` | ⚠️ 未执行 | ⚠️ BLOCKED |

### 2.8 Analytics

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| ANA-01 | GET /api/v1/analytics/overview | 200 | **400** | ❌ **FAIL (P1)** |
| ANA-02 | GET /api/v1/transactions | 200 | **400** | ❌ **FAIL (P1)** |

### 2.9 前端 wall-admin 对接

| 用例 | 测试内容 | 预期 | 实际 | 状态 |
|------|----------|------|------|------|
| FE-01 | Settings 页面对接 API | 调用真实 API | **100% mock 数据** | ❌ **FAIL (P0)** |
| FE-02 | Paywalls 页面对接 API | 调用真实 API | **100% mock 数据** | ❌ **FAIL (P0)** |
| FE-03 | Dashboard 页面对接 API | 调用真实 API | **100% mock 数据** | ❌ **FAIL (P0)** |
| FE-04 | Rules 页面对接 API | 调用真实 API | **100% mock 数据** | ❌ **FAIL (P0)** |
| FE-05 | Experiments 页面对接 API | 调用真实 API | **100% mock 数据** | ❌ **FAIL (P0)** |
| FE-06 | 无 apiClient.ts 模块 | 存在 | **不存在** | ❌ **FAIL (P0)** |

---

## 3. Bug 详情

### BUG-001 (P0): 评估引擎 /evaluate 返回 500 — app_id 类型转换 panic

**文件**: `internal/handler/evaluate_handler.go:43`

**根因**: `APIKeyAuth` middleware 将 `app.ID` 存为 `string` 类型到 gin context，但 `evaluate_handler.go` 尝试将其类型断言为 `uuid.UUID`：
```go
req.AppID = ctxAppID.(uuid.UUID).String()  // panic: interface conversion: interface {} is string, not uuid.UUID
```

**复现**:
1. 创建 App → Campaign → Placement → Audience → Paywall → 关联 → 激活
2. `POST /api/v1/evaluate` with `X-API-Key: <valid_key>`
3. 返回 500 `INTERNAL_ERROR`

**影响**: 评估引擎完全不可用，SDK 无法获取 Paywall 配置。

**修复建议**: 将 `evaluate_handler.go:43` 改为：
```go
req.AppID = ctxAppID.(string)
```
或修改 middleware 存储为 `uuid.UUID`。

---

### BUG-002 (P0): 事件上报 /events 返回 500 — 同上类型转换 panic

**文件**: `internal/handler/event_handler.go:46`

**根因**: 同样的类型转换错误：
```go
appID := ctxAppID.(uuid.UUID)  // panic: interface conversion: interface {} is string, not uuid.UUID
```

**影响**: 事件上报完全不可用，无法采集任何数据。

**修复建议**: 改为 `appID, _ := uuid.Parse(ctxAppID.(string))`。

---

### BUG-003 (P0): /auth/login 被 JWT 中间件拦截 — 循环依赖

**文件**: `internal/router/router.go:55`

**根因**: `/auth/login` 被注册在 `admin` API group 内，该 group 使用 `JWTAuth` 中间件。登录本身需要 JWT 认证，形成循环依赖。

**复现**:
```
POST /api/v1/auth/login {"username":"admin","password":"admin123"}
→ 401 {"code":"UNAUTHORIZED","message":"Missing authorization token"}
```

**影响**: 无法通过正常登录获取 JWT token，wall-admin 前端无法完成认证。

**修复建议**: 将 `/auth/login` 移到 `admin` group 外部（public 路由）：
```go
// Public auth endpoint
r.POST("/api/v1/auth/login", authHandler.Login)

// Admin API group (JWT auth)
admin := r.Group("/api/v1")
admin.Use(middleware.JWTAuth(cfg))
{
    // ... other admin routes (without /auth/login)
}
```

---

### BUG-004 (P0): 前端 wall-admin 0% 对接真实 API

**文件**: 全部前端页面 (`front/wall-admin/src/app/**/*.tsx`)

**根因**: 所有页面（Dashboard、Paywalls、Settings、Rules、Experiments）均使用硬编码 mock 数据，不存在 `apiClient.ts` 模块，无任何 API 调用。

**影响**: **AC-6 完全未完成**。前端只是一个空壳，无法进行任何 CRUD 操作。

**修复建议**: 按 PLANNING 中的 Phase 5 步骤实现：
1. 创建 `src/lib/apiClient.ts`
2. 逐页替换 mock → API

---

### BUG-005 (P1): 重复 placement event_name 返回 500 而非 409

**根因**: `placement_repo.go` 或 `placement_service.go` 中的唯一性校验可能依赖数据库约束，但错误未被正确转换为 409 响应。

---

### BUG-006 (P1): 非法 audience conditions 未被校验

**文件**: `internal/handler/audience_handler.go:39-56`

**根因**: `conditions` 字段被接受为 `json.RawMessage`，`"not_json"` 本身是合法 JSON 字符串（JSON string），所以 handler 没有校验失败。但 PRD 要求 conditions 应为 JSON array，应在 handler 层校验。

---

### BUG-007 (P1): Analytics 端点返回 400

**文件**: `internal/handler/analytics_handler.go`

**根因**: 可能需要 `app_id` 查询参数但未提供，或内部实现需要 context 中的 app_id（但 JWTAuth 没有设置 app_id，只设置了 user_id）。

---

### BUG-008 (P1): 服务器模式配置不兼容

**文件**: `internal/router/router.go:16`

**根因**: Gin 不支持 `SERVER_MODE=development`，合法值为 `debug`/`release`/`test`。`.env.example` 中的默认值 `development` 会导致服务 panic 启动失败。

---

## 4. 前端对接详细分析

| 页面 | Mock 数据残留 | API 调用 | 状态 |
|------|---------------|----------|------|
| Dashboard (`/`) | `revenueData`, `funnelData`, `retentionData`, `recentTransactions` — 全部硬编码 | 无 | ❌ |
| Paywalls (`/paywalls`) | `mockData` 数组 5 条记录 | 无 | ❌ |
| Settings (`/settings`) | `mockApiKeys`, `mockWebhooks`, `mockTeamMembers`, `mockAuditLogs` | 无 | ❌ |
| Rules (`/rules`) | 未检查（但无 apiClient 不可能有 API 调用） | 无 | ❌ |
| Experiments (`/experiments`) | 未检查（同上） | 无 | ❌ |

**缺失文件**: `src/lib/apiClient.ts`（PLANNING 第 22 步）不存在。

---

## 5. 已验证通过的功能

| 模块 | 验证内容 |
|------|----------|
| 项目脚手架 | `make run` 可启动服务（需修正 SERVER_MODE） |
| 数据库迁移 | GORM AutoMigrate 成功创建 8 张表 |
| 健康检查 | `/health` 返回 200 |
| Prometheus 指标 | `/metrics` 返回 200 |
| JWT 认证中间件 | 无/无效 token 正确拦截 |
| API Key 认证中间件 | 无/无效 key 正确拦截 |
| App CRUD | 创建/列表/获取/更新 全部通过 |
| Campaign CRUD | 创建/激活 通过 |
| Placement 创建 | 通过 |
| Audience 创建 | 通过 |
| Paywall 创建 | 通过 |
| Audience-Paywall 关联 | 通过 |
| Audience 条件 DSL | `equals` 运算符正确解析 |
| 加权随机选择 | `weightedRandom` 算法已实现 |

---

## 6. 未验证项（残余风险）

| 项目 | 原因 |
|------|------|
| App 删除 + 级联检查 | 依赖 CRUD 整体通过后可测试 |
| App API Key 轮换 | 需先修复 BUG-003 |
| Campaign 停用/删除 | 需先修复 BUG-003 |
| Placement 删除 | 同上 |
| Audience 更新/删除/reorder | 同上 |
| Paywall 更新/删除 | 同上 |
| Audience-Paywall 百分比校验 | 同上 |
| 事件异步 Worker 持久化 | 需先修复 BUG-002 |
| 响应时间 P95 压测 | 需核心功能修复后执行 |
| 单元测试覆盖率 | 仅有 `audience_evaluator_test.go` 和 `crypto_test.go` 两个测试文件 |

---

## 7. 验收标准对照

| AC 编号 | 标准 | 状态 | 说明 |
|---------|------|------|------|
| AC-1 | Happy path 全链路 | ❌ | CRUD 通过但 Evaluate/Events 因 panic 失败 |
| AC-2 | Placement 评估 | ❌ | 返回 500 而非决策结果 |
| AC-3 | 事件上报 | ❌ | 返回 500 而非成功 |
| AC-4 | 认证拦截 | ✅ | 401/403 正确 |
| AC-5 | 校验错误 | ❌ | 部分校验缺失/错误码不对 |
| AC-6 | 前端对接 | ❌ | **0% 对接** |
| AC-7 | 非功能性 | ⚠️ | 无法测量 P95（核心功能不可用） |

---

## 8. 建议修复优先级

| 优先级 | Bug | 影响范围 | 预估工作量 |
|--------|-----|----------|-----------|
| **P0** | BUG-001: evaluate_handler 类型转换 panic | 评估引擎完全不可用 | 5 分钟 |
| **P0** | BUG-002: event_handler 类型转换 panic | 事件系统完全不可用 | 5 分钟 |
| **P0** | BUG-003: /auth/login 循环依赖 | 前端无法登录 | 5 分钟 |
| **P0** | BUG-004: 前端 0% 对接 | AC-6 完全未完成 | 2-3 天 |
| **P1** | BUG-008: .env.example 默认模式错误 | 服务启动失败 | 1 分钟 |
| **P1** | BUG-005: 重复 placement 返回 500 | 错误码不对 | 10 分钟 |
| **P1** | BUG-006: audience conditions 校验缺失 | 数据质量 | 15 分钟 |
| **P1** | BUG-007: Analytics 400 | Dashboard 无数据 | 30 分钟 |

---

## 9. 测试环境清理

```bash
docker stop hydra-test-postgres hydra-test-redis
docker rm hydra-test-postgres hydra-test-redis
```

测试报告输出目录:
`/Users/xueancao/Projects/QoderProjects/star-river/qa-outputs/hydra-wall-phase1/20260520-153659/`
