# PRD: Hydra-Wall Phase 1 — 后端基础设施与核心 API

| 字段 | 值 |
|------|------|
| **版本** | v1.0 |
| **状态** | 待评审 |
| **目标用户** | 开发团队（后端 2 人 + 前端 2 人 + 移动端 1 人） |
| **优先级** | P0 — MVP 阻塞项 |
| **对应里程碑** | M1 基础设施 + M2 核心服务 (Week 1-5) |
| **决策人** | 产品负责人 |

---

## 1. Summary

Hydra 项目当前处于**设计 + 前端原型阶段**：wall-admin 管理后台和 wall-frontend 付费墙页面 UI 已搭建完成，但全部使用硬编码 mock 数据；wall-service 和 wall-pay 两个 Go 后端服务**零代码量**。

本 PRD 定义 Phase 1 的核心目标：**从 0 到 1 搭建 wall-service 后端基础设施，实现核心 CRUD API，使前端从 mock 数据切换为真实后端调用**，为后续付费墙引擎、SDK 集成和数据分析奠定基础。

---

## 2. Background and Evidence

### 当前状态

| 组件 | 状态 | 证据 |
|------|------|------|
| wall-admin UI | 完成（mock） | Dashboard / Paywall / Plan / Experiment / Targeting / Settings 页面均有 UI |
| wall-frontend UI | 完成（mock） | 3 种付费墙模板（Standard / Minimal / FeatureList） |
| wall-service 后端 | 未开始 | 仓库中无任何 `.go` 文件 |
| pay-service 后端 | 未开始 | 仅有 ARCHITECTURE.md 设计文档 |
| 数据库 | Schema 已设计 | DEVELOPMENT_PLAN.md 中有 DDL |
| 客户端 SDK | 未开始 | iOS/Android/Web SDK 接口已定义 |
| CI/CD | 未搭建 | 无 GitHub Actions 配置 |

### 痛点

1. **前后端断层** — 前端是"空壳"，无法展示真实业务流程
2. **无法验证架构设计** — 1200+ 行架构文档未经代码验证
3. **SDK 开发阻塞** — 客户端 SDK 依赖后端 API 联调
4. **交付风险累积** — 12 周计划的时间线已开始消耗

### 期望结果

- wall-service 可独立部署，提供完整 RESTful API
- wall-admin 前端对接真实 API，数据可持久化
- 为 Phase 2（付费墙引擎 + SDK）提供稳定的接口契约

---

## 3. Goal and Success Criteria

### 目标

在 **5 周内** 完成 wall-service 后端从 0 到 1 的搭建，覆盖 App 管理、Campaign/Placement/Audience/Paywall 全链路 CRUD，以及事件上报与基础分析能力。

### 成功标准

| 指标 | 目标值 | 验证方式 |
|------|--------|----------|
| API 覆盖率 | 核心 CRUD 100% 实现 | Postman/Swagger 测试 |
| 前端对接率 | wall-admin 所有页面脱离 mock | 端到端手动测试 |
| API 响应时间 | P95 < 200ms（简单查询） | 压测报告 |
| 单元测试覆盖 | > 70% | `go test -cover` |
| 数据库迁移 | Schema 全部 DDL 落地 | psql 验证 |

---

## 4. Users and Scenarios

### 目标用户

| 用户角色 | 说明 |
|----------|------|
| 应用开发者（外部） | 集成 Hydra SDK 的 App 开发者，通过 API 管理付费墙 |
| 运营人员 | 通过 wall-admin 管理 Campaign、Audience、Paywall 配置 |
| 开发团队（内部） | 后端/API 消费者（SDK、前端） |

### 核心场景

| 场景编号 | 场景描述 | 用户角色 |
|----------|----------|----------|
| S1 | 创建新 App，获取 API Key | 应用开发者 |
| S2 | 创建 Campaign，绑定 Placement | 运营人员 |
| S3 | 配置 Audience 规则，关联 Paywall | 运营人员 |
| S4 | 创建/编辑 Paywall，选择模板 | 运营人员 |
| S5 | SDK 调用 Placement 评估，获取 Paywall 配置 | 客户端 SDK |
| S6 | 上报付费墙展示/点击/购买事件 | 客户端 SDK |
| S7 | 查看 Dashboard 数据概览 | 运营人员 |

---

## 5. Scope

### In Scope

| 模块 | 交付内容 | 优先级 |
|------|----------|--------|
| **项目脚手架** | Go + Gin 项目结构、Makefile、Dockerfile | P0 |
| **数据库层** | PostgreSQL 连接、GORM ORM、DDL 迁移脚本 | P0 |
| **认证中间件** | API Key 鉴权、JWT Token | P0 |
| **错误处理** | 统一错误码、错误响应格式 | P0 |
| **App API** | App CRUD + API Key 生成 | P0 |
| **Campaign API** | Campaign CRUD + 状态切换 | P0 |
| **Placement API** | Placement 绑定到 Campaign | P0 |
| **Audience API** | Audience CRUD + 条件过滤器 | P0 |
| **Paywall API** | Paywall CRUD + 模板配置 | P0 |
| **事件上报 API** | 展示/点击/购买事件异步写入 | P0 |
| **Transaction 记录** | 交易记录写入 + 查询 | P0 |
| **基础 Analytics** | MRR/ARR/转化率聚合查询 | P1 |
| **Redis 缓存** | Paywall 配置缓存、热点数据 | P1 |
| **前端对接** | wall-admin 全部页面对接真实 API | P0 |

### Out of Scope

| 模块 | 原因 |
|------|------|
| A/B 实验统计引擎 | 数学复杂度高，v2.0 实现 |
| 付费墙可视化编辑器 | 前端复杂度高，当前已有静态模板 |
| Hydra-Pay 集成 | 依赖 pay-service，Phase 2 推进 |
| 客户端 SDK 开发 | 需要 API 契约稳定后启动 |
| CI/CD 自动化部署 | Phase 2 完善 |
| 多租户 / 团队管理 | MVP 后需求 |

### Non-Goals

- 不做支付处理（这是 Hydra-Pay 的职责）
- 不做复杂数据分析（MVP 阶段只有基础聚合）
- 不做实时推荐或 AI 功能
- 不做移动端 SDK（Phase 4）

### Dependencies

| 依赖项 | 状态 | 风险 |
|--------|------|------|
| PostgreSQL 实例 | 需要部署 | 中 — 可用 Docker 快速启动 |
| Redis 实例 | 需要部署 | 低 — Docker 即可 |
| Hydra-Pay 商品同步 | Phase 2 | 低 — MVP 阶段可 mock |

### Assumptions

1. 团队有 2 名后端开发可投入 Phase 1
2. PostgreSQL + Redis 可通过 Docker Compose 本地启动
3. wall-admin 前端代码已就绪，仅需替换 mock 为 API 调用
4. API 设计遵循 RESTful 规范，版本前缀 `/api/v1`

---

## 6. Non-Goals

明确以下功能**不在本阶段实现**，避免范围蔓延：

- **A/B Testing 统计推断**（p-value、置信区间计算）
- **付费墙拖拽编辑器**（仅支持模板选择 + JSON 配置）
- **支付渠道对接**（Alipay/WeChat Pay/Stripe 接入属于 Hydra-Pay）
- **Webhook 推送**（Phase 2 实现）
- **多语言/国际化**（v3.0 规划）
- **权限分级**（RBAC，MVP 后实现）

---

## 7. User Flow

### 7.1 App 创建与 API Key 获取

```
开发者 → wall-admin → 创建 App → 系统生成 API Key → 展示 Key（仅一次）
```

1. 用户在 wall-admin Settings 页面点击 "Create App"
2. 填写 App 名称、平台（iOS/Android/Web）
3. 后端生成唯一 `api_key`，写入数据库
4. 前端展示 API Key（提示用户保存，不再显示）

### 7.2 Campaign → Placement → Audience → Paywall 配置链路

```
运营人员 → wall-admin → 创建 Campaign
  → 添加 Placement（绑定事件名）
  → 添加 Audience（设置条件规则）
  → 创建 Paywall（选择模板 + 配置内容）
  → 关联 Audience ↔ Paywall（设置流量百分比）
```

### 7.3 SDK 调用 Placement 评估

```
客户端 App → 触发事件 → SDK 调用 POST /api/v1/evaluate
  → 后端接收 {placement, user_context}
  → 匹配 Campaign → 评估 Audience → 选择 Paywall
  → 返回 {action: "show_paywall", paywall_config: {...}}
  → 客户端渲染付费墙
```

### 7.4 事件上报与数据聚合

```
客户端 → SDK 上报事件 → POST /api/v1/events
  → 后端写入 Redis 队列 → 异步写入 PostgreSQL
  → Analytics 聚合定时任务 → Dashboard 展示
```

### Empty / Error / Loading States

| 场景 | 状态 | 行为 |
|------|------|------|
| 无 App | Empty | 引导用户创建第一个 App |
| 无 Campaign | Empty | 提示 "还没有 Campaign，点击创建" |
| API 调用失败 | Error | 显示错误 Toast + 重试按钮 |
| 数据加载中 | Loading | 骨架屏 / Spinner |
| 评估无匹配 | Default | 返回 `action: "execute_feature"` |

---

## 8. Functional Requirements

### R1: 项目基础设施

- **User Story**: 作为后端开发，我需要一个标准化的 Go + Gin 项目脚手架，包含目录结构、Makefile、环境变量管理，以便快速开始开发
- **Functional Behavior**:
  - 标准 Go 项目布局（cmd/、internal/、pkg/、api/、config/）
  - Makefile 支持 `build`、`run`、`test`、`lint`、`migrate`
  - `.env.example` 定义所有必要环境变量
  - Dockerfile 支持容器化运行
  - Docker Compose 编排 PostgreSQL + Redis
- **Acceptance Criteria**:
  - `make run` 可启动服务，健康检查 `/health` 返回 200
  - `make test` 通过所有单元测试
  - `docker-compose up` 可启动完整本地环境
- **Priority**: P0

### R2: 数据库连接与迁移

- **User Story**: 作为后端开发，我需要 GORM 连接 PostgreSQL 并自动执行 DDL 迁移，确保表结构与设计一致
- **Functional Behavior**:
  - GORM 自动连接池配置（最大连接数、空闲超时）
  - 支持 `goose` 或 `golang-migrate` 管理 Schema 版本
  - 全量 DDL 脚本包含：apps、campaigns、placements、audiences、paywalls、audience_paywalls、transactions、events
  - 支持 `migrate up`、`migrate down`、`migrate status`
- **Edge Cases**:
  - 数据库不可用时服务启动失败并清晰报错
  - 迁移幂等性（多次执行不报错）
- **Acceptance Criteria**:
  - 空数据库执行 `migrate up` 后所有表创建成功
  - 外键约束、索引正确建立
- **Priority**: P0

### R3: API 认证中间件

- **User Story**: 作为 API 消费者，我需要使用 API Key 进行请求鉴权，未认证的请求应被拒绝
- **Functional Behavior**:
  - 请求头 `X-API-Key` 携带 API Key
  - 中间件验证 Key 是否存在于 apps 表且状态为 active
  - 失败返回 `401 Unauthorized` + 错误码
  - 支持 JWT Token 用于 wall-admin 管理后台登录
- **Acceptance Criteria**:
  - 无 API Key 请求 → 401
  - 无效 API Key → 403
  - 有效 API Key → 正常放行至 handler
- **Priority**: P0

### R4: App CRUD API

- **User Story**: 作为应用开发者，我需要创建、查看、更新、删除 App，并管理 API Key
- **Scenario**: 创建新 App

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | POST `/api/v1/apps` | 创建 App 记录 |
| 2 | Body: `{name: "MyApp", platform: "ios"}` | 返回完整 App 对象 |
| 3 | 系统生成 `api_key` | `api_key` 字段非空 |

- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/apps` | 列出所有 App |
| GET | `/api/v1/apps/:id` | 查看 App 详情 |
| POST | `/api/v1/apps` | 创建 App |
| PUT | `/api/v1/apps/:id` | 更新 App |
| DELETE | `/api/v1/apps/:id` | 删除 App（软删除） |
| POST | `/api/v1/apps/:id/rotate-key` | 重新生成 API Key |

- **Acceptance Criteria**:
  - 创建后 `api_key` 全局唯一
  - 软删除后 App 不再出现在列表中
  - 重新生成 Key 后旧 Key 立即失效
- **Priority**: P0

### R5: Campaign CRUD API

- **User Story**: 作为运营人员，我需要创建 Campaign 来组织付费墙策略
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/campaigns` | 列出 Campaign（支持按 app_id 过滤） |
| GET | `/api/v1/campaigns/:id` | 查看 Campaign 详情（含 Placements） |
| POST | `/api/v1/campaigns` | 创建 Campaign |
| PUT | `/api/v1/campaigns/:id` | 更新 Campaign |
| POST | `/api/v1/campaigns/:id/activate` | 激活 Campaign |
| POST | `/api/v1/campaigns/:id/deactivate` | 停用 Campaign |
| DELETE | `/api/v1/campaigns/:id` | 删除 Campaign |

- **Acceptance Criteria**:
  - 停用的 Campaign 不再参与 Placement 评估
  - 删除前检查是否有关联的 Placement/Audience
- **Priority**: P0

### R6: Placement API

- **User Story**: 作为运营人员，我需要将 Placement（事件触发点）绑定到 Campaign
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/campaigns/:id/placements` | 查看 Campaign 下所有 Placement |
| POST | `/api/v1/campaigns/:id/placements` | 添加 Placement |
| DELETE | `/api/v1/placements/:id` | 移除 Placement |

- **Acceptance Criteria**:
  - 同一 app_id 下 event_name 不可重复
  - Placement 删除后不影响历史事件记录
- **Priority**: P0

### R7: Audience API

- **User Story**: 作为运营人员，我需要定义 Audience 规则来圈选目标用户
- **Functional Behavior**:
  - Audience 条件存储为 JSONB（支持 `field`、`operator`、`value` 组合）
  - 支持 AND/OR 逻辑分组
  - Audience 支持排序（sort_order 决定评估顺序）
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/campaigns/:id/audiences` | 列出 Audience（按 sort_order 排序） |
| POST | `/api/v1/campaigns/:id/audiences` | 创建 Audience |
| PUT | `/api/v1/audiences/:id` | 更新 Audience 条件 |
| PUT | `/api/v1/audiences/:id/reorder` | 调整排序 |
| DELETE | `/api/v1/audiences/:id` | 删除 Audience |

- **Acceptance Criteria**:
  - 条件 JSON 格式校验（非法格式返回 400）
  - sort_order 调整后列表顺序正确
- **Priority**: P0

### R8: Paywall API

- **User Story**: 作为运营人员，我需要创建和管理 Paywall，选择模板并配置内容
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/paywalls` | 列出 Paywall（支持按 app_id 过滤） |
| GET | `/api/v1/paywalls/:id` | 查看 Paywall 详情 |
| POST | `/api/v1/paywalls` | 创建 Paywall |
| PUT | `/api/v1/paywalls/:id` | 更新 Paywall 配置 |
| DELETE | `/api/v1/paywalls/:id` | 删除 Paywall |

- **Data/Field Changes**:
  - `config` 字段为 JSONB，存储模板配置（标题、描述、功能列表、按钮文字等）
  - `template` 字段枚举：`standard`、`minimal`、`feature_list`
- **Acceptance Criteria**:
  - 创建时 template 必须在枚举范围内
  - config JSON 格式校验
- **Priority**: P0

### R9: Audience-Paywall 关联 API

- **User Story**: 作为运营人员，我需要将 Audience 与 Paywall 关联，并设置流量分配百分比
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/audiences/:id/paywalls` | 关联 Paywall |
| PUT | `/api/v1/audiences/:id/paywalls/:pid` | 更新百分比 |
| DELETE | `/api/v1/audiences/:id/paywalls/:pid` | 取消关联 |

- **Acceptance Criteria**:
  - 同一 Audience 下所有关联 Paywall 的 percentage 总和 = 100
  - 超过 100 或不足 100 返回校验错误
- **Priority**: P0

### R10: Placement 评估 API

- **User Story**: 作为 SDK 集成者，我需要调用评估接口获取应展示的 Paywall 配置
- **Scenario**: SDK 调用评估

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | POST `/api/v1/evaluate` | 发起评估请求 |
| 2 | Body: `{placement: "premium_feature", user_id: "u123", attributes: {"plan": "free"}}` | |
| 3 | 后端匹配 Campaign → Audience → Paywall | 返回决策结果 |
| 4 | 无匹配 Audience | 返回 `action: "execute_feature"` |

- **Request Body**:

```json
{
  "placement": "premium_feature",
  "user_id": "user_123",
  "attributes": {
    "plan": "free",
    "session_count": 5,
    "days_since_install": 3
  }
}
```

- **Response (匹配 Paywall)**:

```json
{
  "action": "show_paywall",
  "paywall": {
    "id": "pw_xxx",
    "name": "Premium Upgrade",
    "template": "standard",
    "config": { ... },
    "feature_gating": "gated"
  }
}
```

- **Response (无匹配)**:

```json
{
  "action": "execute_feature"
}
```

- **Acceptance Criteria**:
  - Audience 按 sort_order 顺序评估
  - 百分比分配随机但符合概率
  - 响应时间 P95 < 100ms（含 Redis 缓存命中）
- **Priority**: P0

### R11: 事件上报 API

- **User Story**: 作为 SDK，我需要上报付费墙的展示、点击、购买事件用于数据分析
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/events` | 批量上报事件 |

- **Event Types**:

| 事件类型 | 说明 |
|----------|------|
| `paywall_impression` | 付费墙展示 |
| `paywall_dismiss` | 付费墙关闭 |
| `paywall_cta_click` | CTA 按钮点击 |
| `transaction_start` | 交易发起 |
| `transaction_success` | 交易成功 |
| `transaction_failure` | 交易失败 |

- **Functional Behavior**:
  - 接收事件后写入 Redis 队列（异步处理）
  - Worker 消费队列写入 PostgreSQL
  - 支持批量上报（单次最多 50 条）
- **Acceptance Criteria**:
  - 事件写入延迟 < 5s（P95）
  - 事件丢失率 = 0（队列 + DB 双重保障）
- **Priority**: P0

### R12: Analytics 聚合 API

- **User Story**: 作为运营人员，我需要在 Dashboard 查看关键指标
- **API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/analytics/overview` | 概览指标（MRR、ARR、转化率、收入） |
| GET | `/api/v1/analytics/campaigns` | 按 Campaign 聚合数据 |
| GET | `/api/v1/analytics/paywalls` | 按 Paywall 聚合数据 |
| GET | `/api/v1/transactions` | 最近交易列表（分页） |

- **Acceptance Criteria**:
  - 支持时间范围过滤（`start_date`、`end_date`）
  - 查询响应时间 P95 < 500ms
- **Priority**: P1

### R13: 前端 API 对接

- **User Story**: 作为前端开发，我需要将 wall-admin 所有页面从 mock 数据切换为真实 API 调用
- **Scope**:

| 页面 | 对接 API | 改动说明 |
|------|----------|----------|
| Dashboard | Analytics Overview + Transactions | 替换硬编码数据为 API 响应 |
| Paywall 列表 | Paywall CRUD | 替换 mock 为 API 调用 |
| Plan 管理 | （Phase 2 Hydra-Pay 对接） | 暂不改动 |
| A/B 实验 | Experiment CRUD | 替换 mock 为 API 调用 |
| Targeting 规则 | Audience CRUD + 关联 | 替换 mock 为 API 调用 |
| Settings | App CRUD + API Key | 替换 mock 为 API 调用 |

- **Acceptance Criteria**:
  - 所有页面无 mock 数据残留
  - Loading/Error/Empty 状态正确处理
  - CRUD 操作后列表自动刷新
- **Priority**: P0

---

## 9. Data and Permission Requirements

### 9.1 数据模型

完整 ER 关系见 DEVELOPMENT_PLAN.md，核心表结构如下：

```
apps (1) ──→ (N) campaigns (1) ──→ (N) placements
                                      │
                                      ├──→ (N) audiences (N) ──→ (N) paywalls
                                      │                          │
                                      │                    audience_paywalls
                                      │
                                      └──→ (N) events
                                      └──→ (N) transactions
```

### 9.2 权限模型（MVP 简化版）

| 角色 | 权限 |
|------|------|
| Admin（wall-admin） | 所有 API 读写，JWT 认证 |
| SDK（客户端） | `/evaluate`、`/events` 只读/写入，API Key 认证 |

### 9.3 数据保留策略

| 数据类型 | 保留周期 |
|----------|----------|
| App/Campaign/Paywall | 永久（软删除） |
| Events | 12 个月（MVP 阶段不做归档） |
| Transactions | 永久 |

---

## 10. Acceptance Criteria

### 10.1 Happy Path

1. 创建 App → 获取 API Key → 创建 Campaign → 添加 Placement → 创建 Audience → 创建 Paywall → 关联 → SDK 调用 `/evaluate` → 返回正确 Paywall → 上报事件 → Dashboard 展示数据

### 10.2 Error Paths

| 错误场景 | 预期行为 |
|----------|----------|
| 无效 API Key | 401 + `{"code": "INVALID_API_KEY"}` |
| Audience 条件 JSON 非法 | 400 + `{"code": "INVALID_AUDIENCE_CONDITION"}` |
| Percentage 总和 != 100 | 400 + `{"code": "PERCENTAGE_MISMATCH"}` |
| Placement event_name 重复 | 409 + `{"code": "DUPLICATE_PLACEMENT"}` |
| 评估时无匹配 Audience | 200 + `{"action": "execute_feature"}` |
| 数据库不可用 | 503 + `{"code": "SERVICE_UNAVAILABLE"}` |

### 10.3 数据一致性

- 删除 Campaign 前检查关联资源，存在时返回 409
- Paywall 被 Audience 引用时不可删除
- 事件上报不阻塞主流程（异步写入）

### 10.4 可观测性

- 所有 API 请求记录日志（method、path、status、duration）
- `/metrics` 暴露 Prometheus 指标（请求量、延迟、错误率）
- 数据库慢查询日志（> 100ms）

---

## 11. Rollout and Changelog Notes

### 部署策略

| 阶段 | 动作 |
|------|------|
| Local Dev | Docker Compose 启动 PostgreSQL + Redis + wall-service |
| Staging | 单一实例部署，前端对接验证 |
| Production | Phase 1 完成后整体发布 |

### 前端迁移策略

1. 新增 `apiClient` 模块统一管理 API 调用
2. 逐页替换 mock → API（按 Settings → Paywall → Campaign → Audience → Dashboard 顺序）
3. 保留 feature flag 可回退到 mock 模式（开发调试用）

### Changelog Draft (v0.1.0)

```
## v0.1.0 - 后端基础设施

### New
- wall-service Go 后端服务上线
- App/Campaign/Placement/Audience/Paywall 全链路 CRUD API
- Placement 评估引擎：基于 Audience 规则的付费墙路由
- 事件上报系统：支持 6 种事件类型异步写入
- 基础 Analytics API：Dashboard 概览 + 按维度聚合
- wall-admin 管理后台对接真实后端

### Changed
- 所有前端页面从 mock 数据切换为 API 调用

### Known Issues
- A/B 实验统计引擎未实现（v2.0）
- Hydra-Pay 商品对接未完成（Phase 2）
```

---

## 12. Risks and Open Questions

### 风险评估

| 风险 | 影响 | 概率 | 缓解措施 | Owner |
|------|------|------|----------|-------|
| 付费墙编辑器复杂度高 | 前端延期 | 中 | MVP 阶段仅做 JSON 配置，不做可视化拖拽 | Frontend Lead |
| PostgreSQL 性能瓶颈 | API 延迟 | 低 | MVP 数据量小，Phase 2 引入 Redis 缓存 | Backend Lead |
| Audience 条件表达式设计缺陷 | 评估逻辑错误 | 中 | 先定义条件 DSL，评审后再开发 | Backend Lead |
| Hydra-Pay 集成阻塞 | 商品数据缺失 | 中 | Phase 1 用 mock 商品数据占位 | Product |
| 事件丢失 | 数据分析不准确 | 低 | Redis 队列 + DB 写入失败重试机制 | Backend |

### Open Questions

| 问题 | 需要谁决策 | 阻塞项 |
|------|------------|--------|
| Audience 条件 DSL 的具体格式和运算符集合 | 产品 + 后端 | R7 开发 |
| API 限流策略（是否需要 rate limiter） | 后端架构师 | R3 中间件 |
| wall-admin 的登录认证方案（JWT vs Session） | 前端 + 后端 | R3 认证 |
| 事件上报是否支持批量压缩 | 后端 + SDK | R11 |
| 是否需要在 Phase 1 集成 Sentry 等错误监控 | 技术负责人 | 非阻塞 |

---

## Appendix

### A. API 设计规范

- RESTful 风格，版本前缀 `/api/v1`
- 请求/响应统一使用 JSON
- 分页：`?page=1&page_size=20`
- 排序：`?sort=created_at&order=desc`
- 时间格式：RFC3339 (`2026-01-15T10:30:00Z`)
- 金额单位：分（integer），不存储小数

### B. 错误码规范

| 错误码 | HTTP Status | 说明 |
|--------|-------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `DUPLICATE_PLACEMENT` | 409 | 重复资源 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### C. 参考文档

- [Hydra-Wall PRD](./hydra-wall/PRD.md)
- [Hydra-Wall Architecture](./hydra-wall/ARCHITECTURE.md)
- [Hydra-Wall Development Plan](./hydra-wall/DEVELOPMENT_PLAN.md)
- [Hydra-Pay Architecture](./hydra-pay/ARCHITECTURE.md)
